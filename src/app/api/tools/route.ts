// Cerberus AI v4.0 — Tools API Route
// GET /api/tools — Return all registered tools with filtering

import { NextRequest, NextResponse } from "next/server";
import { toolRegistry } from "@/lib/tools/registry";
import { allTools } from "@/lib/tools/definitions";

// Ensure tools are registered
toolRegistry.registerTools(allTools);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const agent = searchParams.get("agent");
  const search = searchParams.get("search");

  try {
    let tools = toolRegistry.getAllToolDefinitions();

    if (category) {
      tools = tools.filter(t => t.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      tools = tools.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    }

    if (agent) {
      const { agents } = await import("@/lib/agents");
      const agentDef = agents.find(a => a.id === agent);
      if (agentDef) {
        const agentToolIds = new Set(agentDef.tools);
        tools = tools.filter(t => agentToolIds.has(t.id));
      }
    }

    const categories = toolRegistry.getCategories();

    return NextResponse.json({
      tools: tools.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        parameters: t.parameters.map(p => ({
          name: p.name,
          type: p.type,
          description: p.description,
          required: p.required,
        })),
        dangerous: t.dangerous,
      })),
      categories,
      totalTools: toolRegistry.getTotalCount(),
    });
  } catch (error) {
    console.error("[Tools API Error]:", error);
    return NextResponse.json({ error: "Failed to load tools" }, { status: 500 });
  }
}
