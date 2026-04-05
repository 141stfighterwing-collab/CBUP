import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { safeEqual } from '@/lib/security-utils'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

// Maximum scan result payload: 5MB (full EDR scans can be large)
const MAX_SCAN_SIZE = 5 * 1024 * 1024

// Rate limiter: 10 scans per minute per IP
const scanRateLimit = rateLimit({ maxRequests: 10, windowMs: 60 * 1000 })

// POST /api/agents/edr-scan
// Agent submits EDR scan results.
//
// Accepts two payload formats:
//   1. Single scan:     { agentId, scanType, findings, ... }
//   2. Full scan batch:  { agentId, scans: [{ ScanType, Results, ... }] }
//
// Auth can be via:
//   - Body field: authToken
//   - Header: Authorization: Bearer <token>
//   - Header: X-Agent-Id (for agent lookup)
export async function POST(request: NextRequest) {
  try {
    // ─── Rate Limiting ───────────────────────────────────────────────────
    const clientIp = getClientIp(request)
    const rlResult = scanRateLimit.check(clientIp)
    if (!rlResult.allowed) {
      return rateLimitResponse(rlResult)
    }

    // ─── Body Size Validation ─────────────────────────────────────────────
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_SCAN_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Request body too large' },
        { status: 413 }
      )
    }

    const body = await request.json()

    // ─── Auth: accept from body or headers ───────────────────────────────
    let agentId = body.agentId || ''
    let authToken = body.authToken || ''

    // Header-based auth fallback (agent sends via Invoke-CBUPApi headers)
    if (!agentId) {
      agentId = request.headers.get('x-agent-id') || ''
    }
    if (!authToken) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        authToken = authHeader.substring(7)
      }
    }

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: agentId' },
        { status: 400 }
      )
    }

    // Verify agent exists
    const agent = await db.agent.findUnique({
      where: { agentId },
    })

    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      )
    }

    // SECURITY: Timing-safe token comparison (skip if neither side has a token)
    if (authToken && agent.authToken) {
      if (!safeEqual(authToken, agent.authToken)) {
        return NextResponse.json(
          { success: false, error: 'Invalid auth token' },
          { status: 401 }
        )
      }
    }

    // ─── Determine payload format ────────────────────────────────────────
    // Format 1: Full scan batch from agent's Invoke-FullEDRScan
    //   { agentId, timestamp, scans: [{ ScanType, Results, SuspiciousCount }] }
    if (body.scans && Array.isArray(body.scans)) {
      let totalFindings = 0
      const scanIds: string[] = []

      for (const scan of body.scans) {
        const scanType = scan.ScanType || scan.scanType || 'UNKNOWN'
        const results = scan.Results || scan.results || []
        const suspiciousCount = scan.SuspiciousCount || scan.suspiciousCount || 0
        totalFindings += suspiciousCount

        // Extract suspicious findings for alert generation
        const suspiciousFindings = Array.isArray(results)
          ? results.filter((r: Record<string, unknown>) => r.Suspicious === true || r.suspicious === true)
          : []

        const findingsStr = JSON.stringify(results)

        try {
          const scanRecord = await db.eDRScan.create({
            data: {
              agentId: agent.id,
              scanType,
              status: 'completed',
              findings: findingsStr,
              summary: JSON.stringify({
                totalResults: Array.isArray(results) ? results.length : 0,
                suspiciousCount,
                timestamp: body.timestamp || new Date().toISOString(),
              }),
              durationMs: scan.durationMs ?? null,
              completedAt: new Date(),
            },
          })
          scanIds.push(scanRecord.id)

          // Create alerts for suspicious findings
          if (suspiciousFindings.length > 0) {
            await db.alert.createMany({
              data: suspiciousFindings.slice(0, 50).map((f: Record<string, unknown>) => ({
                title: `EDR ${scanType}: Suspicious activity on ${agent.hostname}`,
                severity: 'high',
                source: 'edr-agent',
                description: `Suspicious ${scanType} finding: ${f.Name || 'Unknown'} (PID: ${f.PID || 'N/A'}) — Flags: ${(f.Flags || []).join(', ')}`,
                category: 'edr',
              })),
            })
          }
        } catch (dbErr) {
          console.error(`[EDR Scan] Failed to create scan record for ${scanType}:`, dbErr)
        }
      }

      return NextResponse.json({
        success: true,
        scanIds,
        totalScans: body.scans.length,
        totalFindings,
      })
    }

    // Format 2: Single scan submission
    //   { agentId, authToken, scanType, findings, ... }
    const { scanType, findings, summary, durationMs } = body

    if (!scanType) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: scanType' },
        { status: 400 }
      )
    }

    const findingsArray = typeof findings === 'string' ? JSON.parse(findings) : (findings || [])
    const findingsStr = JSON.stringify(findingsArray)

    const scan = await db.eDRScan.create({
      data: {
        agentId: agent.id,
        scanType,
        status: 'completed',
        findings: findingsStr,
        summary: summary ? JSON.stringify(summary) : null,
        durationMs: durationMs ?? null,
        completedAt: new Date(),
      },
    })

    // Create alerts for high/critical severity findings
    const highSeverityFindings = Array.isArray(findingsArray)
      ? findingsArray.filter(
          (f: { severity?: string }) => f.severity === 'high' || f.severity === 'critical'
        )
      : []

    if (highSeverityFindings.length > 0) {
      await db.alert.createMany({
        data: highSeverityFindings.slice(0, 50).map((f: { severity?: string; title?: string; description?: string; category?: string }) => ({
          title: f.title || `EDR ${scanType} scan finding`,
          severity: f.severity || 'high',
          source: 'edr-agent',
          description: f.description || `EDR scan detected ${f.severity} severity finding on ${agent.hostname}`,
          category: f.category || 'edr',
        })),
      })
    }

    return NextResponse.json({ success: true, scanId: scan.id })
  } catch (error) {
    console.error('EDR scan submission error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
