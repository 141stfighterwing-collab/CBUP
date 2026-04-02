import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const severity = searchParams.get('severity')

    const where = severity && severity !== 'all' ? { severity } : {}

    const alerts = await db.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // If no alerts in DB, return empty (client uses mock data)
    return NextResponse.json(alerts)
  } catch (error) {
    console.error('Alerts fetch error:', error)
    return NextResponse.json([], { status: 200 })
  }
}
