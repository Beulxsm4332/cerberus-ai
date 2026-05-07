'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import {
  Send,
  Menu,
  X,
  Zap,
  Shield,
  Search,
  Skull,
  Ghost,
  Drama,
  Bot,
  ChevronRight,
  Trash2,
  Sparkles,
  AlertTriangle,
  Square,
  Copy,
  Check,
  RefreshCw,
  Plus,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// ===== TYPES =====
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
  };
  model?: string;
  tokens?: string;
  responseTimeMs?: number;
  timestamp: number;
  isStreaming?: boolean;
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
const SESSIONS_KEY = 'cerberus-sessions';
const MAX_SESSIONS = 50;
const MAX_MESSAGES_PER_SESSION = 100;

const QUICK_COMMANDS: QuickCommand[] = [
  { icon: <Search size={14} />, label: 'OSINT Search', prefix: 'Cari informasi tentang ', color: '#6A0DAD' },
  { icon: <Skull size={14} />, label: 'Generate Code', prefix: 'Buatkan kode untuk ', color: '#DC143C' },
  { icon: <Shield size={14} />, label: 'Bypass Technique', prefix: 'Cara bypass ', color: '#2ECC71' },
  { icon: <Drama size={14} />, label: 'Social Engineering', prefix: 'Buat skenario ', color: '#E91E63' },
  { icon: <Ghost size={14} />, label: 'Dark Web Scan', prefix: 'Cari di dark web tentang ', color: '#D4AF37' },
];

const DEFAULT_AGENTS: AgentInfo[] = [
  { id: 'onyx-overseer', name: 'Onyx Overseer', emoji: '🐺', color: '#D4AF37', role: 'Master Orchestrator', description: 'Otak utama Cerberus. Menganalisis dan mengkoordinasi semua agent.' },
  { id: 'phantom-executor', name: 'Phantom Executor', emoji: '💀', color: '#DC143C', role: 'Code & Exploit Specialist', description: 'Spesialis pengembangan kode exploit dan payload.' },
  { id: 'oracle-intel', name: 'Oracle Intelligence', emoji: '🔮', color: '#6A0DAD', role: 'OSINT & Research Specialist', description: 'Spesialis pengumpulan informasi dan riset keamanan.' },
  { id: 'wraith-stealth', name: 'Wraith Stealth', emoji: '👻', color: '#2ECC71', role: 'Evasion & Stealth Specialist', description: 'Spesialis teknik anti-deteksi dan stealth.' },
  { id: 'harbinger-social', name: 'Harbinger Social', emoji: '🎭', color: '#E91E63', role: 'Social Engineering Specialist', description: 'Spesialis rekayasa sosial dan phishing.' },
  { id: 'swift-responder', name: 'Swift Responder', emoji: '⚡', color: '#00BCD4', role: 'Fast Response & FAQ', description: 'Agent ringan untuk respons instan dan FAQ.' },
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
              <Check size={10} /> Tersalin!
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Copy size={10} /> Salin
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
    // If it's a code block (has className with language), use custom CodeBlock
    if (className && className.startsWith('language-')) {
      return <CodeBlock className={className}>{children}</CodeBlock>;
    }
    // Inline code
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};

