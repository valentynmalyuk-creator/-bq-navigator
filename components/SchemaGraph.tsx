"use client";

import { memo, useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  ControlButton,
  MiniMap,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { Maximize2 } from "lucide-react";
import type { FullSchema, TableSchema } from "@/lib/schema";
import { cn } from "@/lib/utils";

// ─── Cluster definitions ──────────────────────────────────────────────────────

interface ClusterDef {
  id: string;
  label: string;
  layoutCol: number; // 0 = left, 1 = right
  layoutRow: number;
  bg: string;
  border: string;
  labelColor: string;
  minimapColor: string;
}

const CLUSTERS: ClusterDef[] = [
  { id: "Users",     label: "Users & Accounts",       layoutCol: 0, layoutRow: 0, bg: "#eef2ff", border: "#c7d2fe", labelColor: "#6366f1", minimapColor: "#818cf8" },
  { id: "Streaming", label: "Streaming & Video",      layoutCol: 1, layoutRow: 0, bg: "#f5f3ff", border: "#ddd6fe", labelColor: "#7c3aed", minimapColor: "#a78bfa" },
  { id: "Payments",  label: "Payments",               layoutCol: 0, layoutRow: 1, bg: "#f0fdf4", border: "#bbf7d0", labelColor: "#15803d", minimapColor: "#4ade80" },
  { id: "Social",    label: "Social & Moderation",    layoutCol: 1, layoutRow: 1, bg: "#fff7ed", border: "#fed7aa", labelColor: "#c2410c", minimapColor: "#fb923c" },
  { id: "Analytics", label: "Analytics & Logs",       layoutCol: 0, layoutRow: 2, bg: "#fefce8", border: "#fef08a", labelColor: "#a16207", minimapColor: "#fbbf24" },
  { id: "Marketing", label: "Marketing & Attribution",layoutCol: 1, layoutRow: 2, bg: "#ecfeff", border: "#a5f3fc", labelColor: "#0e7490", minimapColor: "#22d3ee" },
  { id: "Other",     label: "Other",                  layoutCol: 0, layoutRow: 3, bg: "#f9fafb", border: "#e5e7eb", labelColor: "#6b7280", minimapColor: "#9ca3af" },
];

const CLUSTER_BY_ID = Object.fromEntries(CLUSTERS.map((c) => [c.id, c]));

const TABLE_CLUSTER: Record<string, string> = {
  hily_users: "Users", hily_user_profile_data: "Users", hily_user_agent: "Users",
  hily_user_interest: "Users", hily_user_balance_history: "Users",
  hily_gryffindor_customer: "Users", hily_customer_customer_account_binding: "Users",
  hily_customer_customer_account_binding_back_copy: "Users",
  hily_customer_customer_device_binding: "Users", hily_customer_random_ban: "Users",
  hily_customer_special_activated: "Users",

  hily_streamer: "Streaming", hily_streamer_ban: "Streaming",
  hily_streamer_daily_addition_coin_balance_history: "Streaming",
  hily_streamer_payoff_request: "Streaming", hily_streamer_penalty: "Streaming",
  hily_streamer_penalty_data: "Streaming", hily_streamer_photo_stats: "Streaming",
  hily_streamer_referral_invited: "Streaming", hily_streamer_task_history_items: "Streaming",
  hily_streamer_to_user_complaint: "Streaming", hily_streamer_verification_image: "Streaming",
  hily_stream_screenshot: "Streaming", hily_log_live_stream_ended: "Streaming",
  hily_video_call_log: "Streaming", hily_video_call_ping_log: "Streaming",
  hily_video_story: "Streaming", hily_video_story_like: "Streaming",
  hily_video_story_view: "Streaming",

  hily_gryffindor_balance_account: "Payments", hily_gryffindor_balance_account_transaction: "Payments",
  hily_pay_bundles: "Payments", hily_payment_subscription: "Payments",
  hily_payment_transaction: "Payments", hily_solid_gate_card: "Payments",
  hily_partner_costs: "Payments", hily_partner_networks: "Payments", hily_partners: "Payments",

  hily_user_favorites: "Social", hily_user_favorite_request: "Social",
  hily_user_complaints: "Social", hily_users_feedback: "Social",
  hily_blacklist: "Social", hily_complaint: "Social",
  hily_banned_customer_user: "Social", hily_push_notification_log: "Social",

  hily_log_about_validation_log: "Analytics", hily_log_appsflyer_device_log: "Analytics",
  hily_log_complaint_log: "Analytics", hily_log_contact_sharing_detected_log: "Analytics",
  hily_log_login_stats: "Analytics", hily_log_name_validation_log: "Analytics",
  hily_log_remarketing_user: "Analytics", hily_log_tracking_connection_data: "Analytics",
  hily_log_user_ban_logs: "Analytics", hily_log_user_double_check_ban_result: "Analytics",
  hily_log_user_double_check_ban_result_content: "Analytics",
  hily_log_user_partner_log: "Analytics", hily_user_experiment_log: "Analytics",
  hily_experiment: "Analytics",

  hily_apps_install: "Marketing", hily_apps_install_log: "Marketing",
  hily_appsflyer_advertise_account: "Marketing", hily_appsflyer_device_advertise_account_bind: "Marketing",
  hily_ip_geo: "Marketing", hily_ip_geo_user: "Marketing", hily_ip_geo_user_last: "Marketing",
  liti_marketing_user_marketing_data: "Marketing", hily_agency: "Marketing",
  media_storage_image: "Marketing",
};

// ─── Layout constants ─────────────────────────────────────────────────────────

const NODE_W = 210;
const NODE_H_EST = 182;   // estimated average height per table node
const WITHIN_COLS = 3;
const WITHIN_GAP_X = 52;  // generous horizontal spacing between nodes
const WITHIN_GAP_Y = 40;  // generous vertical spacing
const PAD_TOP = 48;        // space for cluster label inside container
const PAD_SIDE = 28;       // left/right padding inside container
const PAD_BOTTOM = 24;
const CLUSTER_GAP_X = 160; // gap between the two columns
const CLUSTER_GAP_Y = 88;  // gap between rows in same column

const CLUSTER_W = 2 * PAD_SIDE + WITHIN_COLS * NODE_W + (WITHIN_COLS - 1) * WITHIN_GAP_X;
// = 56 + 3*210 + 2*52 = 56 + 630 + 104 = 790

function clusterHeight(count: number): number {
  if (count === 0) return 80;
  const rows = Math.ceil(count / WITHIN_COLS);
  return PAD_TOP + rows * NODE_H_EST + (rows - 1) * WITHIN_GAP_Y + PAD_BOTTOM;
}

// ─── Node components ──────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  STRING: "#16a34a", BYTES: "#16a34a",
  INTEGER: "#2563eb", INT64: "#2563eb",
  FLOAT: "#7c3aed", FLOAT64: "#7c3aed", NUMERIC: "#7c3aed", BIGNUMERIC: "#7c3aed",
  BOOLEAN: "#d97706", BOOL: "#d97706",
  TIMESTAMP: "#c2410c", DATE: "#c2410c", TIME: "#c2410c", DATETIME: "#c2410c",
  RECORD: "#9d174d", STRUCT: "#9d174d",
  JSON: "#0e7490", GEOGRAPHY: "#065f46",
};

