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

// ─── Precise cluster assignment ───────────────────────────────────────────────

const TABLE_CLUSTER: Record<string, string> = {
  // Users & Accounts
  hily_users: "Users",
  hily_user_profile_data: "Users",
  hily_user_agent: "Users",
  hily_user_interest: "Users",
  hily_user_balance_history: "Users",
  hily_gryffindor_customer: "Users",
  hily_customer_customer_account_binding: "Users",
  hily_customer_customer_account_binding_back_copy: "Users",
  hily_customer_customer_device_binding: "Users",
  hily_customer_random_ban: "Users",
  hily_customer_special_activated: "Users",
  // Streaming & Video
  hily_streamer: "Streaming",
  hily_streamer_ban: "Streaming",
  hily_streamer_daily_addition_coin_balance_history: "Streaming",
  hily_streamer_payoff_request: "Streaming",
  hily_streamer_penalty: "Streaming",
  hily_streamer_penalty_data: "Streaming",
  hily_streamer_photo_stats: "Streaming",
  hily_streamer_referral_invited: "Streaming",
  hily_streamer_task_history_items: "Streaming",
  hily_streamer_to_user_complaint: "Streaming",
  hily_streamer_verification_image: "Streaming",
  hily_stream_screenshot: "Streaming",
  hily_log_live_stream_ended: "Streaming",
  hily_video_call_log: "Streaming",
  hily_video_call_ping_log: "Streaming",
  hily_video_story: "Streaming",
  hily_video_story_like: "Streaming",
  hily_video_story_view: "Streaming",
  // Payments & Monetization
  hily_gryffindor_balance_account: "Payments",
  hily_gryffindor_balance_account_transaction: "Payments",
  hily_pay_bundles: "Payments",
  hily_payment_subscription: "Payments",
  hily_payment_transaction: "Payments",
  hily_solid_gate_card: "Payments",
  hily_partner_costs: "Payments",
  hily_partner_networks: "Payments",
  hily_partners: "Payments",
  // Social & Moderation
  hily_user_favorites: "Social",
  hily_user_favorite_request: "Social",
  hily_user_complaints: "Social",
  hily_users_feedback: "Social",
  hily_blacklist: "Social",
  hily_complaint: "Social",
  hily_banned_customer_user: "Social",
  hily_push_notification_log: "Social",
  // Analytics & Logs
  hily_log_about_validation_log: "Analytics",
  hily_log_appsflyer_device_log: "Analytics",
  hily_log_complaint_log: "Analytics",
  hily_log_contact_sharing_detected_log: "Analytics",
  hily_log_login_stats: "Analytics",
  hily_log_name_validation_log: "Analytics",
  hily_log_remarketing_user: "Analytics",
  hily_log_tracking_connection_data: "Analytics",
  hily_log_user_ban_logs: "Analytics",
  hily_log_user_double_check_ban_result: "Analytics",
  hily_log_user_double_check_ban_result_content: "Analytics",
  hily_log_user_partner_log: "Analytics",
  hily_user_experiment_log: "Analytics",
  hily_experiment: "Analytics",
  // Marketing & Attribution
  hily_apps_install: "Marketing",
  hily_apps_install_log: "Marketing",
  hily_appsflyer_advertise_account: "Marketing",
  hily_appsflyer_device_advertise_account_bind: "Marketing",
  hily_ip_geo: "Marketing",
  hily_ip_geo_user: "Marketing",
  hily_ip_geo_user_last: "Marketing",
  liti_marketing_user_marketing_data: "Marketing",
  hily_agency: "Marketing",
  media_storage_image: "Marketing",
};

// layoutCol: 0 = left, 1 = right; layoutRow: visual top-to-bottom order within column
const CLUSTER_CONFIG: { id: string; label: string; layoutCol: number; layoutRow: number }[] = [
  { id: "Users",     label: "Users & Accounts",      layoutCol: 0, layoutRow: 0 },
  { id: "Streaming", label: "Streaming & Video",     layoutCol: 1, layoutRow: 0 },
  { id: "Payments",  label: "Payments",              layoutCol: 0, layoutRow: 1 },
  { id: "Social",    label: "Social & Moderation",   layoutCol: 1, layoutRow: 1 },
  { id: "Analytics", label: "Analytics & Logs",      layoutCol: 0, layoutRow: 2 },
  { id: "Marketing", label: "Marketing & Attribution",layoutCol: 1, layoutRow: 2 },
  { id: "Other",     label: "Other",                 layoutCol: 0, layoutRow: 3 },
];

