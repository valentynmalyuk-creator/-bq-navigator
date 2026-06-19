"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import dynamic from "next/dynamic";
import { Database, GitBranch, MessageSquare, RefreshCw, LogOut, Zap } from "lucide-react";
import type { FullSchema } from "@/lib/schema";
import { schemaToAIContext } from "@/lib/schema";
import SchemaExplorer from "@/components/SchemaExplorer";
import AIChat from "@/components/AIChat";

const SchemaGraph = dynamic(() => import("@/components/SchemaGraph"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
      Loading graph…
    </div>
  ),
});

type Tab = "schema" | "graph" | "chat";

interface User {
  id: string;
  email: string;
  name: string | null;
}

const TABS = [
  { id: "schema" as Tab, label: "Schema Explorer", icon: Database },
  { id: "graph" as Tab, label: "Schema Graph", icon: GitBranch },
  { id: "chat" as Tab, label: "AI Chat", icon: MessageSquare },
];

export default function DashboardClient({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<Tab>("schema");
  const [schema, setSchema] = useState<FullSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchema = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/schema");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: FullSchema = await res.json();
      setSchema(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load schema");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchema(); }, [fetchSchema]);

  const schemaContext = schema ? schemaToAIContext(schema) : "";
  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 h-13 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-sm shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-md shadow-violet-900/30">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-violet-300 to-purple-400 bg-clip-text text-transparent">
            BQ Navigator
          </span>
        </div>

        <div className="h-4 w-px bg-zinc-800" />

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">
          <Database className="w-3 h-3 text-violet-400" />
          liti-74413.hily_airflow
          {schema && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-sans text-[10px]">
              {schema.tables.length} tables
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={fetchSchema}
            disabled={loading}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            title="Refresh schema"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <div className="flex items-center gap-2 pl-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[11px] font-bold text-white shadow-sm">
              {initials}
            </div>
            <span className="text-xs text-zinc-500 hidden sm:block">{user.email}</span>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Sign out</span>
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-4 border-b border-zinc-800/80 bg-zinc-950 shrink-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium border-b-2 transition-all ${
              activeTab === id
                ? "border-violet-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${activeTab === id ? "text-violet-400" : ""}`} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-violet-400 animate-spin" />
              </div>
              <p className="text-sm text-zinc-500">Loading schema…</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-4 max-w-sm text-center">
              <p className="text-sm text-red-400">Failed to load schema: {error}</p>
              <button
                onClick={fetchSchema}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-sm text-white hover:from-violet-500 hover:to-purple-500 transition-all"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && schema && (
          <>
            <div className={activeTab === "schema" ? "h-full" : "hidden"}>
              <SchemaExplorer schema={schema} />
            </div>
            <div className={activeTab === "graph" ? "h-full" : "hidden"}>
              <SchemaGraph schema={schema} />
            </div>
            <div className={activeTab === "chat" ? "h-full" : "hidden"}>
              <AIChat schemaContext={schemaContext} tableCount={schema.tables.length} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
