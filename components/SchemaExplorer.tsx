"use client";

import { useState, useMemo } from "react";
import { Search, ChevronRight, ChevronDown, Copy, Check, Table2 } from "lucide-react";
import type { FullSchema, TableSchema, TableField } from "@/lib/schema";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<string, string> = {
  STRING:     "text-emerald-400 bg-emerald-950/60 border-emerald-900/60",
  BYTES:      "text-emerald-400 bg-emerald-950/60 border-emerald-900/60",
  INTEGER:    "text-blue-400 bg-blue-950/60 border-blue-900/60",
  INT64:      "text-blue-400 bg-blue-950/60 border-blue-900/60",
  FLOAT:      "text-violet-400 bg-violet-950/60 border-violet-900/60",
  FLOAT64:    "text-violet-400 bg-violet-950/60 border-violet-900/60",
  NUMERIC:    "text-violet-400 bg-violet-950/60 border-violet-900/60",
  BIGNUMERIC: "text-violet-400 bg-violet-950/60 border-violet-900/60",
  BOOLEAN:    "text-amber-400 bg-amber-950/60 border-amber-900/60",
  BOOL:       "text-amber-400 bg-amber-950/60 border-amber-900/60",
  TIMESTAMP:  "text-orange-400 bg-orange-950/60 border-orange-900/60",
  DATE:       "text-orange-400 bg-orange-950/60 border-orange-900/60",
  TIME:       "text-orange-400 bg-orange-950/60 border-orange-900/60",
  DATETIME:   "text-orange-400 bg-orange-950/60 border-orange-900/60",
  RECORD:     "text-pink-400 bg-pink-950/60 border-pink-900/60",
  STRUCT:     "text-pink-400 bg-pink-950/60 border-pink-900/60",
  JSON:       "text-cyan-400 bg-cyan-950/60 border-cyan-900/60",
  GEOGRAPHY:  "text-teal-400 bg-teal-950/60 border-teal-900/60",
};

function typeBadge(type: string) {
  return cn(
    "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border tracking-wide",
    TYPE_STYLES[type] ?? "text-zinc-400 bg-zinc-800 border-zinc-700"
  );
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all",
        copied
          ? "text-emerald-400 bg-emerald-950/60 border border-emerald-900/50"
          : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent",
        className
      )}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function generateSampleSQL(table: TableSchema): string {
  const cols = table.fields.slice(0, 10).map((f) => `  ${f.name}`).join(",\n");
  return `SELECT\n${cols}\nFROM \`${table.fullPath}\`\nLIMIT 100;`;
}

function TableDetail({ table }: { table: TableSchema }) {
  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">Full path</p>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
          <code className="flex-1 text-sm font-mono text-violet-300 break-all">
            {table.fullPath}
          </code>
          <CopyButton text={table.fullPath} className="shrink-0" />
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
          Columns ({table.fields.length})
        </p>
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900/80 text-[10px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
                <th className="text-left px-4 py-2.5 font-semibold">Name</th>
                <th className="text-left px-4 py-2.5 font-semibold">Type</th>
                <th className="text-left px-4 py-2.5 font-semibold">Mode</th>
                <th className="text-left px-4 py-2.5 font-semibold hidden md:table-cell">Description</th>
                <th className="px-4 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {table.fields.map((field) => (
                <tr key={field.name} className="hover:bg-zinc-900/40 group transition-colors">
                  <td className="px-4 py-2.5 font-mono text-zinc-200 text-xs">{field.name}</td>
                  <td className="px-4 py-2.5">
                    <span className={typeBadge(field.type)}>{field.type}</span>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600 text-xs">{field.mode}</td>
                  <td className="px-4 py-2.5 text-zinc-600 text-xs hidden md:table-cell">
                    {field.description ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <CopyButton
                      text={`${table.fullPath}.${field.name}`}
                      className="opacity-0 group-hover:opacity-100"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">Sample query</p>
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/80 border-b border-zinc-800">
            <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">sql</span>
            <CopyButton text={generateSampleSQL(table)} />
          </div>
          <pre className="p-4 bg-zinc-950 overflow-x-auto text-xs font-mono text-zinc-300 leading-relaxed">
            {generateSampleSQL(table)}
          </pre>
        </div>
      </div>
    </div>
  );
}

function TableRow({
  table,
  isSelected,
  onClick,
}: {
  table: TableSchema;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-2.5 py-1.5 cursor-pointer rounded-lg transition-all",
          isSelected
            ? "bg-violet-600/15 text-white border border-violet-500/20"
            : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 border border-transparent"
        )}
        onClick={onClick}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className="p-0.5 rounded hover:bg-zinc-700/60 transition-colors"
        >
          {expanded
            ? <ChevronDown className="w-3 h-3" />
            : <ChevronRight className="w-3 h-3" />}
        </button>
        <Table2 className={cn("w-3 h-3 shrink-0", isSelected ? "text-violet-400" : "text-zinc-600")} />
        <span className="font-mono text-xs truncate flex-1">{table.tableId}</span>
        <span className="text-[10px] text-zinc-600 shrink-0 tabular-nums">{table.fields.length}</span>
      </div>

      {expanded && (
        <div className="ml-8 mt-0.5 space-y-0.5 pb-1">
          {table.fields.map((field: TableField) => (
            <div key={field.name} className="flex items-center gap-2 px-2 py-1 rounded text-xs">
              <span className="font-mono text-zinc-500 truncate">{field.name}</span>
              <span className={cn("shrink-0", typeBadge(field.type))}>{field.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SchemaExplorer({ schema }: { schema: FullSchema }) {
  const [search, setSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState<TableSchema | null>(schema.tables[0] ?? null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return schema.tables;
    return schema.tables.filter(
      (t) => t.tableId.toLowerCase().includes(q) || t.fields.some((f) => f.name.toLowerCase().includes(q))
    );
  }, [schema, search]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 shrink-0 flex flex-col border-r border-zinc-800/80 bg-zinc-950">
        <div className="p-3 border-b border-zinc-800/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tables or columns…"
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
            />
          </div>
          {search && (
            <p className="mt-2 text-[10px] text-zinc-600 px-0.5">
              {filtered.length} of {schema.tables.length} tables
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filtered.map((table) => (
            <TableRow
              key={table.tableId}
              table={table}
              isSelected={selectedTable?.tableId === table.tableId}
              onClick={() => setSelectedTable(table)}
            />
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-10">No matches found</p>
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-hidden bg-zinc-950">
        {selectedTable ? (
          <TableDetail table={selectedTable} />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-600 text-sm">
            Select a table to explore
          </div>
        )}
      </div>
    </div>
  );
}
