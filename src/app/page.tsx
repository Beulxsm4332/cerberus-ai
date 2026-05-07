'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
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
  timestamp: number;
}

interface AgentInfo {
  id: string;
  name: string;
  emoji: string;
  color: string;
  role: string;
  description: string;
}

interface QuickCommand {
  icon: React.ReactNode;
  label: string;
  prefix: string;
  color: string;
}

// ===== CONSTANTS =====
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

// ===== TYPING INDICATOR =====
function TypingIndicator({ agent }: { agent?: AgentInfo }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-start gap-3 px-4 py-2"
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
        style={{ backgroundColor: `${agent?.color || '#DC143C'}20` }}
      >
        {agent?.emoji || '🐺'}
      </div>
      <div className="bg-cerberus-card rounded-2xl rounded-tl-sm px-4 py-3 border border-cerberus-border">
        <div className="flex items-center gap-1.5">
          <div className="typing-dot w-2 h-2 rounded-full bg-cerberus-crimson" />
          <div className="typing-dot w-2 h-2 rounded-full bg-cerberus-crimson" />
          <div className="typing-dot w-2 h-2 rounded-full bg-cerberus-crimson" />
        </div>
      </div>
    </motion.div>
  );
}

// ===== MARKDOWN MESSAGE COMPONENT =====
function MessageContent({ content }: { content: string }) {
  return (
    <div className="message-content text-sm leading-relaxed">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

// ===== AGENT AVATAR =====
function AgentAvatar({ agent, size = 'md' }: { agent?: AgentInfo; size?: 'sm' | 'md' | 'lg' }) {
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentInfo>(DEFAULT_AGENTS[0]);
  const [agents, setAgents] = useState<AgentInfo[]>(DEFAULT_AGENTS);
  const [typingAgent, setTypingAgent] = useState<AgentInfo | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  }, [messages, typingAgent]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Auto resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
  };

  // Handle submit
  const handleSubmit = useCallback(
    async (messageText?: string) => {
      const text = (messageText || inputValue).trim();
      if (!text || isLoading) return;

      setInputValue('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }

      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // Show typing indicator
      setTypingAgent(activeAgent);

      try {
        // Build history for context
        const history = messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            agent: activeAgent.id === 'onyx-overseer' ? undefined : activeAgent.id,
            history,
          }),
        });

        const data = await response.json();

        // If a different agent was routed, update the active agent display
        if (data.agent && data.agent.id !== activeAgent.id) {
          const routedAgent = agents.find((a) => a.id === data.agent.id) || activeAgent;
          setTypingAgent({ ...routedAgent, ...data.agent });
        }

        // Small delay for UX
        await new Promise((resolve) => setTimeout(resolve, 500));

        const assistantMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: data.response || 'Maaf, tidak ada respons dari server.',
          agent: data.agent,
          model: data.model,
          tokens: data.tokens,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch {
        const errorMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'system',
          content: '❌ **Koneksi gagal.** Tidak dapat terhubung ke server. Silakan periksa koneksi internet Anda dan coba lagi.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        setTypingAgent(undefined);
      }
    },
    [inputValue, isLoading, messages, activeAgent, agents]
  );

  // Handle keyboard shortcut
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Clear chat
  const clearChat = () => {
    setMessages([]);
    setActiveAgent(DEFAULT_AGENTS[0]);
    inputRef.current?.focus();
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

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-cerberus-bg">
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

        {/* Clear chat */}
        <Button
          variant="ghost"
          size="icon"
          className="text-cerberus-text-dim hover:text-cerberus-crimson hover:bg-cerberus-card"
          onClick={clearChat}
          title="Bersihkan chat"
        >
          <Trash2 size={16} />
        </Button>
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
                {/* Sidebar header */}
                <div className="p-4 border-b border-cerberus-border">
                  <h2 className="text-xs font-semibold tracking-wider text-cerberus-gold uppercase mb-1">
                    Agent Cerberus
                  </h2>
                  <p className="text-[10px] text-cerberus-text-dim">
                    Pilih agent atau biarkan sistem memilih otomatis
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
                          'max-w-[80%] rounded-2xl px-4 py-3 border',
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
                            {msg.model && (
                              <span className="text-[10px] text-cerberus-text-dim bg-cerberus-surface px-1.5 py-0.5 rounded">
                                {msg.model}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Message content */}
                        {msg.role === 'assistant' || msg.role === 'system' ? (
                          <MessageContent content={msg.content} />
                        ) : (
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        )}

                        {/* Timestamp */}
                        <p className="text-[10px] text-cerberus-text-dim mt-2">
                          {new Date(msg.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Typing indicator */}
                <AnimatePresence>
                  {isLoading && <TypingIndicator agent={typingAgent} />}
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
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={`Kirim pesan ke ${activeAgent.name}...`}
                    disabled={isLoading}
                    rows={1}
                    className="w-full resize-none rounded-xl border border-cerberus-border bg-cerberus-card text-cerberus-text placeholder:text-cerberus-text-dim px-4 py-3 text-sm input-glow focus:outline-none disabled:opacity-50 transition-all min-h-[44px]"
                    style={{
                      maxHeight: '150px',
                    }}
                  />
                </div>
                <Button
                  onClick={() => handleSubmit()}
                  disabled={isLoading || !inputValue.trim()}
                  className="h-[44px] w-[44px] rounded-xl bg-cerberus-crimson hover:bg-cerberus-crimson/80 text-white flex-shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    boxShadow: inputValue.trim() && !isLoading ? '0 0 20px rgba(220, 20, 60, 0.3)' : 'none',
                  }}
                >
                  {isLoading ? (
                    <Sparkles size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </Button>
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
