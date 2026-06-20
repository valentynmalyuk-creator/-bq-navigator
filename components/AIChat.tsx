"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Copy, Check, Loader2, Sparkles, Trash2, Zap, Plus, MessageSquare, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import type { Components } from "react-markdown";

// ─── Custom Prism theme (warm dark, matches app palette) ────────────────────

const sqlTheme: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': {
    color: "#e2dfd8",
    background: "none",
    fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
    fontSize: "12px",
    lineHeight: "1.7",
  },
  'pre[class*="language-"]': {
    color: "#e2dfd8",
    background: "#0f0e0c",
    padding: "1rem 1.25rem",
    overflow: "auto",
    borderRadius: "0",
  },
  comment: { color: "#6b6860", fontStyle: "italic" },
  punctuation: { color: "#8a8880" },
  property: { color: "#a78bfa" },
  tag: { color: "#a78bfa" },
  boolean: { color: "#f59e0b" },
  number: { color: "#f59e0b" },
  constant: { color: "#f59e0b" },
  symbol: { color: "#f59e0b" },
  keyword: { color: "#7dd3fc", fontWeight: "600" },
  selector: { color: "#86efac" },
  "attr-name": { color: "#86efac" },
  string: { color: "#86efac" },
  char: { color: "#86efac" },
  builtin: { color: "#86efac" },
  "class-name": { color: "#fde68a" },
  function: { color: "#c4b5fd" },
  regex: { color: "#fca5a5" },
  variable: { color: "#e2dfd8" },
  operator: { color: "#94a3b8" },
  "attr-value": { color: "#86efac" },
  deleted: { color: "#fca5a5" },
  inserted: { color: "#86efac" },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

const STORAGE_KEY = "bq-conversations";

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch { return []; }
}

function saveConversations(convos: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convos));
}

function newConversation(): Conversation {
  return { id: crypto.randomUUID(), title: "New chat", messages: [], createdAt: Date.now() };
}

function derivedTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New chat";
  return first.content.slice(0, 42) + (first.content.length > 42 ? "…" : "");
}

const QUICK_PROMPTS = [
  "Where is user_id stored across tables?",
  "How to calculate daily active users?",
  "Which tables relate to streaming?",
  "Write a DAU query for the last 30 days",
];

// ─── Copy button ─────────────────────────────────────────────────────────────

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
    >
      {copied ? <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied</span></> : <><Copy className="w-3 h-3" />Copy</>}
    </button>
  );
}

// ─── Markdown components ─────────────────────────────────────────────────────

