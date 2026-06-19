import { auth } from "@/lib/auth";
import { fetchFullSchema } from "@/lib/bigquery";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const schema = await fetchFullSchema();
    return NextResponse.json(schema);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch schema";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
