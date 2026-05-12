'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import {
  Send,
  Menu,
  X,
  Bot,
  ChevronRight,
  Trash2,
  Square,
  Copy,
  Check,
  RefreshCw,
  Plus,
  MessageSquare,
  Clock,
  Wrench,
  Code2,
  Search,
  Settings,
  Brain,
  PenTool,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// ===== TYPES =====
interface ToolCallInfo {
  toolName: string;
  arguments: Record<string, any>;
  result: string;
  status: string;
  duration?: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent?: {
    id: string;
    name: string;
    emoji: string;
    color: string;
    role: string;
    description?: string;
  };
  model?: string;
  tokens?: string;
  responseTimeMs?: number;
  timestamp: number;
  isStreaming?: boolean;
  toolCalls?: ToolCallInfo[];
  iterations?: number;
  isThinking?: boolean;
  activeTool?: string;
}

interface AgentInfo {
  id: string;
  name: string;
  emoji: string;
  color: string;
  role: string;
  description: string;
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

interface QuickCommand {
  icon: React.ReactNode;
  label: string;
  prefix: string;
  color: string;
}

// ===== CONSTANTS =====
const SESSIONS_KEY = 'nova-sessions';
const MAX_SESSIONS = 50;
const MAX_MESSAGES_PER_SESSION = 100;

const QUICK_COMMANDS: QuickCommand[] = [
  { icon: <Code2 size={14} />, label: 'Generate Code', prefix: 'Generate ', color: '#3b82f6' },
  { icon: <BugIcon size={14} />, label: 'Debug Code', prefix: 'Debug this code: ', color: '#f59e0b' },
  { icon: <BarChart3Icon size={14} />, label: 'Analyze Data', prefix: 'Analyze ', color: '#10b981' },
  { icon: <PenTool size={14} />, label: 'Write Content', prefix: 'Write ', color: '#8b5cf6' },
  { icon: <Search size={14} />, label: 'Search Web', prefix: 'Search for ', color: '#06b6d4' },
  { icon: <EyeIcon size={14} />, label: 'Review Code', prefix: 'Review this code: ', color: '#ec4899' },
];

const DEFAULT_AGENTS: AgentInfo[] = [
  { id: 'nova-core', name: 'NOVA Core', emoji: '🌟', color: '#3b82f6', role: 'Master Agent', description: 'Coding, analysis, web search, system ops.' },
  { id: 'code-architect', name: 'Code Architect', emoji: '💻', color: '#8b5cf6', role: 'Senior Engineer', description: 'Full-stack development, architecture, code review.' },
  { id: 'research-analyst', name: 'Research Analyst', emoji: '🔍', color: '#06b6d4', role: 'Research Specialist', description: 'Web search, research, analysis, information.' },
  { id: 'data-analytics', name: 'Data & Analytics', emoji: '📊', color: '#10b981', role: 'Data Analyst', description: 'Data analysis, visualization, statistics.' },
  { id: 'creative-writer', name: 'Creative Writer', emoji: '✍️', color: '#f59e0b', role: 'Content Creator', description: 'Writing, blog, documentation, creative content.' },
  { id: 'quick-helper', name: 'Quick Helper', emoji: '⚡', color: '#ec4899', role: 'Fast Response', description: 'Quick answers, FAQ, greetings.' },
];

// ===== LOCAL STORAGE HELPERS =====
function loadSessions(): Session[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveSessions(sessions: Session[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch {
    // Storage full, ignore
  }
}

// ===== INLINE ICON COMPONENTS =====
function BugIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m8 2 1.88 1.88" /><path d="M14.12 3.88 16 2" /><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" /><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" /><path d="M12 20v-9" /><path d="M6.53 9C4.6 8.8 3 7.1 3 5" /><path d="M6 13H2" /><path d="M3 21c0-2.1 1.7-3.9 3.8-4" /><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" /><path d="M22 13h-4" /><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
    </svg>
  );
}

function EyeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function BarChart3Icon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M7 16V8" /><path d="M11 16V5" /><path d="M15 16v-3" /><path d="M19 16v-7" />
    </svg>
  );
}

// ===== CODE BLOCK COMPONENT =====
function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'code';

  const codeContent = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span>{language}</span>
        <button onClick={handleCopy} className="code-block-copy">
          {copied ? (
            <span className="flex items-center gap-1">
              <Check size={10} /> Copied!
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Copy size={10} /> Copy
            </span>
          )}
        </button>
      </div>
      <pre className="!m-0 !rounded-none !border-0">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

