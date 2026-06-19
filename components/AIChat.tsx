"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Copy, Check, Loader2, Sparkles, Trash2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "bq-chat-history";

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
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          {copied
            ? <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied</span></>
            : <><Copy className="w-3 h-3" />Copy</>}
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

export default function AIChat({
  schemaContext,
  tableCount,
}: {
  schemaContext: string;
  tableCount: number;
}) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as Message[]) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messages.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text.trim() };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "" };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);

    try {
      const apiMessages = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, schemaContext }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: msgs[msgs.length - 1].content + chunk };
          return msgs;
        });
      }
    } catch (err) {
      setMessages((prev) => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = {
          ...msgs[msgs.length - 1],
          content: `Error: ${err instanceof Error ? err.message : "Request failed"}`,
        };
        return msgs;
      });
    } finally {
      setIsStreaming(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {messages.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={clearHistory}
              disabled={isStreaming}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-zinc-600 hover:text-red-400 hover:bg-zinc-900 transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-3 h-3" />
              Clear history
            </button>
          </div>
        )}

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

        {messages.map((msg) => (
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
  );
}