function makeMarkdownComponents(): Components {
  return {
    // Code blocks with syntax highlighting
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className ?? "");
      const isBlock = !!match || String(children).includes("\n");
      const codeStr = String(children).replace(/\n$/, "");
      const lang = match?.[1] ?? "sql";

      if (!isBlock) {
        return (
          <code
            className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-zinc-800 text-violet-300 border border-zinc-700"
            {...props}
          >
            {children}
          </code>
        );
      }

      return (
        <div className="my-4 rounded-xl overflow-hidden border border-zinc-800">
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{lang}</span>
            <CopyCode code={codeStr} />
          </div>
          <SyntaxHighlighter
            style={sqlTheme}
            language={lang}
            PreTag="div"
            customStyle={{ margin: 0, borderRadius: 0, background: "#0f0e0c" }}
            codeTagProps={{ style: { fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace", fontSize: "12px" } }}
          >
            {codeStr}
          </SyntaxHighlighter>
        </div>
      );
    },

    // Headings
    h1: ({ children }) => <h1 className="text-base font-semibold text-zinc-100 mt-5 mb-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-sm font-semibold text-zinc-200 mt-4 mb-1.5">{children}</h2>,
    h3: ({ children }) => <h3 className="text-sm font-medium text-zinc-300 mt-3 mb-1">{children}</h3>,

    // Paragraph
    p: ({ children }) => <p className="leading-relaxed mb-3 last:mb-0">{children}</p>,

    // Lists
    ul: ({ children }) => <ul className="space-y-1 mb-3 ml-1">{children}</ul>,
    ol: ({ children }) => <ol className="space-y-1 mb-3 ml-1 list-decimal list-inside">{children}</ol>,
    li: ({ children }) => (
      <li className="flex items-start gap-2 text-zinc-300">
        <span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-600 shrink-0" />
        <span>{children}</span>
      </li>
    ),

    // Strong / em
    strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
    em: ({ children }) => <em className="italic text-zinc-400">{children}</em>,

    // Blockquote
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-violet-500/40 pl-4 my-3 text-zinc-400 italic">{children}</blockquote>
    ),

    // Horizontal rule
    hr: () => <hr className="border-zinc-800 my-4" />,

    // Table
    table: ({ children }) => (
      <div className="overflow-x-auto my-4 rounded-lg border border-zinc-800">
        <table className="w-full text-xs">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-zinc-900 border-b border-zinc-800">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-zinc-800/60">{children}</tbody>,
    th: ({ children }) => <th className="text-left px-3 py-2 text-zinc-400 font-medium uppercase tracking-wide text-[10px]">{children}</th>,
    td: ({ children }) => <td className="px-3 py-2 text-zinc-300 font-mono text-[11px]">{children}</td>,
  };
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const mdComponents = makeMarkdownComponents();

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-gradient-to-br from-violet-600 to-purple-700 text-white text-sm shadow-lg shadow-violet-900/20 leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
      </div>
      <div className="flex-1 min-w-0 text-sm text-zinc-300">
        {message.content === "" ? (
          <span className="inline-block w-1.5 h-4 bg-violet-400 animate-pulse rounded-sm" />
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AIChat({ schemaContext, tableCount }: { schemaContext: string; tableCount: number }) {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const loaded = loadConversations();
    return loaded.length ? loaded : [newConversation()];
  });
  const [activeId, setActiveId] = useState<string>(() => {
    const loaded = loadConversations();
    return loaded.length ? loaded[0].id : "";
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];

  useEffect(() => { saveConversations(conversations); }, [conversations]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.messages]);

  function createNew() {
    const c = newConversation();
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
    setInput("");
  }

  function deleteConversation(id: string) {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) {
        const fresh = newConversation();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text.trim() };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "" };
    const currentMessages = [...(active?.messages ?? []), userMsg];

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, messages: [...c.messages, userMsg, assistantMsg], title: c.messages.length === 0 ? derivedTitle([userMsg]) : c.title }
          : c
      )
    );
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: currentMessages.map((m) => ({ role: m.role, content: m.content })), schemaContext }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeId) return c;
            const msgs = [...c.messages];
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: msgs[msgs.length - 1].content + chunk };
            return { ...c, messages: msgs };
          })
        );
      }
    } catch (err) {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeId) return c;
          const msgs = [...c.messages];
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: `Error: ${err instanceof Error ? err.message : "Request failed"}` };
          return { ...c, messages: msgs };
        })
      );
    } finally {
      setIsStreaming(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  const isEmpty = !active?.messages.length;

  return (
    <div className="flex h-full bg-zinc-950">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-56 shrink-0 flex flex-col border-r border-zinc-800/80 bg-zinc-950">
          <div className="p-2.5 border-b border-zinc-800/60">
            <button
              onClick={createNew}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all",
                  c.id === activeId
                    ? "bg-violet-600/15 border border-violet-500/20 text-white"
                    : "border border-transparent text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
                )}
              >
                <MessageSquare className={cn("w-3 h-3 shrink-0", c.id === activeId ? "text-violet-400" : "text-zinc-600")} />
                <span className="text-xs truncate flex-1">{c.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="p-2.5 border-t border-zinc-800/60">
            <button
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-zinc-600 hover:text-zinc-400 transition-colors w-full"
            >
              <ChevronLeft className="w-3 h-3" />
              Hide sidebar
            </button>
          </div>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!sidebarOpen && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/60">
            <button onClick={() => setSidebarOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
              <MessageSquare className="w-3.5 h-3.5" />
              Chats
            </button>
            <button onClick={createNew} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
            <span className="text-xs text-zinc-600 truncate">{active?.title}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-full gap-7 text-center">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-violet-400" />
                </div>
                <h3 className="text-base font-semibold text-zinc-200">Ask about your schema</h3>
                <p className="text-sm text-zinc-600 mt-1.5">{tableCount} tables · Full BigQuery paths · Ready-to-run SQL</p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-md w-full">
                {QUICK_PROMPTS.map((prompt) => (
                  <button key={prompt} onClick={() => sendMessage(prompt)} className="px-3 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-left text-xs text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800/80 transition-all">
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {active?.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-zinc-800/80 p-4 bg-zinc-950">
          <div className="flex items-end gap-2.5 max-w-3xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about tables, columns, or request a SQL query…"
                rows={1}
                disabled={isStreaming}
                className={cn(
                  "w-full resize-none rounded-xl border border-zinc-700/60 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600",
                  "focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20",
                  "disabled:opacity-50 max-h-40 leading-relaxed transition-all"
                )}
                style={{ height: "auto" }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 160) + "px";
                }}
              />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
            >
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-zinc-700 text-center mt-2">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
