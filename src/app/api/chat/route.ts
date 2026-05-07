// Cerberus AI - Chat API Route
// POST /api/chat — Server-side Mistral AI integration with agent routing

import { NextRequest, NextResponse } from "next/server";
import { routeToAgent, getAgentById } from "@/lib/agents";
import { callWithFallback } from "@/lib/mistral";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, agent: agentId, history } = body as {
      message: string;
      agent?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    };

    // Validate message
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Pesan tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (message.length > 10000) {
      return NextResponse.json(
        { error: "Pesan terlalu panjang. Maksimal 10.000 karakter." },
        { status: 400 }
      );
    }

    // Route to appropriate agent
    const agent = routeToAgent(message, agentId);

    // Build messages array with history
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      {
        role: "system",
        content: agent.systemPrompt,
      },
    ];

    // Add conversation history (last 10 messages for context)
    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    // Add current user message
    messages.push({
      role: "user",
      content: message,
    });

    // Call Mistral API with fallback
    const result = await callWithFallback(
      messages,
      agent.model,
      agent.temperature,
      agent.maxTokens
    );

    return NextResponse.json({
      response: result.content,
      agent: {
        id: agent.id,
        name: agent.name,
        emoji: agent.emoji,
        color: agent.color,
        role: agent.role,
      },
      model: result.model,
      tokens: result.tokens,
    });
  } catch (error) {
    console.error("[Cerberus API Error]:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Terjadi kesalahan internal server.";

    return NextResponse.json(
      {
        error: errorMessage,
        response: `❌ **Error:** ${errorMessage}\n\nSilakan coba lagi atau gunakan perintah yang berbeda.`,
        agent: {
          id: "swift-responder",
          name: "Swift Responder",
          emoji: "⚡",
          color: "#00BCD4",
          role: "Fast Response & FAQ",
        },
        model: "error",
        tokens: "0",
      },
      { status: 500 }
    );
  }
}

// GET /api/chat — Return agent list for the sidebar
export async function GET() {
  try {
    const { agents } = await import("@/lib/agents");
    const agentList = agents.map((a) => ({
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      color: a.color,
      role: a.role,
      description: a.description,
    }));
    return NextResponse.json({ agents: agentList });
  } catch {
    return NextResponse.json(
      { error: "Gagal memuat daftar agent." },
      { status: 500 }
    );
  }
}
