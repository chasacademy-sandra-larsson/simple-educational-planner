# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a two-package project, not a single Next.js app:

- `/` — Next.js 16 App Router frontend (React 19, TypeScript, Tailwind v4, shadcn/ui).
- `/server` — Express 4 + Drizzle ORM + PostgreSQL backend with a Python OR-Tools solver subprocess.

Each package has its own `package.json`, `tsconfig.json`, and `node_modules`. Run `npm install` in both.

The frontend talks to the backend over HTTP at `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001`). Auth tokens are stored in `localStorage` under `auth_token` and sent as `Authorization: Bearer …`.

UI copy is in Swedish — preserve language when editing user-facing strings.

## Commands

### Frontend (run from repo root)
- `npm run dev` — Next.js dev server on :3000 (Turbopack via `next.config.ts`).
- `npm run build` / `npm start` — production build/serve.
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript).

### Backend (run from `/server`)
- `npm run dev` — `tsx watch src/index.ts`, Express on :3001.
- `npm run build && npm start` — compile to `dist/` and run with node.
- `npm run db:generate` — create migration SQL from `src/db/schema.ts`.
- `npm run db:migrate` — apply migrations (`src/db/migrate.ts`).
- `npm run db:push` — push schema directly (dev only).
- `npm run db:studio` — Drizzle Studio GUI.
- `npm run db:seed` / `npm run db:seed-27` — seed scripts.
- `npm run db:reset` — wipe and recreate (`src/db/reset-database.ts`).
- `npm run erd` / `npm run erd:watch` — regenerate DBML diagram from schema.

There are many one-off `db:*` scripts (column adds, data migrations, verification) — check `server/package.json` before writing a new one. Standalone scripts in `server/scripts/` run via `tsx` (e.g. `npx tsx scripts/seed-27-classes.ts`).

### Python solver
Lives in `server/src/solver/python/`. The backend spawns `python3 scheduler.py` per schedule generation. Install once:

```bash
pip install -r server/src/solver/python/requirements.txt   # ortools>=9.8.0
```

Without `ortools`, the schedule-generator route returns a clear error rather than crashing.

## Architecture

### Frontend (`/app`)
- App Router with route groups under `app/projects/[id]/{classes,teachers,rooms,schedule,scheduling,settings}`. The `[id]/layout.tsx` wraps these routes in `<ProjectProvider>` (`ProjectContext.tsx`) and renders the tab nav.
- API client lives at `app/lib/api/` (`client.ts`, `types.ts`). Always import via `import { api } from '@/app/lib/api'` rather than calling `fetch` directly — the client handles the bearer token and typed responses.
- A separate `app/lib/syllabus-api.ts` wraps the Skolverket proxy (programs, orientations, courses) — uses the same `NEXT_PUBLIC_API_URL` base.
- Path alias: `@/*` maps to repo root (`tsconfig.json`). shadcn imports resolve as `@/components/ui/...` and `@/lib/utils` (see `components.json`, style `base-nova`, base color `neutral`).
- Components live in **two places** for historical reasons:
  - `app/components/` — app-specific components (planners, wizards, schedule view).
  - `components/ui/` — shadcn primitives.

### Backend (`/server/src`)
- `index.ts` wires Express + CORS + all routes. The Skolverket proxy is mounted first and is the only unauthenticated namespace (`/api/skolverket/*`).
- `middleware/auth.ts` — JWT bearer check (`JWT_SECRET` env). Sets `req.userId`.
- `routes/` — `auth`, `projects`, `teachers`, `rooms`, `service-distributions`, `term-dates`, `schedule`, `schedule-generator`, `skolverket`.
- `db/` — Drizzle setup. `db/index.ts` exports `db` and `queryClient` (postgres-js, `prepare: false` to avoid cache issues). All tables in `db/schema.ts`.
- `solver/` — TypeScript wrapper (`index.ts`, `data-loader.ts`) that builds `SolverInput` from the DB, spawns the Python child process, and parses JSON back.

### Domain model (Drizzle schema)
Top-level entity is a **project** (a school/scenario owned by a user). A project contains:
- `projectClasses` (e.g. `TE26`) → `classCurricula` → `courseInstances` (course assigned to a class with optional teacher/room).
- `teachers`, `rooms` — scoped to the project.
- Time settings live on `projects` directly (`earliest_lesson_start`, `default_lesson_duration`, lunch window, breaks, mentor time).
- Generated schedules are persisted in their own table and linked back to the project.

Curricula validate against 2500 Swedish gymnasium points and have a `status` (`draft` / `approved` / `archived`).

### Skolverket proxy
The frontend never calls `api.skolverket.se` directly — the backend proxy at `/api/skolverket/*` exists specifically to avoid CORS. Add new Skolverket-backed data through that route, not from the client.

## Environment

- Frontend `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:3001`.
- Backend `.env` (copy from `server/env.example`): `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `ALLOWED_ORIGINS`.
- PostgreSQL must be running locally; the DB name in the example is `educational_planner`.

## Schema/design docs

`/server/*.md` contains design rationale (`ROOMS-DESIGN.md`, `TIME-SETTINGS-DESIGN.md`, `TJANSTEFORDELNING-SCHEMA.md`, `JSONB-VS-NORMALIZED-EXPLANATION.md`, etc.). Read these before changing the DB schema — many decisions are deliberately documented.
