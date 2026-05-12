// HexStrike AI v6.0 — Chat API Route
// POST /api/chat — Dual-model Tool-Augmented LLM with agent loop, tool calling, and SSE streaming

import { NextRequest, NextResponse } from "next/server";
import { routeToAgent, agents, type AgentDefinition } from "@/lib/agents";
import { callModelAPI, type ModelMessage } from "@/lib/models";
import { toolRegistry } from "@/lib/tools/registry";
import { executeToolCall, formatToolCallForLLM } from "@/lib/tools/executor";
import { parseToolCalls, hasToolCalls, extractFinalAnswer } from "@/lib/tools/parser";
import type { ToolCall, ToolContext } from "@/lib/tools/types";
import { getSelfEvolutionSummary, getContextForTask, recordExperience } from "@/lib/meta-learning/store";

// Import and register all tools SYNCHRONOUSLY at module load time
import { allTools } from "@/lib/tools/definitions";
import { hexstrikeBridgeTools } from "@/lib/hexstrike/bridge-tools";
import { hexstrikeClient } from "@/lib/hexstrike/client";
toolRegistry.registerTools(allTools);
toolRegistry.registerTools(hexstrikeBridgeTools);
console.log(`[HexStrike v6.0] Registered ${allTools.length} local + ${hexstrikeBridgeTools.length} HexStrike bridge = ${allTools.length + hexstrikeBridgeTools.length} total tools`);

// Async: check backend connection on first request (non-blocking)
let backendChecked = false;
async function ensureBackendChecked() {
  if (!backendChecked) {
    backendChecked = true;
    hexstrikeClient.checkHealth().then(health => {
      if (hexstrikeClient.connected) {
        console.log(`[HexStrike v6.0] Python backend ONLINE at ${hexstrikeClient.backendUrl} — ${health.total_tools} tools available`);
      } else {
        console.log(`[HexStrike v6.0] Python backend offline — using AI fallback mode for HexStrike tools`);
      }
    }).catch(() => {
      console.log(`[HexStrike v6.0] Python backend unreachable — using AI fallback mode`);
    });
  }
}

