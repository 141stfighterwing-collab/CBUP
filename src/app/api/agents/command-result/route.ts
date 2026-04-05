import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { safeEqual } from '@/lib/security-utils'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

// Maximum result payload size: 2MB (agents may return large scan results)
const MAX_RESULT_SIZE = 2 * 1024 * 1024

// Rate limiter: 60 results per minute per IP
const resultRateLimit = rateLimit({ maxRequests: 120, windowMs: 60 * 1000 })

// POST /api/agents/command-result
// Agent reports command execution result.
//
// The agent sends:  { commandId, agentId, status, output, error }
// Legacy format:    { agentId, authToken, commandId, status, result, error }
//
// Auth can be via:
//   - Body field: authToken
//   - Header: Authorization: Bearer <token>
//   - Header: X-Agent-Id (to look up agent)
export async function POST(request: NextRequest) {
  try {
    // ─── Rate Limiting ───────────────────────────────────────────────────
    const clientIp = getClientIp(request)
    const rlResult = resultRateLimit.check(clientIp)
    if (!rlResult.allowed) {
      return rateLimitResponse(rlResult)
    }

    // ─── Body Size Validation ─────────────────────────────────────────────
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_RESULT_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Request body too large' },
        { status: 413 }
      )
    }

    const body = await request.json()
    const {
      agentId,
      authToken,
      commandId,
      status,
      result,
      output,   // Agent uses 'output' instead of 'result'
      error,
    } = body

    // Agent may omit authToken from body — check headers too
    let resolvedAuthToken = authToken
    if (!resolvedAuthToken) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        resolvedAuthToken = authHeader.substring(7)
      }
    }

    // Agent may omit agentId from body — check X-Agent-Id header
    let resolvedAgentId = agentId
    if (!resolvedAgentId) {
      resolvedAgentId = request.headers.get('x-agent-id')
    }

    if (!resolvedAgentId || !commandId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing required fields: agentId, commandId, status. Got: agentId=${resolvedAgentId}, commandId=${commandId}, status=${status}`,
        },
        { status: 400 }
      )
    }

    // Verify agent exists
    const agent = await db.agent.findUnique({
      where: { agentId: resolvedAgentId },
    })

    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      )
    }

    // SECURITY: Timing-safe token comparison (skip if neither side has a token)
    if (resolvedAuthToken && agent.authToken) {
      if (!safeEqual(resolvedAuthToken, agent.authToken)) {
        return NextResponse.json(
          { success: false, error: 'Invalid auth token' },
          { status: 401 }
        )
      }
    }

    // Normalize result field: agent sends 'output', legacy uses 'result'
    const resultData = output ?? result ?? null

    // Update command
    await db.command.update({
      where: { id: commandId },
      data: {
        status,
        result: resultData ? JSON.stringify(resultData) : null,
        error: error ?? null,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Command result error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