// ===== MARKDOWN COMPONENTS =====
const markdownComponents: Components = {
  code({ className, children, ...props }) {
    if (className && className.startsWith('language-')) {
      return <CodeBlock className={className}>{children}</CodeBlock>;
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};

// ===== MARKDOWN MESSAGE COMPONENT =====
function MessageContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  return (
    <div className={cn('message-content text-sm leading-relaxed', isStreaming && 'streaming-cursor')}>
      <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
    </div>
  );
}

// ===== AGENT AVATAR =====
function AgentAvatar({ agent, size = 'md' }: { agent?: AgentInfo | Message['agent']; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-xl',
  };

  return (
    <div
      className={cn(
        'rounded-lg flex items-center justify-center flex-shrink-0 border',
        sizeClasses[size]
      )}
      style={{
        backgroundColor: `${agent?.color || '#3b82f6'}15`,
        borderColor: `${agent?.color || '#3b82f6'}30`,
      }}
    >
      {agent?.emoji || '🌟'}
    </div>
  );
}

// ===== MAIN PAGE =====
export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentInfo>(DEFAULT_AGENTS[0]);
  const [agents, setAgents] = useState<AgentInfo[]>(DEFAULT_AGENTS);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Derived: active session
  const activeSession = useMemo(() => {
    if (!activeSessionId) return null;
    return sessions.find(s => s.id === activeSessionId) || null;
  }, [sessions, activeSessionId]);

  // Derived: current messages
  const messages = activeSession?.messages || [];

  // Load sessions from localStorage on mount
  useEffect(() => {
    const loaded = loadSessions();
    setSessions(loaded);
    if (loaded.length > 0) {
      setActiveSessionId(loaded[0].id);
    }
  }, []);

  // Fetch agents on mount
  useEffect(() => {
    fetch('/api/chat')
      .then((res) => res.json())
      .then((data) => {
        if (data.agents) setAgents(data.agents);
      })
      .catch(() => {
        // Use defaults
      });
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  // Create a new chat session
  const createNewSession = useCallback(() => {
    const newSession: Session = {
      id: `session-${Date.now()}`,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setSidebarOpen(false);
    inputRef.current?.focus();
  }, []);

  // Switch to a session
  const switchSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setSidebarOpen(false);
    inputRef.current?.focus();
  }, []);

  // Delete a session
  const deleteSession = useCallback((sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      if (activeSessionId === sessionId) {
        if (filtered.length > 0) {
          setActiveSessionId(filtered[0].id);
        } else {
          setActiveSessionId(null);
        }
      }
      return filtered;
    });
  }, [activeSessionId]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
  };

  // Handle submit (streaming)
  const handleSubmit = useCallback(
    async (messageText?: string) => {
      const text = (messageText || inputValue).trim();
      if (!text || isLoading) return;

      setInputValue('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }

      // Ensure we have an active session
      let sessionId = activeSessionId;
      if (!sessionId) {
        const newSession: Session = {
          id: `session-${Date.now()}`,
          title: text.slice(0, 30),
          messages: [],
          createdAt: Date.now(),
        };
        setSessions(prev => [newSession, ...prev]);
        sessionId = newSession.id;
        setActiveSessionId(sessionId);
      }

      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };

      // Add user message to session and update title if first message
      const isFirstMessage = !sessions.find(s => s.id === sessionId)?.messages.length;
      setSessions(prev => prev.map(session => {
        if (session.id !== sessionId) return session;
        return {
          ...session,
          title: isFirstMessage ? text.slice(0, 30) : session.title,
          messages: [...session.messages, userMessage],
        };
      }));

      setIsLoading(true);

      // Create empty AI message placeholder
      const aiMessageId = `msg-${Date.now() + 1}`;
      const aiMessage: Message = {
        id: aiMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };

      // Use setTimeout to ensure session state is set before streaming starts
      await new Promise(resolve => setTimeout(resolve, 50));

      // Add empty AI message
      setSessions(prev => prev.map(session => {
        if (session.id !== sessionId) return session;
        return {
          ...session,
          messages: [...session.messages, aiMessage],
        };
      }));

      // Build history (excluding the empty AI message)
      const currentMessages = sessions.find(s => s.id === sessionId)?.messages || [];
      const history = currentMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            agent: activeAgent.id === 'nova-core' ? undefined : activeAgent.id,
            history,
            stream: true,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        let usedModel = '';
        let totalTokens = 0;
        let responseTimeMs = 0;
        let agentInfo: Message['agent'] = undefined;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'agent') {
                  agentInfo = parsed.data;
                  setSessions(prev => prev.map(session => {
                    if (session.id !== sessionId) return session;
                    return {
                      ...session,
                      messages: session.messages.map(m =>
                        m.id === aiMessageId ? { ...m, agent: parsed.data } : m
                      ),
                    };
                  }));
                } else if (parsed.type === 'model') {
                  usedModel = parsed.data;
                } else if (parsed.type === 'thinking') {
                  setSessions(prev => prev.map(session => {
                    if (session.id !== sessionId) return session;
                    return {
                      ...session,
                      messages: session.messages.map(m =>
                        m.id === aiMessageId ? { ...m, isThinking: true, activeTool: undefined } : m
                      ),
                    };
                  }));
                } else if (parsed.type === 'tool_start') {
                  setSessions(prev => prev.map(session => {
                    if (session.id !== sessionId) return session;
                    return {
                      ...session,
                      messages: session.messages.map(m =>
                        m.id === aiMessageId ? { ...m, isThinking: false, activeTool: parsed.tool } : m
                      ),
                    };
                  }));
                } else if (parsed.type === 'tool_result') {
                  setSessions(prev => prev.map(session => {
                    if (session.id !== sessionId) return session;
                    return {
                      ...session,
                      messages: session.messages.map(m =>
                        m.id === aiMessageId ? { ...m, activeTool: undefined } : m
                      ),
                    };
                  }));
                } else if (parsed.type === 'token') {
                  accumulated += parsed.data;
                  setSessions(prev => prev.map(session => {
                    if (session.id !== sessionId) return session;
                    return {
                      ...session,
                      messages: session.messages.map(m =>
                        m.id === aiMessageId ? { ...m, content: accumulated, isThinking: false, activeTool: undefined } : m
                      ),
                    };
                  }));
                } else if (parsed.type === 'done') {
                  totalTokens = parsed.data.totalTokens;
                  responseTimeMs = parsed.data.responseTimeMs;
                  usedModel = parsed.data.model || usedModel;
                  if (parsed.data.toolCalls && parsed.data.toolCalls.length > 0) {
                    setSessions(prev => prev.map(session => {
                      if (session.id !== sessionId) return session;
                      return {
                        ...session,
                        messages: session.messages.map(m =>
                          m.id === aiMessageId ? { ...m, toolCalls: parsed.data.toolCalls, iterations: parsed.data.iterations } : m
                        ),
                      };
                    }));
                  }
                } else if (parsed.type === 'error') {
                  accumulated += `\n\n❌ **Error:** ${parsed.data}`;
                }
              } catch {
                // Ignore malformed JSON
              }
            }
          }
        }

        // Finalize the message
        setSessions(prev => prev.map(session => {
          if (session.id !== sessionId) return session;
          let updatedMessages = session.messages.map(m =>
            m.id === aiMessageId
              ? {
                  ...m,
                  content: accumulated,
                  agent: agentInfo,
                  model: usedModel,
                  tokens: totalTokens > 0 ? String(totalTokens) : undefined,
                  responseTimeMs,
                  isStreaming: false,
                }
              : m
          );
          if (updatedMessages.length > MAX_MESSAGES_PER_SESSION) {
            updatedMessages = updatedMessages.slice(-MAX_MESSAGES_PER_SESSION);
          }
          return { ...session, messages: updatedMessages };
        }));
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          setSessions(prev => prev.map(session => {
            if (session.id !== sessionId) return session;
            return {
              ...session,
              messages: session.messages.map(m =>
                m.id === aiMessageId
                  ? { ...m, isStreaming: false, content: m.content || '⏹ Generation stopped.' }
                  : m
              ),
            };
          }));
        } else {
          setSessions(prev => prev.map(session => {
            if (session.id !== sessionId) return session;
            return {
              ...session,
              messages: session.messages.map(m =>
                m.id === aiMessageId
                  ? {
                      ...m,
                      isStreaming: false,
                      role: 'system' as const,
                      content: '❌ **Connection failed.** Unable to connect to the server. Please check your connection and try again.',
                    }
                  : m
              ),
            };
          }));
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [inputValue, isLoading, sessions, activeSessionId, activeAgent]
  );

  // Stop generation
  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  // Regenerate last response
  const handleRegenerate = useCallback(() => {
    if (isLoading) return;
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;

    setSessions(prev => prev.map(session => {
      if (session.id !== activeSessionId) return session;
      const msgs = [...session.messages];
      while (msgs.length > 0 && msgs[msgs.length - 1].role !== 'user') {
        msgs.pop();
      }
      return { ...session, messages: msgs };
    }));

    setTimeout(() => {
      handleSubmit(lastUserMsg.content);
    }, 100);
  }, [messages, isLoading, activeSessionId, handleSubmit]);

  // Copy message content
  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  // Handle keyboard shortcut
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Quick command handler
  const handleQuickCommand = (prefix: string) => {
    setInputValue(prefix);
    inputRef.current?.focus();
  };

  // Select agent
  const selectAgent = (agent: AgentInfo) => {
    setActiveAgent(agent);
    setSidebarOpen(false);
    inputRef.current?.focus();
  };

  // Current active agent for header
  const currentAgentForHeader = useMemo(() => {
    const lastAgentMsg = [...messages].reverse().find((m) => m.agent);
    if (lastAgentMsg?.agent) {
      const found = agents.find((a) => a.id === lastAgentMsg.agent?.id);
      if (found) return found;
    }
    return activeAgent;
  }, [messages, activeAgent, agents]);

  // Format response time
  const formatResponseTime = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-nova-bg page-transition">
      {/* ===== HEADER ===== */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-nova-border bg-nova-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-nova-text-dim hover:text-nova-text hover:bg-nova-card"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <span className="text-base">🌟</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide text-nova-text">
                NOVA AI
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-400/80">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current agent info */}
        <div className="hidden sm:flex items-center gap-2">
          <AgentAvatar agent={currentAgentForHeader} size="sm" />
          <div className="text-right">
            <p className="text-xs font-medium text-nova-text">{currentAgentForHeader.name}</p>
            <p className="text-[10px] text-nova-text-dim">{currentAgentForHeader.role}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-nova-text-dim hover:text-nova-text hover:bg-nova-card"
            onClick={createNewSession}
            title="New chat"
          >
            <Plus size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-nova-text-dim hover:text-nova-text hover:bg-nova-card"
            onClick={() => {
              if (activeSessionId) {
                setSessions(prev => prev.map(s =>
                  s.id === activeSessionId ? { ...s, messages: [] } : s
                ));
              }
              inputRef.current?.focus();
            }}
            title="Clear chat"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ===== SIDEBAR ===== */}
        <AnimatePresence>
          {(sidebarOpen || typeof window !== 'undefined') && (
            <>
              {/* Mobile overlay */}
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 z-20 lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                />
              )}

              <motion.aside
                initial={false}
                animate={{
                  x: sidebarOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1024) ? -240 : 0,
                }}
                transition={{ type: 'tween', duration: 0.2 }}
                className={cn(
                  'w-[240px] flex-shrink-0 border-r border-nova-border bg-nova-surface/95 backdrop-blur-md flex flex-col z-30',
                  'lg:translate-x-0 lg:relative lg:z-0',
                  !sidebarOpen && 'hidden lg:flex'
                )}
              >
                {/* New Chat button */}
                <div className="p-3 border-b border-nova-border">
                  <button
                    onClick={createNewSession}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all text-xs font-medium"
                  >
                    <Plus size={14} />
                    New Chat
                  </button>
                </div>

                {/* Session list */}
                {sessions.length > 0 && (
                  <div className="border-b border-nova-border">
                    <div className="px-4 py-2">
                      <h3 className="text-[10px] font-semibold tracking-wider text-nova-text-dim uppercase">
                        History
                      </h3>
                    </div>
                    <ScrollArea className="max-h-44 nova-scrollbar-slim">
                      <div className="px-2 pb-2 space-y-0.5">
                        {sessions.map((session) => (
                          <button
                            key={session.id}
                            onClick={() => switchSession(session.id)}
                            className={cn(
                              'session-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-transparent text-left',
                              activeSessionId === session.id && 'active'
                            )}
                          >
                            <MessageSquare size={13} className="text-nova-text-dim flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-nova-text truncate">
                                {session.title}
                              </p>
                              <p className="text-[9px] text-nova-text-dim flex items-center gap-1">
                                <Clock size={8} />
                                {new Date(session.createdAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                                {' · '}
                                {session.messages.length} msgs
                              </p>
                            </div>
                            <button
                              onClick={(e) => deleteSession(session.id, e)}
                              className="opacity-0 hover:opacity-100 p-1 rounded text-nova-text-dim hover:text-red-400 transition-all"
                              style={{ opacity: activeSessionId === session.id ? 0.5 : 0 }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = activeSessionId === session.id ? '0.5' : '0')}
                            >
                              <Trash2 size={11} />
                            </button>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Agent list header */}
                <div className="p-3 border-b border-nova-border">
                  <h2 className="text-xs font-semibold tracking-wider text-blue-400 uppercase mb-1">
                    Agents
                  </h2>
                  <p className="text-[10px] text-nova-text-dim">
                    Select agent or auto-route
                  </p>
                </div>

                {/* Agent list */}
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {agents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => selectAgent(agent)}
                        className={cn(
                          'agent-item w-full flex items-center gap-3 p-2.5 rounded-xl border border-transparent text-left transition-all',
                          activeAgent.id === agent.id && 'active'
                        )}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 border"
                          style={{
                            backgroundColor: `${agent.color}12`,
                            borderColor: `${agent.color}25`,
                          }}
                        >
                          {agent.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-nova-text truncate">
                            {agent.name}
                          </p>
                          <p className="text-[10px] text-nova-text-dim truncate">
                            {agent.role}
                          </p>
                        </div>
                        {activeAgent.id === agent.id && (
                          <ChevronRight size={14} className="text-blue-400 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>

                {/* Sidebar footer */}
                <div className="p-3 border-t border-nova-border">
                  <div className="flex items-center gap-2 px-2">
                    <Brain size={12} className="text-blue-400" />
                    <p className="text-[10px] text-nova-text-dim">
                      NOVA AI v4.0 · 32 Tools · Function Calling
                    </p>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ===== CHAT AREA ===== */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto nova-scrollbar"
          >
            {messages.length === 0 ? (
              /* ===== WELCOME SCREEN ===== */
              <div className="h-full flex items-center justify-center p-4">
                <div className="text-center max-w-lg space-y-6">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    {/* Logo */}
                    <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center mx-auto">
                      <span className="text-3xl">🌟</span>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-nova-text">
                        NOVA AI
                      </h2>
                      <p className="text-sm text-nova-text-dim mt-1">
                        Super AI Agent — Coding, Analysis, Research & More
                      </p>
                    </div>
                  </motion.div>

                  {/* Capability cards */}
                  <motion.div
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                    className="flex flex-wrap items-center justify-center gap-2"
                  >
                    {[
                      { icon: <Code2 size={14} />, label: 'Coding', count: '8 tools', color: '#3b82f6' },
                      { icon: <Search size={14} />, label: 'Research', count: 'web search & scrape', color: '#06b6d4' },
                      { icon: <Settings size={14} />, label: 'System', count: 'file ops & commands', color: '#f59e0b' },
                      { icon: <Brain size={14} />, label: 'Meta', count: 'learning & evolution', color: '#8b5cf6' },
                    ].map((cat) => (
                      <span
                        key={cat.label}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border cursor-default"
                        style={{
                          backgroundColor: `${cat.color}08`,
                          borderColor: `${cat.color}20`,
                          color: cat.color,
                        }}
                      >
                        {cat.icon}
                        {cat.label}
                        <span className="opacity-50">· {cat.count}</span>
                      </span>
                    ))}
                  </motion.div>

                  {/* Quick start buttons */}
                  <motion.div
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.25, duration: 0.3 }}
                    className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                  >
                    {QUICK_COMMANDS.map((cmd) => (
                      <button
                        key={cmd.label}
                        onClick={() => handleQuickCommand(cmd.prefix)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-nova-border bg-nova-card/50 hover:bg-nova-card hover:border-nova-border transition-all text-left group"
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                          style={{ backgroundColor: `${cmd.color}12`, color: cmd.color }}
                        >
                          {cmd.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-nova-text group-hover:text-nova-text-dim transition-colors">
                            {cmd.label}
                          </p>
                        </div>
                      </button>
                    ))}
                  </motion.div>

                  {/* Agents preview */}
                  <motion.div
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.35, duration: 0.3 }}
                    className="flex items-center justify-center gap-3"
                  >
                    {DEFAULT_AGENTS.map((agent) => (
                      <motion.div
                        key={agent.id}
                        className="flex flex-col items-center gap-1 cursor-pointer"
                        onClick={() => selectAgent(agent)}
                        title={agent.name}
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border transition-all hover:scale-110"
                          style={{
                            backgroundColor: `${agent.color}10`,
                            borderColor: `${agent.color}20`,
                          }}
                        >
                          {agent.emoji}
                        </div>
                        <span className="text-[9px] text-nova-text-dim max-w-[60px] text-center truncate">
                          {agent.name.split(' ').pop()}
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </div>
            ) : (
              /* ===== MESSAGE LIST ===== */
              <div className="p-4 space-y-4 max-w-3xl mx-auto">
                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        'flex gap-3',
                        msg.role === 'user' && 'flex-row-reverse'
                      )}
                    >
                      {/* Avatar */}
                      {msg.role === 'user' ? (
                        <div className="w-8 h-8 rounded-lg bg-nova-card border border-nova-border flex items-center justify-center flex-shrink-0">
                          <Bot size={16} className="text-nova-text-dim" />
                        </div>
                      ) : (
                        <AgentAvatar agent={msg.agent} size="md" />
                      )}

                      {/* Message bubble */}
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-4 py-3 border message-bubble relative',
                          msg.role === 'user'
                            ? 'bg-blue-500/10 border-blue-500/20 rounded-tr-sm'
                            : 'bg-nova-card border-nova-border rounded-tl-sm',
                          msg.role === 'system' && 'bg-violet-500/5 border-violet-500/20'
                        )}
                      >
                        {/* Agent name for assistant messages */}
                        {msg.role === 'assistant' && msg.agent && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold" style={{ color: msg.agent.color }}>
                              {msg.agent.name}
                            </span>
                          </div>
                        )}

                        {/* Thinking state */}
                        {msg.isThinking && msg.activeTool && (
                          <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-xs text-blue-400">
                              Using {msg.activeTool}...
                            </span>
                          </div>
                        )}
                        {msg.isThinking && !msg.activeTool && (
                          <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                            <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
                            <span className="text-xs text-violet-400">
                              Thinking...
                            </span>
                          </div>
                        )}

                        {/* Message content */}
                        {msg.role === 'assistant' || msg.role === 'system' ? (
                          <MessageContent content={msg.content} isStreaming={msg.isStreaming && !msg.isThinking} />
                        ) : (
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        )}

                        {/* Message actions */}
                        {msg.role === 'assistant' && !msg.isStreaming && msg.content && (
                          <div className="message-actions flex items-center gap-1 mt-2">
                            <button
                              onClick={() => handleCopyMessage(msg.content)}
                              className="flex items-center gap-1 px-1.5 py-1 rounded-md text-nova-text-dim hover:text-nova-text hover:bg-nova-surface transition-all text-[10px]"
                            >
                              <Copy size={11} />
                              Copy
                            </button>
                            {msg.id === messages[messages.length - 1]?.id && !isLoading && (
                              <button
                                onClick={handleRegenerate}
                                className="flex items-center gap-1 px-1.5 py-1 rounded-md text-nova-text-dim hover:text-nova-text hover:bg-nova-surface transition-all text-[10px]"
                              >
                                <RefreshCw size={11} />
                                Regenerate
                              </button>
                            )}
                          </div>
                        )}

                        {/* Metrics bar */}
                        {msg.role === 'assistant' && !msg.isStreaming && (msg.model || msg.responseTimeMs || msg.tokens) && (
                          <div className="metrics-bar mt-2 pt-1 border-t border-nova-border/50">
                            {msg.model && (
                              <span className="metric-badge">{msg.model}</span>
                            )}
                            {msg.responseTimeMs && (
                              <span>⏱ {formatResponseTime(msg.responseTimeMs)}</span>
                            )}
                            {msg.tokens && Number(msg.tokens) > 0 && (
                              <span>📝 ~{msg.tokens} tokens</span>
                            )}
                            {msg.iterations && msg.iterations > 1 && (
                              <span>🔄 {msg.iterations} iterations</span>
                            )}
                            {msg.toolCalls && msg.toolCalls.length > 0 && (
                              <span>🔧 {msg.toolCalls.length} tools</span>
                            )}
                          </div>
                        )}

                        {/* Tool calls collapsible */}
                        {msg.toolCalls && msg.toolCalls.length > 0 && !msg.isStreaming && (
                          <details className="mt-2">
                            <summary className="text-[10px] text-nova-text-dim cursor-pointer hover:text-blue-400 transition-colors flex items-center gap-1">
                              <Wrench size={10} />
                              Tool Calls ({msg.toolCalls.length})
                            </summary>
                            <div className="mt-1 space-y-1 max-h-48 overflow-y-auto nova-scrollbar-slim">
                              {msg.toolCalls.map((tc, i) => (
                                <div key={i} className="px-2 py-1.5 rounded-md bg-nova-surface/50 border border-nova-border/50 text-[10px]">
                                  <div className="flex items-center gap-1.5">
                                    <span className={tc.status === 'completed' ? 'text-emerald-400' : 'text-red-400'}>
                                      {tc.status === 'completed' ? '✓' : '✗'}
                                    </span>
                                    <span className="font-mono text-blue-400">{tc.toolName}</span>
                                    {tc.duration && (
                                      <span className="text-nova-text-dim ml-auto">{tc.duration}ms</span>
                                    )}
                                  </div>
                                  {tc.result && (
                                    <pre className="mt-1 text-nova-text-dim overflow-x-auto whitespace-pre-wrap max-h-20 opacity-70">{tc.result.slice(0, 300)}{tc.result.length > 300 ? '...' : ''}</pre>
                                  )}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}

                        {/* Timestamp */}
                        <p className="text-[10px] text-nova-text-dim mt-1.5">
                          {new Date(msg.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* ===== INPUT AREA ===== */}
          <div className="border-t border-nova-border bg-nova-surface/80 backdrop-blur-md p-3">
            <div className="max-w-3xl mx-auto space-y-2">
              {/* Quick commands (when messages exist) */}
              {messages.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {QUICK_COMMANDS.map((cmd) => (
                    <button
                      key={cmd.label}
                      onClick={() => handleQuickCommand(cmd.prefix)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-nova-border bg-nova-card/50 hover:bg-nova-card transition-all whitespace-nowrap flex-shrink-0"
                    >
                      <span style={{ color: cmd.color }}>{cmd.icon}</span>
                      <span className="text-[10px] text-nova-text-dim">{cmd.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Input bar */}
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  {/* Agent avatar inside input */}
                  <div className="absolute left-3 bottom-3">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-xs border"
                      style={{
                        backgroundColor: `${activeAgent.color}10`,
                        borderColor: `${activeAgent.color}20`,
                      }}
                    >
                      {activeAgent.emoji}
                    </div>
                  </div>
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${activeAgent.name}...`}
                    disabled={isLoading}
                    rows={1}
                    className="w-full resize-none rounded-xl border border-nova-border bg-nova-card text-nova-text placeholder:text-nova-text-dim pl-11 pr-10 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 transition-all min-h-[44px]"
                    style={{
                      maxHeight: '150px',
                    }}
                  />
                  {/* Character count */}
                  <div className="absolute right-3 bottom-3 flex flex-col items-end gap-0.5">
                    {inputValue.length > 500 && (
                      <span className={cn(
                        'text-[9px]',
                        inputValue.length > 9000 ? 'text-red-400' : 'text-nova-text-dim'
                      )}>
                        {inputValue.length}/10000
                      </span>
                    )}
                  </div>
                </div>

                {/* Send / Stop button */}
                {isLoading ? (
                  <Button
                    onClick={stopGeneration}
                    className="h-[44px] w-[44px] rounded-xl bg-nova-card hover:bg-nova-border text-nova-text-dim border border-nova-border flex-shrink-0 transition-all"
                  >
                    <Square size={16} />
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSubmit()}
                    disabled={!inputValue.trim()}
                    className="h-[44px] w-[44px] rounded-xl bg-blue-500 hover:bg-blue-600 text-white flex-shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Send size={16} />
                  </Button>
                )}
              </div>

              {/* Footer hint */}
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <Zap size={10} className="text-nova-text-dim" />
                <p className="text-[10px] text-nova-text-dim">
                  Press <kbd className="px-1 py-0.5 rounded bg-nova-card border border-nova-border text-[9px]">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-nova-card border border-nova-border text-[9px]">Shift+Enter</kbd> for new line
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
