import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const brief = await db.brief.findFirst({
      orderBy: { publishedAt: 'desc' },
    })

    if (!brief) {
      return NextResponse.json({ message: 'No briefs available' }, { status: 404 })
    }

    return NextResponse.json(brief)
  } catch (error) {
    console.error('Brief fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
