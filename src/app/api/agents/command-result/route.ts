import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/agents/command-result
// Agent reports command execution result
export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { agentId, authToken, commandId, status, result, error } = body

    if (!agentId || !authToken || !commandId || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: agentId, authToken, commandId, status' },
        { status: 400 }
      )
    }

    // Verify agent and token
    const agent = await db.agent.findUnique({
      where: { agentId },
    })

    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      )
    }

    if (agent.authToken !== authToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid auth token' },
        { status: 401 }
      )
    }

    // Update command
    await db.command.update({
      where: { id: commandId },
      data: {
        status,
        result: result ? JSON.stringify(result) : null,
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