const TableNode = memo(function TableNode({
  data,
  selected,
}: {
  data: { table: TableSchema; clusterBorder: string };
  selected: boolean;
}) {
  const { table } = data;
  const visible = table.fields.slice(0, 6);
  const more = table.fields.length - visible.length;
  const shortName = table.tableId.replace(/^hily_/, "").replace(/^liti_marketing_/, "mkt.");

  return (
    <div
      style={{
        width: NODE_W,
        border: selected ? `1.5px solid #6366f1` : `1px solid ${data.clusterBorder}`,
        boxShadow: selected ? "0 0 0 3px rgba(99,102,241,0.15)" : "0 1px 3px rgba(0,0,0,0.07)",
      }}
      className="bg-white rounded-lg overflow-hidden transition-all"
    >
      {/* Header */}
      <div
        className="px-3 py-2.5 border-b"
        style={{ borderColor: data.clusterBorder, background: selected ? "#eef2ff" : "#fafaf8" }}
      >
        <p className="text-[11px] font-mono font-semibold text-[#111] truncate leading-tight" title={table.tableId}>
          {shortName}
        </p>
        <p className="text-[9px] text-[#aaa] mt-0.5">{table.fields.length} columns</p>
      </div>

      {/* Fields */}
      <div className="px-3 py-2 space-y-[3px]">
        {visible.map((field) => (
          <div key={field.name} className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#444] truncate flex-1">{field.name}</span>
            <span
              className="text-[8px] font-mono shrink-0 font-medium"
              style={{ color: TYPE_COLOR[field.type] ?? "#999" }}
            >
              {field.type.slice(0, 5)}
            </span>
          </div>
        ))}
        {more > 0 && <p className="text-[9px] text-[#bbb] pt-0.5 font-sans">+{more} more</p>}
      </div>

      <Handle type="target" position={Position.Left} style={{ width: 8, height: 8, background: "#a5b4fc", border: "2px solid white", left: -5 }} />
      <Handle type="source" position={Position.Right} style={{ width: 8, height: 8, background: "#a5b4fc", border: "2px solid white", right: -5 }} />
    </div>
  );
});

