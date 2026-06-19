import { BigQuery } from "@google-cloud/bigquery";
import type { TableField, TableSchema, FullSchema } from "@/lib/schema";

export type { TableField, TableSchema, FullSchema };

const PROJECT_ID = "liti-74413";
const DATASET_ID = "hily_airflow";

function getClient(): BigQuery {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  const credentials = JSON.parse(json);
  return new BigQuery({ projectId: PROJECT_ID, credentials });
}

export async function listTables(): Promise<string[]> {
  const bq = getClient();
  const [tables] = await bq.dataset(DATASET_ID).getTables();
  return tables.map((t) => t.id as string).filter(Boolean);
}

export async function getTableSchema(tableId: string): Promise<TableSchema> {
  const bq = getClient();
  const [metadata] = await bq.dataset(DATASET_ID).table(tableId).getMetadata();

  const rawFields: Array<{
    name: string;
    type: string;
    mode?: string;
    description?: string;
  }> = metadata.schema?.fields ?? [];

  const fields: TableField[] = rawFields.map((f) => ({
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
