import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/agents/[id]/telemetry?hours=24
// Get telemetry history for an agent
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const hours = parseInt(searchParams.get('hours') || '24', 10)

    // Verify agent exists
    const agent = await db.agent.findUnique({
      where: { id },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const since = new Date(Date.now() - hours * 60 * 60 * 1000)

    const data = await db.telemetry.findMany({
      where: {
        agentId: id,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'asc' },
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Telemetry history error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
