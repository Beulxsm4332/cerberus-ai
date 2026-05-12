// HexStrike AI v6.0 — Backend Status API
// Returns HexStrike Python backend status + merged tool count

import { NextResponse } from 'next/server';
import { hexstrikeClient } from '@/lib/hexstrike/client';
import { toolRegistry } from '@/lib/tools/registry';

export async function GET() {
  const health = await hexstrikeClient.checkHealth();

  return NextResponse.json({
    hexstrike_backend: {
      status: health.status === 'ok' ? 'online' : 'offline',
      url: hexstrikeClient.backendUrl,
      version: health.version,
      uptime: health.uptime,
      total_backend_tools: health.total_tools,
      backend_tools_available: health.available_tools?.length || 0,
    },
    frontend: {
      total_registered_tools: toolRegistry.getTotalCount(),
      categories: toolRegistry.getCategories(),
    },
    integration: {
      connected: hexstrikeClient.connected,
      mode: hexstrikeClient.connected ? 'full' : 'fallback-ai',
    },
    timestamp: Date.now(),
  });
}