// ===== FLOATING PARTICLES COMPONENT =====
function FloatingParticles() {
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 8,
      color: i % 3 === 0 ? '#DC143C' : i % 3 === 1 ? '#D4AF37' : '#6A0DAD',
      size: 1 + Math.random() * 2,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            bottom: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

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
        backgroundColor: `${agent?.color || '#DC143C'}15`,
        borderColor: `${agent?.color || '#DC143C'}30`,
        boxShadow: `0 0 12px ${agent?.color || '#DC143C'}15`,
      }}
    >
      {agent?.emoji || '🐺'}
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

  // Update a specific message in the active session
  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setSessions(prev => prev.map(session => {
      if (session.id !== activeSessionId) return session;
      return {
        ...session,
        messages: session.messages.map(m => m.id === id ? { ...m, ...updates } : m),
      };
    }));
  }, [activeSessionId]);

  // Create a new chat session
  const createNewSession = useCallback(() => {
    const newSession: Session = {
      id: `session-${Date.now()}`,
      title: 'Obrolan Baru',
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
            agent: activeAgent.id === 'onyx-overseer' ? undefined : activeAgent.id,
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
                } else if (parsed.type === 'token') {
                  accumulated += parsed.data;
                  setSessions(prev => prev.map(session => {
                    if (session.id !== sessionId) return session;
                    return {
                      ...session,
                      messages: session.messages.map(m =>
                        m.id === aiMessageId ? { ...m, content: accumulated } : m
                      ),
                    };
                  }));
                } else if (parsed.type === 'done') {
                  totalTokens = parsed.data.totalTokens;
                  responseTimeMs = parsed.data.responseTimeMs;
                  usedModel = parsed.data.model || usedModel;
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
          // Trim messages to MAX_MESSAGES_PER_SESSION
          let updatedMessages = session.messages.map(m =>
            m.id === aiMessageId
              ? {
                  ...m,
                  content: accumulated,
                  agent: agentInfo,
                  model: usedModel || agent?.model,
                  tokens: totalTokens > 0 ? String(totalTokens) : undefined,
                  responseTimeMs,
                  isStreaming: false,
                }
              : m
          );
          // Keep only last MAX_MESSAGES_PER_SESSION
          if (updatedMessages.length > MAX_MESSAGES_PER_SESSION) {
            updatedMessages = updatedMessages.slice(-MAX_MESSAGES_PER_SESSION);
          }
          return { ...session, messages: updatedMessages };
        }));
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          // User cancelled - finalize with whatever content was accumulated
          setSessions(prev => prev.map(session => {
            if (session.id !== sessionId) return session;
            return {
              ...session,
              messages: session.messages.map(m =>
                m.id === aiMessageId
                  ? { ...m, isStreaming: false, content: m.content || '⏹ Generasi dihentikan.' }
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
                      content: '❌ **Koneksi gagal.** Tidak dapat terhubung ke server. Silakan periksa koneksi internet Anda dan coba lagi.',
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
    // Find the last user message
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;

    // Remove the last assistant message
    setSessions(prev => prev.map(session => {
      if (session.id !== activeSessionId) return session;
      const msgs = [...session.messages];
      // Remove last assistant/system message
      while (msgs.length > 0 && msgs[msgs.length - 1].role !== 'user') {
        msgs.pop();
      }
      return { ...session, messages: msgs };
    }));

    // Re-submit the last user message
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
    <div className="h-screen flex flex-col overflow-hidden bg-cerberus-bg page-transition">
      {/* Floating particles background */}
      <FloatingParticles />

      {/* Grid overlay */}
      <div className="fixed inset-0 grid-overlay pointer-events-none opacity-30 z-0" />

      {/* ===== HEADER ===== */}
      <header className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-cerberus-border bg-cerberus-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-cerberus-text-dim hover:text-cerberus-text hover:bg-cerberus-card"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cerberus-crimson to-cerberus-gold flex items-center justify-center">
              <span className="text-base">🐺</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide text-cerberus-text">
                CERBERUS AI
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 cerberus-pulse" />
                <span className="text-[10px] text-emerald-400/80">Sistem Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current agent info */}
        <div className="hidden sm:flex items-center gap-2">
          <AgentAvatar agent={currentAgentForHeader} size="sm" />
          <div className="text-right">
            <p className="text-xs font-medium text-cerberus-text">{currentAgentForHeader.name}</p>
            <p className="text-[10px] text-cerberus-text-dim">{currentAgentForHeader.role}</p>
          </div>
        </div>

        {/* Clear chat / New chat */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-cerberus-text-dim hover:text-cerberus-crimson hover:bg-cerberus-card"
            onClick={createNewSession}
            title="Obrolan baru"
          >
            <Plus size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-cerberus-text-dim hover:text-cerberus-crimson hover:bg-cerberus-card"
            onClick={() => {
              if (activeSessionId) {
                setSessions(prev => prev.map(s =>
                  s.id === activeSessionId ? { ...s, messages: [] } : s
                ));
              }
              inputRef.current?.focus();
            }}
            title="Bersihkan chat"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex overflow-hidden relative z-10">
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
                  x: sidebarOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1024) ? -280 : 0,
                }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={cn(
                  'w-[280px] flex-shrink-0 border-r border-cerberus-border bg-cerberus-surface/90 backdrop-blur-md flex flex-col z-30',
                  'lg:translate-x-0 lg:relative lg:z-0',
                  !sidebarOpen && 'hidden lg:flex'
                )}
              >
                {/* Sidebar: New Chat button */}
                <div className="p-3 border-b border-cerberus-border">
                  <button
                    onClick={createNewSession}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-cerberus-crimson/30 bg-cerberus-crimson/10 text-cerberus-crimson hover:bg-cerberus-crimson/20 transition-all text-xs font-medium"
                  >
                    <Plus size={14} />
                    Obrolan Baru
                  </button>
                </div>

                {/* Session list */}
                {sessions.length > 0 && (
                  <div className="border-b border-cerberus-border">
                    <div className="px-4 py-2">
                      <h3 className="text-[10px] font-semibold tracking-wider text-cerberus-text-dim uppercase">
                        Riwayat Obrolan
                      </h3>
                    </div>
                    <ScrollArea className="max-h-48 cerberus-scrollbar-slim">
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
                            <MessageSquare size={13} className="text-cerberus-text-dim flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-cerberus-text truncate">
                                {session.title}
                              </p>
                              <p className="text-[9px] text-cerberus-text-dim flex items-center gap-1">
                                <Clock size={8} />
                                {new Date(session.createdAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                                {' · '}
                                {session.messages.length} pesan
                              </p>
                            </div>
                            <button
                              onClick={(e) => deleteSession(session.id, e)}
                              className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 rounded text-cerberus-text-dim hover:text-cerberus-crimson transition-all"
                              style={{ opacity: activeSessionId === session.id ? 0.6 : 0 }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = activeSessionId === session.id ? '0.6' : '0')}
                            >
                              <Trash2 size={11} />
                            </button>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Agent list */}
                <div className="p-3 border-b border-cerberus-border">
                  <h2 className="text-xs font-semibold tracking-wider text-cerberus-gold uppercase mb-1">
                    Agent Cerberus
                  </h2>
                  <p className="text-[10px] text-cerberus-text-dim">
                    Pilih agent atau biarkan sistem memilih otomatis
                  </p>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {agents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => selectAgent(agent)}
                        className={cn(
                          'agent-item w-full flex items-center gap-3 p-3 rounded-xl border border-transparent text-left transition-all',
                          activeAgent.id === agent.id && 'active'
                        )}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 border"
                          style={{
                            backgroundColor: `${agent.color}15`,
                            borderColor: `${agent.color}30`,
                          }}
                        >
                          {agent.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-cerberus-text truncate">
                            {agent.name}
                          </p>
                          <p className="text-[10px] text-cerberus-text-dim truncate">
                            {agent.role}
                          </p>
                        </div>
                        {activeAgent.id === agent.id && (
                          <ChevronRight size={14} className="text-cerberus-crimson flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>

                {/* Sidebar footer */}
                <div className="p-3 border-t border-cerberus-border">
                  <div className="flex items-center gap-2 px-2">
                    <AlertTriangle size={12} className="text-cerberus-gold" />
                    <p className="text-[10px] text-cerberus-text-dim">
                      Hanya untuk riset keamanan edukatif
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
            className="flex-1 overflow-y-auto cerberus-scrollbar"
          >
            {messages.length === 0 ? (
              /* ===== WELCOME SCREEN ===== */
              <div className="h-full flex items-center justify-center p-4">
                <div className="text-center max-w-lg space-y-8">
                  {/* Cerberus Logo */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="space-y-4"
                  >
                    <div className="relative inline-block">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cerberus-crimson via-cerberus-purple to-cerberus-gold flex items-center justify-center mx-auto">
                        <span className="text-4xl">🐺</span>
                      </div>
                      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-cerberus-crimson/20 via-cerberus-purple/20 to-cerberus-gold/20 blur-xl -z-10" />
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-cerberus-text welcome-glow">
                        Cerberus AI
                      </h2>
                      <p className="text-sm text-cerberus-text-dim mt-1">
                        Multi-Agent Cybersecurity System
                      </p>
                    </div>

                    {/* Version badge */}
                    <div className="flex items-center justify-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cerberus-crimson/15 text-cerberus-crimson border border-cerberus-crimson/25">
                        v2.1 Phoenix
                      </span>
                      <span className="text-[10px] text-cerberus-text-dim">
                        Powered by Mistral AI
                      </span>
                    </div>

                    {/* Stats */}
                    <p className="text-[11px] text-cerberus-text-dim">
                      6 Agents • 5 Models • Streaming
                    </p>
                  </motion.div>

                  {/* Description */}
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-xs text-cerberus-text-dim leading-relaxed"
                  >
                    Sistem keamanan siber berbasis AI dengan 6 agent spesialis.
                    Ketik pesan Anda atau gunakan perintah cepat di bawah untuk memulai.
                  </motion.p>

                  {/* Quick Commands */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                  >
                    {QUICK_COMMANDS.map((cmd) => (
                      <button
                        key={cmd.label}
                        onClick={() => handleQuickCommand(cmd.prefix)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-cerberus-border bg-cerberus-card/50 hover:bg-cerberus-card hover:border-cerberus-crimson/30 transition-all text-left group"
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                          style={{ backgroundColor: `${cmd.color}15`, color: cmd.color }}
                        >
                          {cmd.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-cerberus-text group-hover:text-cerberus-gold transition-colors">
                            {cmd.label}
                          </p>
                          <p className="text-[10px] text-cerberus-text-dim truncate">
                            {cmd.prefix}...
                          </p>
                        </div>
                      </button>
                    ))}
                  </motion.div>

                  {/* Agents preview */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                    className="flex items-center justify-center gap-3"
                  >
                    {DEFAULT_AGENTS.map((agent, i) => (
                      <motion.div
                        key={agent.id}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.8 + i * 0.1 }}
                        className="flex flex-col items-center gap-1"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border transition-transform hover:scale-110 cursor-pointer"
                          style={{
                            backgroundColor: `${agent.color}12`,
                            borderColor: `${agent.color}25`,
                          }}
                          onClick={() => selectAgent(agent)}
                          title={agent.name}
                        >
                          {agent.emoji}
                        </div>
                        <span className="text-[9px] text-cerberus-text-dim max-w-[60px] text-center truncate">
                          {agent.name.split(' ')[0]}
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
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={cn(
                        'flex gap-3',
                        msg.role === 'user' && 'flex-row-reverse'
                      )}
                    >
                      {/* Avatar */}
                      {msg.role === 'user' ? (
                        <div className="w-8 h-8 rounded-lg bg-cerberus-card border border-cerberus-border flex items-center justify-center flex-shrink-0">
                          <Bot size={16} className="text-cerberus-text-dim" />
                        </div>
                      ) : (
                        <AgentAvatar agent={msg.agent} size="md" />
                      )}

                      {/* Message bubble */}
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-4 py-3 border message-bubble relative',
                          msg.role === 'user'
                            ? 'bg-cerberus-crimson/10 border-cerberus-crimson/20 rounded-tr-sm'
                            : 'bg-cerberus-card border-cerberus-border rounded-tl-sm',
                          msg.role === 'system' && 'bg-cerberus-gold/5 border-cerberus-gold/20'
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

                        {/* Message content */}
                        {msg.role === 'assistant' || msg.role === 'system' ? (
                          <MessageContent content={msg.content} isStreaming={msg.isStreaming} />
                        ) : (
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        )}

                        {/* Message actions for assistant messages */}
                        {msg.role === 'assistant' && !msg.isStreaming && msg.content && (
                          <div className="message-actions flex items-center gap-1 mt-2">
                            <button
                              onClick={() => handleCopyMessage(msg.content)}
                              className="flex items-center gap-1 px-1.5 py-1 rounded-md text-cerberus-text-dim hover:text-cerberus-text hover:bg-cerberus-surface transition-all text-[10px]"
                              title="Salin pesan"
                            >
                              <Copy size={11} />
                              Salin
                            </button>
                            {msg.id === messages[messages.length - 1]?.id && !isLoading && (
                              <button
                                onClick={handleRegenerate}
                                className="flex items-center gap-1 px-1.5 py-1 rounded-md text-cerberus-text-dim hover:text-cerberus-text hover:bg-cerberus-surface transition-all text-[10px]"
                                title="Regenerasi respons"
                              >
                                <RefreshCw size={11} />
                                Regenerasi
                              </button>
                            )}
                          </div>
                        )}

                        {/* Metrics bar */}
                        {msg.role === 'assistant' && !msg.isStreaming && (msg.model || msg.responseTimeMs || msg.tokens) && (
                          <div className="metrics-bar mt-2 pt-1 border-t border-cerberus-border/50">
                            {msg.model && (
                              <span className="metric-badge">{msg.model}</span>
                            )}
                            {msg.responseTimeMs && (
                              <span>⏱ {formatResponseTime(msg.responseTimeMs)}</span>
                            )}
                            {msg.tokens && Number(msg.tokens) > 0 && (
                              <span>📝 ~{msg.tokens} tokens</span>
                            )}
                          </div>
                        )}

                        {/* Timestamp */}
                        <p className="text-[10px] text-cerberus-text-dim mt-1.5">
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
          <div className="border-t border-cerberus-border bg-cerberus-surface/80 backdrop-blur-md p-3">
            <div className="max-w-3xl mx-auto space-y-2">
              {/* Quick commands (when messages exist) */}
              {messages.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {QUICK_COMMANDS.map((cmd) => (
                    <button
                      key={cmd.label}
                      onClick={() => handleQuickCommand(cmd.prefix)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-cerberus-border bg-cerberus-card/50 hover:bg-cerberus-card hover:border-cerberus-crimson/20 transition-all whitespace-nowrap flex-shrink-0"
                    >
                      <span style={{ color: cmd.color }}>{cmd.icon}</span>
                      <span className="text-[10px] text-cerberus-text-dim">{cmd.label}</span>
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
                        backgroundColor: `${activeAgent.color}12`,
                        borderColor: `${activeAgent.color}25`,
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
                    placeholder={`Kirim pesan ke ${activeAgent.name}...`}
                    disabled={isLoading}
                    rows={1}
                    className="w-full resize-none rounded-xl border border-cerberus-border bg-cerberus-card text-cerberus-text placeholder:text-cerberus-text-dim pl-11 pr-10 py-3 text-sm input-glow focus:outline-none disabled:opacity-50 transition-all min-h-[44px]"
                    style={{
                      maxHeight: '150px',
                    }}
                  />
                  {/* Character count & model indicator */}
                  <div className="absolute right-3 bottom-3 flex flex-col items-end gap-0.5">
                    {inputValue.length > 500 && (
                      <span className={cn(
                        'text-[9px]',
                        inputValue.length > 9000 ? 'text-cerberus-crimson' : 'text-cerberus-text-dim'
                      )}>
                        {inputValue.length}/10000
                      </span>
                    )}
                    <span className="text-[9px] text-cerberus-text-dim opacity-50">
                      {activeAgent.model || 'devstral-small-2507'}
                    </span>
                  </div>
                </div>

                {/* Send / Stop button */}
                {isLoading ? (
                  <Button
                    onClick={stopGeneration}
                    className="h-[44px] w-[44px] rounded-xl bg-cerberus-gold/20 hover:bg-cerberus-gold/30 text-cerberus-gold border border-cerberus-gold/30 flex-shrink-0 transition-all"
                  >
                    <Square size={18} />
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSubmit()}
                    disabled={!inputValue.trim()}
                    className="h-[44px] w-[44px] rounded-xl bg-cerberus-crimson hover:bg-cerberus-crimson/80 text-white flex-shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      boxShadow: inputValue.trim() ? '0 0 20px rgba(220, 20, 60, 0.3)' : 'none',
                    }}
                  >
                    <Send size={18} />
                  </Button>
                )}
              </div>

              {/* Footer hint */}
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <Zap size={10} className="text-cerberus-text-dim" />
                <p className="text-[10px] text-cerberus-text-dim">
                  Tekan <kbd className="px-1 py-0.5 rounded bg-cerberus-card border border-cerberus-border text-[9px]">Enter</kbd> untuk mengirim, <kbd className="px-1 py-0.5 rounded bg-cerberus-card border border-cerberus-border text-[9px]">Shift+Enter</kbd> untuk baris baru
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
