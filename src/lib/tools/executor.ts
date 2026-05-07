// Cerberus AI v4.0 — Tool Executor
// Executes tool calls with validation, formatting, and error handling

import type { ToolCall, ToolContext, ToolResult, ToolDefinition } from './types';
import { toolRegistry } from './registry';

export function validateParams(tool: ToolDefinition, params: Record<string, any>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const param of tool.parameters) {
    if (param.required && (params[param.name] === undefined || params[param.name] === null || params[param.name] === '')) {
      errors.push(`Missing required parameter: ${param.name}`);
    }
    if (params[param.name] !== undefined) {
      const value = params[param.name];
      const typeCheck = (val: any, expected: string): boolean => {
        switch (expected) {
          case 'string': return typeof val === 'string';
          case 'number': return typeof val === 'number' && !isNaN(val);
          case 'boolean': return typeof val === 'boolean';
          case 'array': return Array.isArray(val);
          case 'object': return typeof val === 'object' && val !== null && !Array.isArray(val);
          default: return true;
        }
      };
      if (!typeCheck(value, param.type)) {
        errors.push(`Parameter "${param.name}" expected ${param.type}, got ${typeof value}`);
      }
      if (param.enum && !param.enum.includes(String(value))) {
        errors.push(`Parameter "${param.name}" must be one of: ${param.enum.join(', ')}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export async function executeToolCall(
  call: ToolCall,
  context: ToolContext
): Promise<ToolCall> {
  const tool = toolRegistry.getTool(call.toolName);
  if (!tool) {
    return {
      ...call,
      status: 'failed',
      result: { success: false, output: '', error: `Unknown tool: ${call.toolName}` },
      duration: 0,
    };
  }

  // Validate parameters
  const validation = validateParams(tool, call.arguments);
  if (!validation.valid) {
    return {
      ...call,
      status: 'failed',
      result: { success: false, output: '', error: `Invalid parameters: ${validation.errors.join('; ')}` },
      duration: 0,
    };
  }

  // Execute
  const startTime = Date.now();
  try {
    const result = await tool.execute(call.arguments, context);
    return {
      ...call,
      status: result.success ? 'completed' : 'failed',
      result,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      ...call,
      status: 'failed',
      result: {
        success: false,
        output: '',
        error: `Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      duration: Date.now() - startTime,
    };
  }
}

export function formatToolCallResult(call: ToolCall): string {
  const status = call.status === 'completed' ? '✅' : '❌';
  let result = `\n${status} Tool: ${call.toolName}`;
  result += `\nStatus: ${call.status}`;
  if (call.duration) {
    result += ` (${call.duration}ms)`;
  }
  if (call.result) {
    if (call.result.output) {
      result += `\nResult:\n${call.result.output}`;
    }
    if (call.result.error) {
      result += `\nError: ${call.result.error}`;
    }
  }
  return result;
}

export function formatToolCallForLLM(call: ToolCall): string {
  let formatted = `<tool_result|${call.toolName}|${call.status === 'completed' ? 'success' : 'error'}>`;
  if (call.result) {
    const content = call.result.output || call.result.error || 'No output';
    // Escape potential tags in the content
    const escaped = content.replace(/<tool_result/g, '&lt;tool_result').replace(/<tool_call/g, '&lt;tool_call');
    formatted += `\n${escaped}`;
  }
  formatted += `</tool_result>`;
  return formatted;
}

export function createToolCall(toolName: string, arguments_: Record<string, any>): ToolCall {
  return {
    id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    toolName,
    arguments: arguments_,
    status: 'pending',
    timestamp: Date.now(),
  };
}
