# BQ Navigator — Hily Data Explorer

## What we're building
Web app to navigate BigQuery database for Hily (dating + streaming app).
Project: liti-74413, dataset: hily_airflow (~50 tables).

## Stack
- Next.js (App Router, TypeScript)
- TailwindCSS (dark theme)
- Prisma + PostgreSQL via Vercel Postgres (users, sessions)
- NextAuth v5 with Credentials provider (email + password registration/login)
- @google-cloud/bigquery with service account for schema fetching
- @anthropic-ai/sdk for AI chat
- reactflow for interactive schema visualization

## BigQuery access
Service account JSON stored in env GOOGLE_SERVICE_ACCOUNT_JSON (entire JSON as single line).
Service account email: claude-malyuk@liti-74413.iam.gserviceaccount.com
It already has read access to liti-74413.hily_airflow.
Use @google-cloud/bigquery library to fetch INFORMATION_SCHEMA and table metadata.

## Auth approach
Simple email + password auth via NextAuth Credentials provider.
Store users in Postgres via Prisma. Hash passwords with bcryptjs.
User model needs: id, name, email, hashedPassword, createdAt, updatedAt.
Pages: /login (sign in) and /register (sign up). Redirect to /dashboard after auth.

## Features (3 tabs in dashboard)
1. Schema Explorer — searchable table list, expandable columns with types, click to copy full path (liti-74413.hily_airflow.table.column), sample SQL per table
2. Schema Graph — interactive reactflow diagram, tables as nodes showing columns, auto-detect relationships via _id columns
3. AI Chat — user asks natural language questions, Claude responds with full paths and ready-to-run SQL. The full schema is passed as system prompt context.

## Env vars
- GOOGLE_SERVICE_ACCOUNT_JSON — full service account JSON (single line)
- ANTHROPIC_API_KEY — Claude API key
- POSTGRES_PRISMA_URL — Vercel Postgres pooled
- POSTGRES_URL_NON_POOLING — Vercel Postgres direct
- AUTH_SECRET — NextAuth secret

## Design
- Dark theme (gray-950 background)
- Blue accent (#3b82f6)
- Monospace font for table/column names
- Professional, clean UI
ENDOFFILE~
cd ~/bq-navigator
cat > CLAUDE.md << 'ENDOFFILE'
# BQ Navigator — Hily Data Explorer

## What we're building
Web app to navigate BigQuery database for Hily (dating + streaming app).
Project: liti-74413, dataset: hily_airflow (~50 tables).

## Stack
- Next.js (App Router, TypeScript)
- TailwindCSS (dark theme)
- Prisma + PostgreSQL via Vercel Postgres (users, sessions)
- NextAuth v5 with Credentials provider (email + password registration/login)
- @google-cloud/bigquery with service account for schema fetching
- @anthropic-ai/sdk for AI chat
- reactflow for interactive schema visualization

## BigQuery access
Service account JSON stored in env GOOGLE_SERVICE_ACCOUNT_JSON (entire JSON as single line).
Service account email: claude-malyuk@liti-74413.iam.gserviceaccount.com
It already has read access to liti-74413.hily_airflow.
Use @google-cloud/bigquery library to fetch INFORMATION_SCHEMA and table metadata.

## Auth approach
Simple email + password auth via NextAuth Credentials provider.
Store users in Postgres via Prisma. Hash passwords with bcryptjs.
User model needs: id, name, email, hashedPassword, createdAt, updatedAt.
Pages: /login (sign in) and /register (sign up). Redirect to /dashboard after auth.

## Features (3 tabs in dashboard)
1. Schema Explorer — searchable table list, expandable columns with types, click to copy full path (liti-74413.hily_airflow.table.column), sample SQL per table
2. Schema Graph — interactive reactflow diagram, tables as nodes showing columns, auto-detect relationships via _id columns
3. AI Chat — user asks natural language questions, Claude responds with full paths and ready-to-run SQL. The full schema is passed as system prompt context.

## Env vars
- GOOGLE_SERVICE_ACCOUNT_JSON — full service account JSON (single line)
- ANTHROPIC_API_KEY — Claude API key
- POSTGRES_PRISMA_URL — Vercel Postgres pooled
- POSTGRES_URL_NON_POOLING — Vercel Postgres direct
- AUTH_SECRET — NextAuth secret

## Design
- Dark theme (gray-950 background)
- Blue accent (#3b82f6)
- Monospace font for table/column names
- Professional, clean UI
