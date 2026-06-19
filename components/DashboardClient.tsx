"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import dynamic from "next/dynamic";
import { Database, GitBranch, MessageSquare, RefreshCw, LogOut } from "lucide-react";
import type { FullSchema } from "@/lib/schema";
import { schemaToAIContext } from "@/lib/schema";
import SchemaExplorer from "@/components/SchemaExplorer";
import AIChat from "@/components/AIChat";

const SchemaGraph = dynamic(() => import("@/components/SchemaGraph"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-gray-500">
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

  useEffect(() => {
    fetchSchema();
  }, [fetchSchema]);

  const schemaContext = schema ? schemaToAIContext(schema) : "";
  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Header */}
      <header className="flex items-center gap-4 px-5 h-14 border-b border-gray-800 shrink-0">
        <span className="text-base font-semibold text-white tracking-tight">BQ Navigator</span>

        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-gray-800 border border-gray-700">
          <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-xs font-mono text-gray-300">liti-74413.hily_airflow</span>
        </div>

        {schema && (
          <span className="text-xs text-gray-500">
            {schema.tables.length} tables
          </span>
        )}

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={fetchSchema}
            disabled={loading}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-40 transition-colors"
            title="Refresh schema"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white">
              {initials}
            </div>
            <span className="text-sm text-gray-400 hidden sm:block">{user.email}</span>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Sign out</span>
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 border-b border-gray-800 bg-gray-950 shrink-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-3 py-2.5 text-sm border-b-2 transition-colors ${
              activeTab === id
                ? "border-blue-500 text-white"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
              <p className="text-sm text-gray-500">Loading schema…</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-4 max-w-sm text-center">
              <p className="text-sm text-red-400">Failed to load schema: {error}</p>
              <button
                onClick={fetchSchema}
                className="px-4 py-2 rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-500 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && schema && (
          <>
            {activeTab === "schema" && <SchemaExplorer schema={schema} />}
            {activeTab === "graph" && <SchemaGraph schema={schema} />}
            {activeTab === "chat" && (
              <AIChat schemaContext={schemaContext} tableCount={schema.tables.length} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
