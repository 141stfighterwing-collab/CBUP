import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/agents/commands?agentId=xxx&authToken=xxx
// Returns pending commands for the agent
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const authToken = searchParams.get('authToken')

    if (!agentId || !authToken) {
      return NextResponse.json(
        { error: 'Missing required query params: agentId, authToken' },
        { status: 400 }
      )
    }

    // Verify agent and token
    const agent = await db.agent.findUnique({
      where: { agentId },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    if (agent.authToken !== authToken) {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 })
    }

    // Fetch pending commands
    const pendingCommands = await db.command.findMany({
      where: {
        agentId: agent.id,
        status: 'pending',
      },
      orderBy: { createdAt: 'asc' },
    })

    // Mark them as executing
    if (pendingCommands.length > 0) {
      await db.command.updateMany({
        where: {
          id: { in: pendingCommands.map((c: { id: string }) => c.id) },
        },
        data: {
          status: 'executing',
          executedAt: new Date(),
        },
      })
    }

    const commands = pendingCommands.map((c: { id: string; type: string; payload: string | null }) => ({
      id: c.id,
      type: c.type,
      payload: c.payload,
    }))

    return NextResponse.json({ commands })
  } catch (error) {
    console.error('Fetch commands error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/agents/commands
// Create a new command for an agent (from portal)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { agentId, type, payload } = body

    if (!agentId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, type' },
        { status: 400 }
      )
    }

    // Verify agent exists
    const agent = await db.agent.findUnique({
      where: { agentId },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Create command
    const command = await db.command.create({
      data: {
        agentId: agent.id,
        type,
        payload: payload ? JSON.stringify(payload) : null,
        status: 'pending',
      },
    })

    return NextResponse.json({ command })
  } catch (error) {
    console.error('Create command error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
