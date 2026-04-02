import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/agents/[id]
// Get agent details with telemetry history, scans, and commands
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const agent = await db.agent.findUnique({
      where: { id },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Fetch related data in parallel
    const [telemetryHistory, scans, commands] = await Promise.all([
      db.telemetry.findMany({
        where: { agentId: id },
        orderBy: { timestamp: 'desc' },
        take: 100,
      }),
      db.eDRScan.findMany({
        where: { agentId: id },
        orderBy: { startedAt: 'desc' },
        take: 50,
      }),
      db.command.findMany({
        where: { agentId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    return NextResponse.json({
      agent,
      telemetryHistory,
      scans,
      commands,
    })
  } catch (error) {
    console.error('Agent detail error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
