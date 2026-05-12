// HexStrike AI v6.0 — Tool Registry
// Central registry for all tool definitions with search and discovery
// Now integrates with HexStrike Python backend for real security tool execution

import type { ToolDefinition, AgentDefinition } from './types';
import { hexstrikeClient } from '../hexstrike/client';

class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private agentToolMap: Map<string, string[]> = new Map();
  private _backendToolsRegistered: boolean = false;

  registerTool(definition: ToolDefinition): void {
    this.tools.set(definition.id, definition);
  }

  registerTools(definitions: ToolDefinition[]): void {
    for (const def of definitions) {
      this.registerTool(def);
    }
  }

  getTool(id: string): ToolDefinition | undefined {
    return this.tools.get(id);
  }

  unregisterTool(id: string): boolean {
    return this.tools.delete(id);
  }

  getToolsByCategory(category: string): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(t => t.category === category);
  }

  getToolsForAgent(agentId: string, agentDefs?: AgentDefinition[]): ToolDefinition[] {
    // If we have agent definitions, use their tool lists
    if (agentDefs) {
      const agent = agentDefs.find(a => a.id === agentId);
      if (agent) {
        return agent.tools
          .map(id => this.tools.get(id))
          .filter((t): t is ToolDefinition => t !== undefined);
      }
    }
    // Fall back to cached map
    const toolIds = this.agentToolMap.get(agentId);
    if (toolIds) {
      return toolIds
        .map(id => this.tools.get(id))
        .filter((t): t is ToolDefinition => t !== undefined);
    }
    return [];
  }

  setAgentTools(agentId: string, toolIds: string[]): void {
    this.agentToolMap.set(agentId, toolIds);
  }

  searchTools(query: string): ToolDefinition[] {
    const lower = query.toLowerCase();
    return Array.from(this.tools.values()).filter(t =>
      t.name.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower) ||
      t.category.toLowerCase().includes(lower) ||
      t.id.toLowerCase().includes(lower)
    );
  }

  getAllToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /** Get only locally-registered tools (not from backend) */
  getLocalTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(t => !t.source?.includes('hexstrike'));
  }

  /** Get HexStrike bridge tools */
  getHexStrikeTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(t => t.source === 'hexstrike-backend');
  }

  getToolSummary(): string {
    const categories = new Map<string, ToolDefinition[]>();
    for (const tool of this.tools.values()) {
      const cat = tool.category;
      if (!categories.has(cat)) categories.set(cat, []);
      categories.get(cat)!.push(tool);
    }

    let summary = 'AVAILABLE TOOLS:\n---\n';
    for (const [category, tools] of categories) {
      summary += `\n## ${category.toUpperCase()}\n`;
      for (const tool of tools) {
        const params = tool.parameters
          .map(p => `${p.name} (${p.type}${p.required ? ', required' : ''})`)
          .join(', ');
        summary += `\n[${tool.id}] ${tool.description}\n`;
        if (params) summary += `  Parameters: ${params}\n`;
        if (tool.dangerous) summary += `  ⚠️ DANGEROUS — Requires confirmation\n`;
      }
    }
    summary += '\n---\n';
    return summary;
  }

  formatToolsForLLM(tools: ToolDefinition[]): string {
    if (tools.length === 0) return 'No tools available.';

    let formatted = 'AVAILABLE TOOLS:\n---\n';
    for (const tool of tools) {
      const params = tool.parameters
        .map(p => {
          const req = p.required ? ', required' : '';
          const def = p.default !== undefined ? `, default: ${p.default}` : '';
          const enumStr = p.enum ? `, enum: [${p.enum.join(', ')}]` : '';
          return `${p.name} (${p.type}${req}${def}${enumStr}) — ${p.description}`;
        })
        .join('\n  ');

      formatted += `\n[${tool.id}] ${tool.name}: ${tool.description}\n`;
      if (params) formatted += `  Parameters:\n  ${params}\n`;
      if (tool.dangerous) formatted += `  ⚠️ DANGEROUS TOOL — Ask user for confirmation before use\n`;
      formatted += `  Usage: Call <tool_call|${tool.id}|{{...}}>\n`;
    }
    formatted += '\n---\n';
    formatted += 'To use a tool, output EXACTLY: <tool_call|TOOL_ID|{"param": "value"}>\n';
    formatted += 'You can call multiple tools: <tool_call|tool1|{}>\n<tool_call|tool2|{}>\n';
    formatted += 'IMPORTANT: Always use tools when you need real-time data, code generation, analysis, or search.\n';
    formatted += 'After receiving tool results, synthesize them into a comprehensive answer.\n';
    return formatted;
  }

  /**
   * Discover tools from the HexStrike Python backend
   * Returns bridge ToolDefinitions for backend tools
   */
  async discoverTools(): Promise<ToolDefinition[]> {
    // Try to connect to HexStrike backend
    const health = await hexstrikeClient.checkHealth();
    if (!hexstrikeClient.connected) {
      console.log('[HexStrike Registry] Backend offline, using local tools only');
      return [];
    }

    console.log(`[HexStrike Registry] Backend online! ${health.total_tools} tools available`);
    return [];
  }

  /** Check and update backend connection status */
  async checkBackendConnection(): Promise<boolean> {
    await hexstrikeClient.checkHealth();
    return hexstrikeClient.connected;
  }

  getCategories(): { category: string; count: number }[] {
    const cats = new Map<string, number>();
    for (const tool of this.tools.values()) {
      cats.set(tool.category, (cats.get(tool.category) || 0) + 1);
    }
    return Array.from(cats.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  getTotalCount(): number {
    return this.tools.size;
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();
export default toolRegistry;