const ClusterGroupNode = memo(function ClusterGroupNode({
  data,
}: {
  data: { label: string; bg: string; border: string; labelColor: string; width: number; height: number };
}) {
  return (
    <div
      style={{
        width: data.width,
        height: data.height,
        background: data.bg,
        border: `1.5px solid ${data.border}`,
        borderRadius: 16,
        boxSizing: "border-box",
      }}
    >
      <div className="px-4 pt-3">
        <span
          className="text-[9px] font-bold uppercase tracking-[0.18em]"
          style={{ color: data.labelColor }}
        >
          {data.label}
        </span>
      </div>
    </div>
  );
});

const nodeTypes = { tableNode: TableNode, clusterGroup: ClusterGroupNode };

// ─── Graph builder ────────────────────────────────────────────────────────────

function buildGraph(schema: FullSchema): { nodes: Node[]; edges: Edge[] } {
  const tables = schema.tables;
  const tableSet = new Set(tables.map((t) => t.tableId));

  // Group tables by cluster
  const clusterTables = new Map<string, TableSchema[]>();
  CLUSTERS.forEach((c) => clusterTables.set(c.id, []));
  tables.forEach((t) => {
    const cid = TABLE_CLUSTER[t.tableId] ?? "Other";
    if (!clusterTables.has(cid)) clusterTables.set(cid, []);
    clusterTables.get(cid)!.push(t);
  });

  // Row heights per layoutRow (max of both columns)
  const rowHeights: number[] = [];
  CLUSTERS.forEach((c) => {
    const h = clusterHeight(clusterTables.get(c.id)?.length ?? 0);
    if (rowHeights[c.layoutRow] == null) rowHeights[c.layoutRow] = 0;
    rowHeights[c.layoutRow] = Math.max(rowHeights[c.layoutRow], h);
  });

  // Cumulative Y per row
  const rowY: number[] = [];
  let cumY = 0;
  rowHeights.forEach((h, i) => { rowY[i] = cumY; cumY += h + CLUSTER_GAP_Y; });

  const colX = [0, CLUSTER_W + CLUSTER_GAP_X];

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Cluster group nodes first (must come before children)
  CLUSTERS.forEach((cfg) => {
    const ts = clusterTables.get(cfg.id) ?? [];
    if (ts.length === 0) return;

    const h = clusterHeight(ts.length);
    nodes.push({
      id: `cluster__${cfg.id}`,
      type: "clusterGroup",
      position: { x: colX[cfg.layoutCol], y: rowY[cfg.layoutRow] },
      style: { width: CLUSTER_W, height: h, zIndex: 0 },
      data: { label: cfg.label, bg: cfg.bg, border: cfg.border, labelColor: cfg.labelColor, width: CLUSTER_W, height: h, clusterId: cfg.id },
      draggable: true,
      selectable: false,
      focusable: false,
    });
  });

  // Table nodes as children of cluster nodes
  CLUSTERS.forEach((cfg) => {
    const ts = clusterTables.get(cfg.id) ?? [];
    if (ts.length === 0) return;
    const clusterDef = CLUSTER_BY_ID[cfg.id];

    ts.forEach((table, i) => {
      const col = i % WITHIN_COLS;
      const row = Math.floor(i / WITHIN_COLS);
      nodes.push({
        id: table.tableId,
        type: "tableNode",
        parentNode: `cluster__${cfg.id}`,
        extent: "parent" as const,
        position: {
          x: PAD_SIDE + col * (NODE_W + WITHIN_GAP_X),
          y: PAD_TOP + row * (NODE_H_EST + WITHIN_GAP_Y),
        },
        data: { table, clusterBorder: clusterDef.border, clusterId: cfg.id },
        draggable: false,
        style: { zIndex: 1 },
      });
    });
  });

  // FK edges
  const seen = new Set<string>();
  tables.forEach((table) => {
    table.fields.forEach((field) => {
      if (field.name === "id" || !field.name.endsWith("_id")) return;
      const base = field.name.slice(0, -3);
      const candidates = [base, base + "s", base + "es", base.replace(/y$/, "ies"), `hily_${base}`, `hily_${base}s`];
      const target = candidates.find((c) => tableSet.has(c) && c !== table.tableId);
      if (!target) return;
      const edgeKey = [table.tableId, target, field.name].join("→");
      if (seen.has(edgeKey)) return;
      seen.add(edgeKey);

      const sameCluster = (TABLE_CLUSTER[table.tableId] ?? "Other") === (TABLE_CLUSTER[target] ?? "Other");

      edges.push({
        id: edgeKey,
        source: table.tableId,
        target,
        label: field.name.replace(/_id$/, ""),
        type: "smoothstep",
        style: {
          stroke: sameCluster ? "#a5b4fc" : "#86efac",
          strokeWidth: sameCluster ? 1.5 : 1,
          strokeDasharray: sameCluster ? undefined : "4 3",
        },
        labelStyle: { fill: "#9ca3af", fontSize: 9, fontFamily: "monospace" },
        labelBgStyle: { fill: "#fff", fillOpacity: 0.88 },
        labelBgPadding: [3, 2] as [number, number],
        labelBgBorderRadius: 3,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: sameCluster ? "#a5b4fc" : "#86efac",
          width: 12,
          height: 12,
        },
      });
    });
  });

  return { nodes, edges };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SchemaGraph({ schema }: { schema: FullSchema }) {
  const { nodes, edges } = useMemo(() => buildGraph(schema), [schema]);

  const minimapNodeColor = (node: Node): string => {
    const clusterId = node.data?.clusterId as string | undefined;
    if (!clusterId) return "#e5e7eb";
    return CLUSTER_BY_ID[clusterId]?.minimapColor ?? "#e5e7eb";
  };

  return (
    <div className="h-full" style={{ background: "#f4f2ec" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.06, includeHiddenNodes: false }}
        minZoom={0.04}
        maxZoom={2}
        style={{ background: "#f4f2ec" }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ zIndex: 10 }}
        elevateEdgesOnSelect
      >
        <Controls
          position="bottom-right"
          className={[
            "[&>button]:bg-white [&>button]:border-[#e2e0da] [&>button]:text-[#555]",
            "[&>button]:shadow-none [&>button:hover]:bg-[#f0eeea] [&>button:hover]:border-[#c8c5bc]",
          ].join(" ")}
        >
          <ControlButton
            onClick={() => {
              const rf = document.querySelector(".react-flow__renderer");
              rf?.requestFullscreen?.();
            }}
            title="Fullscreen"
          >
            <Maximize2 className="w-3 h-3" />
          </ControlButton>
        </Controls>

        <MiniMap
          position="bottom-left"
          pannable
          zoomable
          nodeColor={minimapNodeColor}
          nodeStrokeWidth={0}
          style={{
            background: "#ede9e2",
            border: "1px solid #d9d6ce",
            borderRadius: 8,
            width: 180,
            height: 120,
          }}
          maskColor="rgba(244,242,236,0.65)"
        />

        <Background
          variant={BackgroundVariant.Dots}
          gap={32}
          size={1.5}
          color="#d9d6ce"
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 bg-white/90 backdrop-blur-sm border border-[#e2e0da] rounded-full shadow-sm text-[9px] font-medium text-[#888] uppercase tracking-wide select-none pointer-events-none">
        {CLUSTERS.filter((c) => c.id !== "Other").map((c) => (
          <span key={c.id} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: c.minimapColor }} />
            {c.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 pl-2 border-l border-[#eee]">
          <span className="w-4 h-px" style={{ background: "#a5b4fc" }} />
          same cluster
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-px border-t-2 border-dashed" style={{ borderColor: "#86efac" }} />
          cross-cluster
        </span>
      </div>
    </div>
  );
}
