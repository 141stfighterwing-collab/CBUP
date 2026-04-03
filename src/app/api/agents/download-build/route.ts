import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// GET /api/agents/download-build
// Serves the build-exe.ps1 script for compiling CBUP Agent into .exe
export async function GET() {
  try {
    const buildScript = join(process.cwd(), 'agent', 'build-exe.ps1')

    if (!existsSync(buildScript)) {
      return NextResponse.json({ error: 'Build script not found' }, { status: 404 })
    }

    const buildContent = readFileSync(buildScript, 'utf-8')

    return new NextResponse(buildContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="build-exe.ps1"',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to serve build script' }, { status: 500 })
  }
}
