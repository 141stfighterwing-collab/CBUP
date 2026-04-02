import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/agents/[id]/command
// Portal sends a command to an agent
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { type, payload } = body

    if (!type) {
      return NextResponse.json(
        { error: 'Missing required field: type' },
        { status: 400 }
      )
    }

    // Verify agent exists
    const agent = await db.agent.findUnique({
      where: { id },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Create command
    const command = await db.command.create({
      data: {
        agentId: id,
        type,
        payload: payload ? JSON.stringify(payload) : null,
        status: 'pending',
      },
    })

    return NextResponse.json({ command })
  } catch (error) {
    console.error('Create agent command error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
