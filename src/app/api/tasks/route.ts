import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, description, priority, assignee, dueDate, status } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const task = await db.task.create({
      data: {
        title,
        description: description || null,
        priority: priority || 'medium',
        assignee: assignee || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: status || 'new',
      },
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Task create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
