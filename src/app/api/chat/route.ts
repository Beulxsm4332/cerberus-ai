// Cerberus AI - Chat API Route
// POST /api/chat — Server-side Mistral AI integration with agent routing + SSE streaming

import { NextRequest, NextResponse } from "next/server";
import { routeToAgent } from "@/lib/agents";
import { callWithFallback, streamMistralAPI, type MistralMessage } from "@/lib/mistral";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, agent: agentId, history, stream } = body as {
      message: string;
      agent?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
      stream?: boolean;
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
    const { agent } = routeToAgent(message, agentId);

    // Build messages array with history
    const messages: MistralMessage[] = [
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

    // ===== STREAMING PATH =====
    if (stream) {
      const agentInfo = {
        id: agent.id,
        name: agent.name,
        emoji: agent.emoji,
        color: agent.color,
        role: agent.role,
      };

      let totalTokens = 0;
      let usedModel = agent.model;
      const startTime = Date.now();

      try {
        const mistralStream = await streamMistralAPI(
          messages,
          agent.model,
          agent.temperature,
          agent.maxTokens
        );

        const encoder = new TextEncoder();

        const readable = new ReadableStream({
          async start(controller) {
            // Send agent info first
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "agent", data: agentInfo })}\n\n`)
            );

            // Send model info
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "model", data: agent.model })}\n\n`)
            );

            try {
              const reader = mistralStream.getReader();
              const decoder = new TextDecoder();
              let buffer = "";

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed || !trimmed.startsWith("data: ")) continue;

                  const data = trimmed.slice(6);
                  if (data === "[DONE]") continue;

                  try {
                    const parsed = JSON.parse(data);
                    const token = parsed.choices?.[0]?.delta?.content;
                    if (token) {
                      totalTokens += 1;
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: "token", data: token })}\n\n`)
                      );
                    }
                    if (parsed.model) {
                      usedModel = parsed.model;
                    }
                    if (parsed.usage) {
                      totalTokens = parsed.usage.total_tokens || totalTokens;
                    }
                  } catch {
                    // Ignore malformed JSON
                  }
                }
              }

              // Process remaining buffer
              if (buffer.trim()) {
                const trimmed = buffer.trim();
                if (trimmed.startsWith("data: ")) {
                  const data = trimmed.slice(6);
                  if (data !== "[DONE]") {
                    try {
                      const parsed = JSON.parse(data);
                      const token = parsed.choices?.[0]?.delta?.content;
                      if (token) {
                        totalTokens += 1;
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({ type: "token", data: token })}\n\n`)
                        );
                      }
                    } catch {
                      // Ignore
                    }
                  }
                }
              }

              // Send completion
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "done",
                    data: { totalTokens, model: usedModel, responseTimeMs: Date.now() - startTime },
                  })}\n\n`
                )
              );
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            } catch (streamError) {
              console.error("[Cerberus Stream Error]:", streamError);
              const errorMsg = streamError instanceof Error ? streamError.message : "Kesalahan streaming";
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "error", data: errorMsg })}\n\n`
                )
              );
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            }
          },
        });

        return new Response(readable, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      } catch (streamSetupError) {
        // If streaming fails, fallback to non-streaming
        console.warn("[Cerberus] Streaming gagal, fallback ke JSON...");
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
      }
    }

    // ===== NON-STREAMING PATH (backward compatible) =====
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
