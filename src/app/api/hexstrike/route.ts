// HexStrike AI v6.0 — HexStrike Proxy API Route
// Proxies all requests to the HexStrike Python backend

import { NextRequest, NextResponse } from 'next/server';
import { hexstrikeClient } from '@/lib/hexstrike/client';

// GET /api/hexstrike — Backend health check
export async function GET() {
  const health = await hexstrikeClient.checkHealth();
  const tools = await hexstrikeClient.discoverTools();

  return NextResponse.json({
    status: health.status,
    connected: hexstrikeClient.connected,
    backend_url: hexstrikeClient.backendUrl,
    version: health.version,
    uptime: health.uptime,
    total_tools: health.total_tools,
    available_tools: tools,
  });
}

// POST /api/hexstrike — Execute a HexStrike tool
// Body: { endpoint: "api/tools/nmap", params: { target: "..." } }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, params = {} } = body;

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Missing "endpoint" field. Usage: { "endpoint": "api/tools/nmap", "params": { ... } }' },
        { status: 400 }
      );
    }

    const result = await hexstrikeClient.executeTool(endpoint, params);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Proxy error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
