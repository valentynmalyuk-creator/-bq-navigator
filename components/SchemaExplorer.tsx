"use client";

import { useState, useMemo } from "react";
import { Search, ChevronRight, ChevronDown, Copy, Check } from "lucide-react";
import type { FullSchema, TableSchema, TableField } from "@/lib/schema";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<string, string> = {
  STRING: "text-green-400 bg-green-950 border-green-900",
  BYTES: "text-green-400 bg-green-950 border-green-900",
  INTEGER: "text-blue-400 bg-blue-950 border-blue-900",
  INT64: "text-blue-400 bg-blue-950 border-blue-900",
  FLOAT: "text-purple-400 bg-purple-950 border-purple-900",
  FLOAT64: "text-purple-400 bg-purple-950 border-purple-900",
  NUMERIC: "text-purple-400 bg-purple-950 border-purple-900",
  BIGNUMERIC: "text-purple-400 bg-purple-950 border-purple-900",
  BOOLEAN: "text-yellow-400 bg-yellow-950 border-yellow-900",
  BOOL: "text-yellow-400 bg-yellow-950 border-yellow-900",
  TIMESTAMP: "text-orange-400 bg-orange-950 border-orange-900",
  DATE: "text-orange-400 bg-orange-950 border-orange-900",
  TIME: "text-orange-400 bg-orange-950 border-orange-900",
  DATETIME: "text-orange-400 bg-orange-950 border-orange-900",
  RECORD: "text-pink-400 bg-pink-950 border-pink-900",
  STRUCT: "text-pink-400 bg-pink-950 border-pink-900",
  JSON: "text-cyan-400 bg-cyan-950 border-cyan-900",
  GEOGRAPHY: "text-teal-400 bg-teal-950 border-teal-900",
};

function typeBadge(type: string) {
  return cn(
    "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono border",
    TYPE_STYLES[type] ?? "text-gray-400 bg-gray-800 border-gray-700"
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
        "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
        copied
          ? "text-green-400 bg-green-950"
          : "text-gray-400 hover:text-white hover:bg-gray-800",
        className
      )}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function generateSampleSQL(table: TableSchema): string {
  const cols = table.fields
    .slice(0, 10)
    .map((f) => `  ${f.name}`)
    .join(",\n");
  return `SELECT\n${cols}\nFROM \`${table.fullPath}\`\nLIMIT 100;`;
}

function TableDetail({ table }: { table: TableSchema }) {
  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Path */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Full path</p>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-900 border border-gray-800">
          <code className="flex-1 text-sm font-mono text-blue-300 break-all">
            {table.fullPath}
          </code>
          <CopyButton text={table.fullPath} className="shrink-0" />
        </div>
      </div>

      {/* Columns */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          Columns ({table.fields.length})
        </p>
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-2.5 font-medium">Name</th>
                <th className="text-left px-4 py-2.5 font-medium">Type</th>
                <th className="text-left px-4 py-2.5 font-medium">Mode</th>
                <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Description</th>
                <th className="px-4 py-2.5 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {table.fields.map((field) => (
                <tr key={field.name} className="hover:bg-gray-900/50 group">
                  <td className="px-4 py-2.5 font-mono text-gray-200">{field.name}</td>
                  <td className="px-4 py-2.5">
                    <span className={typeBadge(field.type)}>{field.type}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{field.mode}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs hidden md:table-cell">
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

      {/* Sample SQL */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Sample query</p>
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
            <span className="text-xs text-gray-500 font-mono">sql</span>
            <CopyButton text={generateSampleSQL(table)} />
          </div>
          <pre className="p-4 bg-gray-950 overflow-x-auto text-sm font-mono text-gray-300">
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
          "flex items-center gap-2 px-3 py-2 cursor-pointer rounded-md transition-colors",
          isSelected
            ? "bg-blue-600/20 text-white"
            : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
        )}
        onClick={onClick}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="p-0.5 rounded hover:bg-gray-700"
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
        <span className="font-mono text-sm truncate flex-1">{table.tableId}</span>
        <span className="text-xs text-gray-600 shrink-0">{table.fields.length}</span>
      </div>

      {expanded && (
        <div className="ml-7 mt-0.5 space-y-0.5 pb-1">
          {table.fields.map((field: TableField) => (
            <div
              key={field.name}
              className="flex items-center gap-2 px-2 py-1 rounded text-xs"
            >
              <span className="font-mono text-gray-400 truncate">{field.name}</span>
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
  const [selectedTable, setSelectedTable] = useState<TableSchema | null>(
    schema.tables[0] ?? null
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return schema.tables;
    return schema.tables.filter(
      (t) =>
        t.tableId.toLowerCase().includes(q) ||
        t.fields.some((f) => f.name.toLowerCase().includes(q))
    );
  }, [schema, search]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 shrink-0 flex flex-col border-r border-gray-800 bg-gray-950">
        <div className="p-3 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tables or columns…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-gray-900 border border-gray-800 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {search && (
            <p className="mt-2 text-xs text-gray-600">
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
            <p className="text-sm text-gray-600 text-center py-8">No matches</p>
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-hidden">
        {selectedTable ? (
          <TableDetail table={selectedTable} />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-600 text-sm">
            Select a table to explore
          </div>
        )}
      </div>
    </div>
  );
}
