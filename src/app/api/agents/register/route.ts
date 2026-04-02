import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

// POST /api/agents/register
// Registers a new agent or updates existing one
export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      agentId,
      hostname,
      domain,
      osName,
      osVersion,
      osArch,
      manufacturer,
      model,
      serialNumber,
      biosVersion,
      cpuModel,
      cpuCores,
      totalRamMb,
      macAddresses,
      ipAddresses,
      version,
    } = body

    if (!agentId || !hostname || !osName || !osVersion) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: agentId, hostname, osName, osVersion' },
        { status: 400 }
      )
    }

    // Check if agent already exists
    const existing = await db.agent.findUnique({
      where: { agentId },
    })

    if (existing) {
      // Update existing agent
      const updated = await db.agent.update({
        where: { agentId },
        data: {
          hostname,
          domain: domain ?? null,
          osName,
          osVersion,
          osArch: osArch ?? null,
          manufacturer: manufacturer ?? null,
          model: model ?? null,
          serialNumber: serialNumber ?? null,
          biosVersion: biosVersion ?? null,
          cpuModel: cpuModel ?? null,
          cpuCores: cpuCores ?? null,
          totalRamMb: totalRamMb ?? null,
          macAddresses: macAddresses ? JSON.stringify(macAddresses) : null,
          ipAddresses: ipAddresses ? JSON.stringify(ipAddresses) : null,
          status: 'online',
          lastSeen: new Date(),
          version: version ?? '1.0.0',
        },
      })

      return NextResponse.json({ success: true, agent: updated, authToken: existing.authToken })
    }

    // Create new agent
    const authToken = crypto.randomBytes(16).toString('hex') // 32-char hex

    const agent = await db.agent.create({
      data: {
        agentId,
        hostname,
        domain: domain ?? null,
        osName,
        osVersion,
        osArch: osArch ?? null,
        manufacturer: manufacturer ?? null,
        model: model ?? null,
        serialNumber: serialNumber ?? null,
        biosVersion: biosVersion ?? null,
        cpuModel: cpuModel ?? null,
        cpuCores: cpuCores ?? null,
        totalRamMb: totalRamMb ?? null,
        macAddresses: macAddresses ? JSON.stringify(macAddresses) : null,
        ipAddresses: ipAddresses ? JSON.stringify(ipAddresses) : null,
        version: version ?? '1.0.0',
        authToken,
        status: 'online',
      },
    })

    return NextResponse.json({ success: true, agent, authToken })
  } catch (error) {
    console.error('Agent registration error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
