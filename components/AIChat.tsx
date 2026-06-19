"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Copy, Check, Loader2, Sparkles, Trash2, Zap, Plus, MessageSquare, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

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
  return first.content.slice(0, 40) + (first.content.length > 40 ? "…" : "");
}

const QUICK_PROMPTS = [
  "Where is user_id stored across tables?",
  "How to calculate daily active users?",
  "Which tables relate to streaming?",
  "Write a DAU query for the last 30 days",
];

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-zinc-800">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">{lang || "sql"}</span>
        <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
          {copied ? <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied</span></> : <><Copy className="w-3 h-3" />Copy</>}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto bg-[#0d0d10] text-xs font-mono text-zinc-300 leading-relaxed">
        <code>{code.trim()}</code>
      </pre>
    </div>
  );
}

function parseContent(content: string) {
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  const segments: Array<{ type: "text" | "code"; content: string; lang: string }> = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > last) segments.push({ type: "text", content: content.slice(last, match.index), lang: "" });
    segments.push({ type: "code", content: match[2] ?? "", lang: match[1] ?? "sql" });
    last = regex.lastIndex;
  }
  if (last < content.length) segments.push({ type: "text", content: content.slice(last), lang: "" });
  return segments;
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-gradient-to-br from-violet-600 to-purple-700 text-white text-sm shadow-lg shadow-violet-900/20">
          {message.content}
        </div>
      </div>
    );
  }
  const segments = parseContent(message.content);
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
      </div>
      <div className="flex-1 min-w-0 text-sm text-zinc-200 leading-relaxed">
        {segments.map((seg, i) =>
          seg.type === "code"
            ? <CodeBlock key={i} code={seg.content} lang={seg.lang} />
            : <span key={i} className="whitespace-pre-wrap">{seg.content}</span>
        )}
        {message.content === "" && (
          <span className="inline-block w-1.5 h-4 bg-violet-400 animate-pulse rounded-sm ml-0.5" />
        )}
      </div>
    </div>
  );
}

export default function AIChat({ schemaContext, tableCount }: { schemaContext: string; tableCount: number }) {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const loaded = loadConversations();
    return loaded.length ? loaded : [newConversation()];
  });
  const [activeId, setActiveId] = useState<string>(() => {
    const loaded = loadConversations();
    return loaded.length ? loaded[0].id : conversations[0]?.id ?? "";
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages]);

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

  function updateActive(updater: (c: Conversation) => Conversation) {
    setConversations((prev) => prev.map((c) => (c.id === activeId ? updater(c) : c)));
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text.trim() };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "" };

    updateActive((c) => ({
      ...c,
      messages: [...c.messages, userMsg, assistantMsg],
      title: c.messages.length === 0 ? derivedTitle([userMsg]) : c.title,
    }));
    setInput("");
    setIsStreaming(true);

    try {
      const currentMessages = [...(active?.messages ?? []), userMsg];
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
          schemaContext,
        }),
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
          msgs[msgs.length - 1] = {
            ...msgs[msgs.length - 1],
            content: `Error: ${err instanceof Error ? err.message : "Request failed"}`,
          };
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

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar when sidebar is hidden */}
        {!sidebarOpen && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/60">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chats
            </button>
            <button
              onClick={createNew}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
            <span className="text-xs text-zinc-600 truncate">{active?.title}</span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-full gap-7 text-center">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/20 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-900/10">
                  <Zap className="w-6 h-6 text-violet-400" />
                </div>
                <h3 className="text-base font-semibold text-zinc-200">Ask about your schema</h3>
                <p className="text-sm text-zinc-600 mt-1.5">
                  {tableCount} tables · Full BigQuery paths · Ready-to-run SQL
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-md w-full">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="px-3 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-left text-xs text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800/80 transition-all"
                  >
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

        {/* Input */}
        <div className="border-t border-zinc-800/80 p-4 bg-zinc-950">
          <div className="flex items-end gap-2.5 max-w-4xl mx-auto">
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
          <p className="text-[10px] text-zinc-700 text-center mt-2">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
