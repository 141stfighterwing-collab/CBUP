import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, name, company, password, tier } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user already exists → login flow
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({
        id: existing.id,
        email: existing.email,
        name: existing.name,
        company: existing.company,
        tier: existing.tier,
        role: existing.role,
      })
    }

    // Create new user
    const user = await db.user.create({
      data: {
        email,
        name: name || null,
        company: company || null,
        tier: tier || 'free',
        password: password || null,
        role: 'user',
      },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      tier: user.tier,
      role: user.role,
    })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
