// Uses Node.js native fetch + crypto for JWT auth — no gaxios/node-fetch@2 dependency.
// @google-cloud/bigquery is not used because gaxios (its HTTP client) has a Gunzip
// bug on Node.js 22+ that causes "Premature close" errors.
import { createSign } from "node:crypto";
import type { TableField, TableSchema, FullSchema } from "@/lib/schema";

export type { TableField, TableSchema, FullSchema };

const PROJECT_ID = "liti-74413";
const DATASET_ID = "hily_airflow";
const BQ_BASE = "https://bigquery.googleapis.com/bigquery/v2";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

function b64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function makeJWT(sa: ServiceAccount): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/bigquery.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const signingInput = `${header}.${claims}`;
  const sign = createSign("RSA-SHA256");
  sign.update(signingInput);
  const sig = sign.sign(sa.private_key).toString("base64url");
  return `${signingInput}.${sig}`;
}

// Simple in-process token cache (reuse within the same Lambda/process lifetime)
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const jwt = makeJWT(sa);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth token exchange failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return data.access_token;
}

function getServiceAccount(): ServiceAccount {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  return JSON.parse(json) as ServiceAccount;
}

async function bqFetch<T>(path: string): Promise<T> {
  const sa = getServiceAccount();
  const token = await getAccessToken(sa);
  const res = await fetch(`${BQ_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`BigQuery API error (${res.status}) at ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function listTables(): Promise<string[]> {
  interface ListTablesResponse {
    tables?: Array<{ tableReference: { tableId: string } }>;
  }
  const data = await bqFetch<ListTablesResponse>(
    `/projects/${PROJECT_ID}/datasets/${DATASET_ID}/tables?maxResults=200`
  );
  return (data.tables ?? []).map((t) => t.tableReference.tableId);
}

export async function getTableSchema(tableId: string): Promise<TableSchema> {
  interface GetTableResponse {
    schema?: {
      fields?: Array<{ name: string; type: string; mode?: string; description?: string }>;
    };
  }
  const data = await bqFetch<GetTableResponse>(
    `/projects/${PROJECT_ID}/datasets/${DATASET_ID}/tables/${tableId}`
  );

  const fields: TableField[] = (data.schema?.fields ?? []).map((f) => ({
    name: f.name,
    type: f.type,
    mode: f.mode ?? "NULLABLE",
    description: f.description,
  }));

  return {
    tableId,
    fullPath: `${PROJECT_ID}.${DATASET_ID}.${tableId}`,
    fields,
  };
}

export async function fetchFullSchema(): Promise<FullSchema> {
  const tableIds = await listTables();
  const BATCH_SIZE = 10;
  const tables: TableSchema[] = [];

  for (let i = 0; i < tableIds.length; i += BATCH_SIZE) {
    const batch = tableIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((id) => getTableSchema(id)));
    tables.push(...results);
  }

  return { tables, fetchedAt: new Date().toISOString() };
}
