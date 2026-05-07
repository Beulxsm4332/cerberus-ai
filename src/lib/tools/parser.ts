// Cerberus AI v4.0 — Response Parser
// Parses tool call patterns from LLM responses

import type { ToolCall } from './types';
import { createToolCall } from './executor';

const TOOL_CALL_REGEX = /<tool_call\|([^|]+)\|([^>]+)>/g;
const TOOL_RESULT_REGEX = /<tool_result\|[^|]+\|[^>]+>[\s\S]*?<\/tool_result>/g;

export function parseToolCalls(response: string): ToolCall[] {
  const toolCalls: ToolCall[] = [];
  let match: RegExpExecArray | null;

  TOOL_CALL_REGEX.lastIndex = 0;
  while ((match = TOOL_CALL_REGEX.exec(response)) !== null) {
    const toolName = match[1].trim();
    const argsStr = match[2].trim();
    try {
      const args = JSON.parse(argsStr);
      toolCalls.push(createToolCall(toolName, args));
    } catch {
      // Try to parse as simple key=value
      const args: Record<string, any> = {};
      const pairs = argsStr.split(',').map(s => s.trim());
      for (const pair of pairs) {
        const eqIdx = pair.indexOf('=');
        if (eqIdx > 0) {
          const key = pair.slice(0, eqIdx).trim();
          const val = pair.slice(eqIdx + 1).trim();
          args[key] = val;
        }
      }
      if (Object.keys(args).length > 0) {
        toolCalls.push(createToolCall(toolName, args));
      }
    }
  }

  return toolCalls;
}

export function hasToolCalls(response: string): boolean {
  TOOL_CALL_REGEX.lastIndex = 0;
  return TOOL_CALL_REGEX.test(response);
}

export function extractFinalAnswer(response: string): string {
  // Remove all tool call tags
  let cleaned = response.replace(TOOL_CALL_REGEX, '');
  // Remove any tool result tags
  cleaned = cleaned.replace(TOOL_RESULT_REGEX, '');
  // Clean up whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  return cleaned;
}

export function stripToolCallsFromHistory(messages: Array<{ role: string; content: string }>): Array<{ role: string; content: string }> {
  return messages.map(msg => ({
    ...msg,
    content: extractFinalAnswer(msg.content),
  }));
}
