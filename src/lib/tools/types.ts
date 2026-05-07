// Cerberus AI v4.0 — Tool-Augmented LLM System Types

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
  default?: any;
  enum?: string[];
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  source?: string;
  parameters: ToolParameter[];
  execute: (params: Record<string, any>, context: ToolContext) => Promise<ToolResult>;
  requiresConfirmation?: boolean;
  dangerous?: boolean;
}

export interface ToolContext {
  sessionId: string;
  userId?: string;
  agentId: string;
  metadata?: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  output: string;
  data?: any;
  error?: string;
  tokensUsed?: number;
}

export interface ToolCall {
  id: string;
  toolName: string;
  arguments: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: ToolResult;
  timestamp: number;
  duration?: number;
}

export interface AgentDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  keywords: string[];
  tools: string[];
  isDefault?: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  serverUrl: string;
  inputSchema: Record<string, any>;
}

export interface LearningExperience {
  id: string;
  toolName: string;
  task: string;
  approach: string;
  outcome: string;
  rating: number;
  timestamp: number;
  agentId: string;
}

export interface MetaLearnedSkill {
  id: string;
  name: string;
  description: string;
  toolCallPattern: string;
  learnedFrom: string[];
  successRate: number;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
}