// ─── Type color (text only, minimal) ─────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  STRING: "#6a9e7a", BYTES: "#6a9e7a",
  INTEGER: "#6e8fbf", INT64: "#6e8fbf",
  FLOAT: "#8b7ac9", FLOAT64: "#8b7ac9", NUMERIC: "#8b7ac9", BIGNUMERIC: "#8b7ac9",
  BOOLEAN: "#c9a84c", BOOL: "#c9a84c",
  TIMESTAMP: "#bf7a5a", DATE: "#bf7a5a", TIME: "#bf7a5a", DATETIME: "#bf7a5a",
  RECORD: "#c96e9e", STRUCT: "#c96e9e",
  JSON: "#5aaabf", GEOGRAPHY: "#5abfa8",
};

// ─── Node components ──────────────────────────────────────────────────────────

const ScandiNode = memo(function ScandiNode({
  data,
  selected,
}: {
  data: { table: TableSchema };
  selected: boolean;
}) {
  const { table } = data;
  const visible = table.fields.slice(0, 6);
  const more = table.fields.length - visible.length;

  return (
    <div
      className={cn(
        "bg-white rounded overflow-hidden transition-shadow",
        selected
          ? "ring-1 ring-slate-500 shadow-md"
          : "border border-[#e2e0da] shadow-sm hover:shadow"
      )}
      style={{ width: 196 }}
    >
      <div className={cn(
        "px-3 py-2 border-b border-[#ede9e4]",
        selected ? "bg-[#f0eef8]" : "bg-[#f8f7f3]"
      )}>
        <p className="text-[10px] font-mono font-semibold text-[#1c1c1c] truncate leading-tight">
          {table.tableId.replace(/^hily_/, "")}
        </p>
        <p className="text-[9px] text-[#b0ada4] mt-0.5 font-sans">{table.fields.length} columns</p>
      </div>

      <div className="px-3 py-2 space-y-[3px]">
        {visible.map((field) => (
          <div key={field.name} className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono text-[#5a5754] truncate flex-1 leading-snug">
              {field.name}
            </span>
            <span
              className="text-[8px] font-mono shrink-0 leading-snug"
              style={{ color: TYPE_COLOR[field.type] ?? "#b0ada4" }}
            >
              {field.type.slice(0, 4)}
            </span>
          </div>
        ))}
        {more > 0 && (
          <p className="text-[8px] text-[#ccc8c0] pt-0.5">+{more} more</p>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!w-1.5 !h-1.5 !bg-[#b0ada4] !border !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-1.5 !h-1.5 !bg-[#b0ada4] !border !border-white"
      />
    </div>
  );
});

const ClusterLabel = memo(function ClusterLabel({
  data,
}: {
  data: { label: string };
}) {
  return (
    <div className="text-[9px] font-medium uppercase tracking-[0.14em] text-[#b5b2a8] select-none pointer-events-none">
      {data.label}
    </div>
  );
});

const nodeTypes = { scandiNode: ScandiNode, clusterLabel: ClusterLabel };

// ─── Layout ───────────────────────────────────────────────────────────────────

const NODE_W = 196;
const NODE_H = 150;       // estimated average node height
const WITHIN_COLS = 3;
const WITHIN_GAP_X = 18;
const WITHIN_GAP_Y = 14;
const LABEL_H = 28;       // height reserved for cluster label
const CLUSTER_GAP_X = 88; // horizontal gap between left and right column
const CLUSTER_GAP_Y = 52; // vertical gap between clusters in same column

const CLUSTER_W = WITHIN_COLS * NODE_W + (WITHIN_COLS - 1) * WITHIN_GAP_X; // 628

function clusterContentHeight(count: number): number {
  if (count === 0) return 0;
  const rows = Math.ceil(count / WITHIN_COLS);
  return rows * NODE_H + (rows - 1) * WITHIN_GAP_Y;
}

function buildGraph(schema: FullSchema): { nodes: Node[]; edges: Edge[] } {
  const tables = schema.tables;
  const tableSet = new Set(tables.map((t) => t.tableId));

  // Group tables by cluster (preserve schema order within cluster)
  const clusterTables = new Map<string, TableSchema[]>();
  CLUSTER_CONFIG.forEach((c) => clusterTables.set(c.id, []));

  tables.forEach((table) => {
    const cid = TABLE_CLUSTER[table.tableId] ?? "Other";
    if (!clusterTables.has(cid)) clusterTables.set(cid, []);
    clusterTables.get(cid)!.push(table);
  });

  // Row heights per layoutRow (max of both columns in that row)
  const rowHeights: number[] = [];
  CLUSTER_CONFIG.forEach((c) => {
    const count = clusterTables.get(c.id)?.length ?? 0;
    const h = LABEL_H + clusterContentHeight(count);
    if (rowHeights[c.layoutRow] == null) rowHeights[c.layoutRow] = 0;
    rowHeights[c.layoutRow] = Math.max(rowHeights[c.layoutRow], h);
  });

  // Cumulative y offset per row
  const rowY: number[] = [];
  let cy = 0;
  rowHeights.forEach((h, i) => {
    rowY[i] = cy;
    cy += h + CLUSTER_GAP_Y;
  });

  const colX = [0, CLUSTER_W + CLUSTER_GAP_X];

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  CLUSTER_CONFIG.forEach((cfg) => {
    const ts = clusterTables.get(cfg.id) ?? [];
    if (ts.length === 0) return;

    const cx = colX[cfg.layoutCol];
    const cy2 = rowY[cfg.layoutRow];

    // Cluster label node
    nodes.push({
      id: `label__${cfg.id}`,
      type: "clusterLabel",
      position: { x: cx, y: cy2 },
      data: { label: cfg.label },
      draggable: false,
      selectable: false,
      focusable: false,
    });

    // Table nodes
    ts.forEach((table, i) => {
      const col = i % WITHIN_COLS;
      const row = Math.floor(i / WITHIN_COLS);
      nodes.push({
        id: table.tableId,
        type: "scandiNode",
        position: {
          x: cx + col * (NODE_W + WITHIN_GAP_X),
          y: cy2 + LABEL_H + row * (NODE_H + WITHIN_GAP_Y),
        },
        data: { table },
      });
    });
  });

  // FK edges
  const seen = new Set<string>();
  tables.forEach((table) => {
    table.fields.forEach((field) => {
      if (field.name === "id" || !field.name.endsWith("_id")) return;
      const base = field.name.slice(0, -3);
      const candidates = [
        base,
        base + "s",
        base + "es",
        base.replace(/y$/, "ies"),
        "hily_" + base,
        "hily_" + base + "s",
      ];
      const target = candidates.find((c) => tableSet.has(c) && c !== table.tableId);
      if (!target) return;
      const edgeId = `${table.tableId}→${target}:${field.name}`;
      if (seen.has(edgeId)) return;
      seen.add(edgeId);
      edges.push({
        id: edgeId,
        source: table.tableId,
        target,
        label: field.name.replace(/_id$/, ""),
        type: "smoothstep",
        style: { stroke: "#ccc9c0", strokeWidth: 1 },
        labelStyle: { fill: "#b5b2a8", fontSize: 8, fontFamily: "monospace" },
        labelBgStyle: { fill: "#f4f2ec", fillOpacity: 0.95 },
        labelBgPadding: [3, 1] as [number, number],
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#ccc9c0",
          width: 10,
          height: 10,
        },
      });
    });
  });

  return { nodes, edges };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SchemaGraph({ schema }: { schema: FullSchema }) {
  const { nodes, edges } = useMemo(() => buildGraph(schema), [schema]);

  return (
    <div className="h-full" style={{ background: "#f4f2ec" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.08 }}
        minZoom={0.05}
        maxZoom={2}
        style={{ background: "#f4f2ec" }}
        proOptions={{ hideAttribution: true }}
      >
        <Controls
          className={[
            "[&>button]:bg-white [&>button]:border-[#e2e0da] [&>button]:text-[#666] [&>button]:shadow-none",
            "[&>button:hover]:bg-[#f0eeea]",
          ].join(" ")}
        />
        <MiniMap
          style={{ background: "#ede9e2", border: "1px solid #e2e0da" }}
          nodeColor="#d4d1c8"
          maskColor="rgba(244,242,236,0.7)"
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1}
          color="#dddad1"
        />
      </ReactFlow>
    </div>
  );
}
