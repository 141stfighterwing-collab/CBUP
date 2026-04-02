import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/agents/list
// Returns all registered agents with latest telemetry
export async function GET() {
  try {
    const agents = await db.agent.findMany({
      orderBy: { lastSeen: 'desc' },
    })

    // Enrich with latest telemetry and counts
    const enrichedAgents = await Promise.all(
      agents.map(async (agent: Record<string, unknown>) => {
        // Get latest telemetry for each agent
        const latestTelemetry = await db.telemetry.findFirst({
          where: { agentId: agent.id as string },
          orderBy: { timestamp: 'desc' },
        })

        const commandCount = await db.command.count({
          where: { agentId: agent.id as string },
        })

        const scanCount = await db.eDRScan.count({
          where: { agentId: agent.id as string },
        })

        return {
          ...agent,
          latestTelemetry,
          commandCount,
          scanCount,
        }
      })
    )

    return NextResponse.json({ agents: enrichedAgents })
  } catch (error) {
    console.error('List agents error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