const MAX_ITERATIONS = 5;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, agent: agentId, history, stream, sessionId } = body as {
      message: string;
      agent?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
      stream?: boolean;
      sessionId?: string;
    };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    if (message.length > 10000) {
      return NextResponse.json({ error: "Message too long. Maximum 10,000 characters." }, { status: 400 });
    }

    const sid = sessionId || `session-${Date.now()}`;
    const { agent } = routeToAgent(message, agentId);

    // Get tools for this agent
    const agentTools = toolRegistry.getToolsForAgent(agent.id, agents);
    const toolsContext = agentTools.length > 0
      ? toolRegistry.formatToolsForLLM(agentTools)
      : '';

    // Get meta-learning context
    const metaSummary = getSelfEvolutionSummary();
    const taskContext = getContextForTask(message);

    // Build system prompt with tools and meta-learning
    let systemPrompt = agent.systemPrompt;
    if (toolsContext) systemPrompt += `\n\n${toolsContext}`;
    if (metaSummary) systemPrompt += metaSummary;
    if (taskContext) systemPrompt += taskContext;

    // Build messages array
    const messages: ModelMessage[] = [{ role: "system", content: systemPrompt }];

    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: "user", content: message });

    // ===== STREAMING PATH =====
    if (stream) {
      return handleStreaming(agent, messages, sid);
    }

    // ===== NON-STREAMING: AGENT LOOP =====
    return handleNonStreaming(agent, messages, sid);
  } catch (error) {
    console.error("[HexStrike API Error]:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// ===== NON-STREAMING HANDLER =====
async function handleNonStreaming(agent: AgentDefinition, messages: ModelMessage[], sessionId: string) {
  const toolContext: ToolContext = { sessionId, agentId: agent.id };
  const allToolCalls: ToolCall[] = [];
  let iterations = 0;
  let totalTokens = 0;
  const startTime = Date.now();

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    iterations++;

    const provider = agent.modelProvider || 'mistral';
    const result = await callModelAPI(
      messages,
      agent.model,
      provider,
      agent.temperature,
      agent.maxTokens
    );
    totalTokens += result.tokens;

    const response = result.content;
    messages.push({ role: "assistant", content: response });

    if (!hasToolCalls(response)) {
      const finalAnswer = extractFinalAnswer(response);
      // Record experience
      recordExperience({
        id: `exp-${Date.now()}`,
        toolName: 'llm_response',
        task: messages.find(m => m.role === 'user')?.content || '',
        approach: `iterations: ${iterations}, tools: ${allToolCalls.length}`,
        outcome: 'completed',
        rating: 4,
        timestamp: Date.now(),
        agentId: agent.id,
      });

      return NextResponse.json({
        message: finalAnswer,
        agent: { id: agent.id, name: agent.name, emoji: agent.emoji, description: agent.description },
        model: result.model,
        toolCalls: allToolCalls.map(tc => ({
          toolName: tc.toolName,
          arguments: tc.arguments,
          result: tc.result?.output || tc.result?.error || '',
          status: tc.status,
          duration: tc.duration,
        })),
        iterations,
        tokensUsed: totalTokens,
        responseTimeMs: Date.now() - startTime,
      });
    }

    // Parse and execute tool calls
    const toolCalls = parseToolCalls(response);
    for (const call of toolCalls) {
      const executed = await executeToolCall(call, toolContext);
      allToolCalls.push(executed);
      messages.push({ role: "assistant", content: formatToolCallForLLM(executed) });
    }
  }

  // Max iterations reached
  return NextResponse.json({
    message: "Maximum iterations reached. Tool execution summary:\n" +
      allToolCalls.map(tc => `- ${tc.toolName}: ${tc.status}`).join("\n"),
    agent: { id: agent.id, name: agent.name, emoji: agent.emoji, description: agent.description },
    model: agent.model,
    toolCalls: allToolCalls.map(tc => ({
      toolName: tc.toolName,
      arguments: tc.arguments,
      result: tc.result?.output || tc.result?.error || '',
      status: tc.status,
      duration: tc.duration,
    })),
    iterations,
    tokensUsed: totalTokens,
  });
}

// ===== STREAMING HANDLER =====
async function handleStreaming(agent: AgentDefinition, messages: ModelMessage[], sessionId: string) {
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const toolContext: ToolContext = { sessionId, agentId: agent.id };
      const allToolCalls: ToolCall[] = [];
      let iterations = 0;
      let totalTokens = 0;
      const startTime = Date.now();

      // Send agent info
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ type: "agent", data: { id: agent.id, name: agent.name, emoji: agent.emoji, description: agent.description } })}\n\n`
      ));
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ type: "model", data: `${agent.model} (${agent.modelProvider})` })}\n\n`
      ));

      for (let i = 0; i < MAX_ITERATIONS; i++) {
        iterations++;

        // Notify thinking
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: "thinking" })}\n\n`
        ));

        try {
          const provider = agent.modelProvider || 'mistral';
          const result = await callModelAPI(
            messages,
            agent.model,
            provider,
            agent.temperature,
            agent.maxTokens
          );
          totalTokens += result.tokens;
          const response = result.content;

          // Check for tool calls
          if (hasToolCalls(response)) {
            const toolCalls = parseToolCalls(response);
            const finalText = extractFinalAnswer(response);

            // Stream any text before tool calls
            if (finalText) {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: "token", data: finalText + "\n\n" })}\n\n`
              ));
            }

            // Execute tools one by one, streaming progress
            for (const call of toolCalls) {
              // Notify tool start
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: "tool_start", tool: call.toolName, args: call.arguments })}\n\n`
              ));

              const executed = await executeToolCall(call, toolContext);
              allToolCalls.push(executed);

              // Notify tool result
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({
                  type: "tool_result",
                  tool: executed.toolName,
                  result: executed.result?.output?.slice(0, 2000) || executed.result?.error || '',
                  status: executed.status,
                  duration: executed.duration,
                })}\n\n`
              ));

              messages.push({ role: "assistant", content: formatToolCallForLLM(executed) });
            }

            // Add assistant message with tool calls to conversation
            messages.push({ role: "assistant", content: response });

            continue; // Next iteration
          }

          // No tool calls — stream final answer
          messages.push({ role: "assistant", content: response });
          const finalAnswer = extractFinalAnswer(response);

          // Stream the final answer token by token
          const words = finalAnswer.split(/(\s+)/);
          for (const word of words) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: "token", data: word })}\n\n`
            ));
          }

          // Record experience
          recordExperience({
            id: `exp-${Date.now()}`,
            toolName: 'llm_response',
            task: messages.find(m => m.role === 'user')?.content || '',
            approach: `iterations: ${iterations}, tools: ${allToolCalls.length}`,
            outcome: 'completed',
            rating: 4,
            timestamp: Date.now(),
            agentId: agent.id,
          });

          // Done
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              agent: { id: agent.id, name: agent.name, emoji: agent.emoji },
              model: `${agent.model} (${agent.modelProvider})`,
              iterations,
              totalTokens,
              responseTimeMs: Date.now() - startTime,
              toolCalls: allToolCalls.map(tc => ({
                toolName: tc.toolName,
                arguments: tc.arguments,
                result: tc.result?.output?.slice(0, 500) || tc.result?.error || '',
                status: tc.status,
                duration: tc.duration,
              })),
            })}\n\n`
          ));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;

        } catch (error) {
          console.error(`[HexStrike Stream] Iteration ${iterations} error:`, error);
          const errorMsg = error instanceof Error ? error.message : "Error";

          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: "error", data: errorMsg })}\n\n`
          ));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
      }

      // Max iterations
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ type: "done", agent: { id: agent.id, name: agent.name, emoji: agent.emoji }, model: `${agent.model} (${agent.modelProvider})`, iterations, totalTokens, responseTimeMs: Date.now() - startTime, toolCalls: allToolCalls.map(tc => ({ toolName: tc.toolName, status: tc.status })) })}\n\n`
      ));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// GET /api/chat — Return agent list + HexStrike backend status
export async function GET() {
  try {
    // Trigger async backend check
    ensureBackendChecked();

    const agentList = agents.map(a => ({
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      description: a.description,
      model: a.model,
      modelProvider: a.modelProvider,
      toolsCount: a.tools.length,
    }));
    return NextResponse.json({
      agents: agentList,
      hexstrike_backend: {
        connected: hexstrikeClient.connected,
        url: hexstrikeClient.backendUrl,
        tools: hexstrikeClient.lastHealth?.total_tools || 0,
      },
      total_tools: toolRegistry.getTotalCount(),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load agent list." }, { status: 500 });
  }
}
