// Client-safe: no BigQuery SDK imports. Used by client components and server alike.

export interface TableField {
  name: string;
  type: string;
  mode: string;
  description?: string;
}

export interface TableSchema {
  tableId: string;
  fullPath: string;
  fields: TableField[];
}

export interface FullSchema {
  tables: TableSchema[];
  fetchedAt: string;
}

export function schemaToAIContext(schema: FullSchema): string {
  const lines: string[] = [
    "You have access to the following BigQuery schema.",
    "Project: liti-74413  |  Dataset: hily_airflow",
    `Total tables: ${schema.tables.length}`,
    "",
    "RULE: Always use full table paths like `liti-74413.hily_airflow.table_name`.",
    "RULE: Provide complete, ready-to-run BigQuery SQL.",
    "",
    "=== SCHEMA ===",
    "",
  ];

  for (const table of schema.tables) {
    lines.push(`TABLE ${table.fullPath}`);
    for (const f of table.fields) {
      const mode = f.mode !== "NULLABLE" ? ` [${f.mode}]` : "";
      const desc = f.description ? `  -- ${f.description}` : "";
      lines.push(`  ${f.name}  ${f.type}${mode}${desc}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
