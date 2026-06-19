"use client";

import { memo, useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import type { FullSchema, TableSchema } from "@/lib/schema";
import { cn } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  STRING: "text-green-400",
  BYTES: "text-green-400",
  INTEGER: "text-blue-400",
  INT64: "text-blue-400",
  FLOAT: "text-purple-400",
  FLOAT64: "text-purple-400",
  NUMERIC: "text-purple-400",
  BOOLEAN: "text-yellow-400",
  BOOL: "text-yellow-400",
  TIMESTAMP: "text-orange-400",
  DATE: "text-orange-400",
  DATETIME: "text-orange-400",
  RECORD: "text-pink-400",
  STRUCT: "text-pink-400",
  JSON: "text-cyan-400",
};

function fieldColor(type: string) {
  return TYPE_COLORS[type] ?? "text-gray-400";
}

const TableNode = memo(function TableNode({
  data,
  selected,
}: {
  data: { table: TableSchema };
  selected: boolean;
}) {
  const { table } = data;
  const visible = table.fields.slice(0, 8);
  const more = table.fields.length - visible.length;

  return (
    <div
      className={cn(
        "rounded-xl border bg-gray-900 w-56 overflow-hidden shadow-xl transition-colors",
        selected ? "border-blue-500" : "border-gray-700"
      )}
    >
      <div className="px-3 py-2.5 bg-gray-800 border-b border-gray-700">
        <p className="text-xs font-mono font-semibold text-white truncate">
          {table.tableId}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{table.fields.length} columns</p>
      </div>

      <div className="px-3 py-2 space-y-1">
        {visible.map((field) => (
          <div key={field.name} className="flex items-center justify-between gap-2 text-xs">
            <span className="font-mono text-gray-300 truncate">{field.name}</span>
            <span className={cn("shrink-0 font-mono text-xs", fieldColor(field.type))}>
              {field.type.slice(0, 7)}
            </span>
          </div>
        ))}
        {more > 0 && (
          <p className="text-xs text-gray-600 pt-1">+{more} more</p>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-blue-500 !border-2 !border-gray-900"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-blue-500 !border-2 !border-gray-900"
      />
    </div>
  );
});

const nodeTypes = { tableNode: TableNode };

const NODE_W = 224;
const NODE_H = 260;
const GAP_X = 80;
const GAP_Y = 60;
const COLS = 5;

function buildGraph(schema: FullSchema): { nodes: Node[]; edges: Edge[] } {
  const tables = schema.tables;
  const tableSet = new Set(tables.map((t) => t.tableId));

  const nodes: Node[] = tables.map((table, i) => ({
    id: table.tableId,
    type: "tableNode",
    position: {
      x: (i % COLS) * (NODE_W + GAP_X),
      y: Math.floor(i / COLS) * (NODE_H + GAP_Y),
    },
    data: { table },
  }));

  const edges: Edge[] = [];
  const seen = new Set<string>();

  for (const table of tables) {
    for (const field of table.fields) {
      if (field.name === "id" || !field.name.endsWith("_id")) continue;

      const base = field.name.slice(0, -3);
      const candidates = [base, base + "s", base + "es", base.replace(/y$/, "ies")];
      const target = candidates.find(
        (c) => tableSet.has(c) && c !== table.tableId
      );
      if (!target) continue;

      const edgeId = `${table.tableId}→${target}:${field.name}`;
      if (seen.has(edgeId)) continue;
      seen.add(edgeId);

      edges.push({
        id: edgeId,
        source: table.tableId,
        target,
        label: field.name,
        type: "smoothstep",
        style: { stroke: "#3b82f6", strokeWidth: 1.5 },
        labelStyle: { fill: "#6b7280", fontSize: 10, fontFamily: "monospace" },
        labelBgStyle: { fill: "#111827", fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
        markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6" },
      });
    }
  }

  return { nodes, edges };
}

export default function SchemaGraph({ schema }: { schema: FullSchema }) {
  const { nodes, edges } = useMemo(() => buildGraph(schema), [schema]);

  return (
    <div className="h-full bg-gray-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={2}
        className="bg-gray-950"
        proOptions={{ hideAttribution: true }}
      >
        <Controls className="[&>button]:bg-gray-800 [&>button]:border-gray-700 [&>button]:text-gray-300 [&>button:hover]:bg-gray-700" />
        <MiniMap
          className="!bg-gray-900 !border-gray-700"
          nodeColor="#1e40af"
          maskColor="rgba(3,7,18,0.7)"
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#1f2937"
        />
      </ReactFlow>
    </div>
  );
}
