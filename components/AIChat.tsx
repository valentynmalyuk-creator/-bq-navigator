"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Copy, Check, Loader2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "Where is user_id stored across tables?",
  "How to calculate daily active users?",
  "Which tables are related to streaming?",
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
    <div className="my-3 rounded-lg overflow-hidden border border-gray-800">
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-900 border-b border-gray-800">
        <span className="text-xs font-mono text-gray-500">{lang || "sql"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
        >
          {copied ? (
            <><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">Copied</span></>
          ) : (
            <><Copy className="w-3 h-3" />Copy</>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto bg-gray-950 text-sm font-mono text-gray-300 leading-relaxed">
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
    if (match.index > last) {
      segments.push({ type: "text", content: content.slice(last, match.index), lang: "" });
    }
    segments.push({ type: "code", content: match[2] ?? "", lang: match[1] ?? "sql" });
    last = regex.lastIndex;
  }
  if (last < content.length) {
    segments.push({ type: "text", content: content.slice(last), lang: "" });
  }
  return segments;
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-blue-600 text-white text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  const segments = parseContent(message.content);

  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center shrink-0 mt-0.5">
        <MessageSquare className="w-3.5 h-3.5 text-gray-300" />
      </div>
      <div className="flex-1 min-w-0 text-sm text-gray-200 leading-relaxed">
        {segments.map((seg, i) =>
          seg.type === "code" ? (
            <CodeBlock key={i} code={seg.content} lang={seg.lang} />
          ) : (
            <span key={i} className="whitespace-pre-wrap">{seg.content}</span>
          )
        )}
        {message.content === "" && (
          <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse rounded-sm ml-0.5" />
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
    };

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);

    try {
      const apiMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, schemaContext }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = {
            ...msgs[msgs.length - 1],
            content: msgs[msgs.length - 1].content + chunk,
          };
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div>
              <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-base font-medium text-gray-300">Ask about your schema</h3>
              <p className="text-sm text-gray-600 mt-1">
                {tableCount} tables loaded · Full paths · Ready-to-run SQL
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 max-w-md w-full">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="px-3 py-2.5 rounded-lg border border-gray-800 bg-gray-900 text-left text-xs text-gray-400 hover:text-gray-200 hover:border-gray-700 hover:bg-gray-800 transition-colors"
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
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
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
                "w-full resize-none rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 pr-12 text-sm text-gray-200 placeholder-gray-600",
                "focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
                "disabled:opacity-50 max-h-40 leading-relaxed"
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
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-700 text-center mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
