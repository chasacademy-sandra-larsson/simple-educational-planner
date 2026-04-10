# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository shape
- Root: Next.js frontend (App Router) + shared UI/components.
- `server/`: Express + Drizzle + PostgreSQL backend.
- Scheduling engine is hybrid:
  - TypeScript orchestration in `server/src/solver/`
  - Python OR-Tools solver in `server/src/solver/python/scheduler.py`

## Setup and run commands
Use npm (both root and `server/` have `package-lock.json`).

### Frontend (repo root)
- Install: `npm install`
- Dev server: `npm run dev` (Next.js on port 3000 by default)
- Build: `npm run build`
- Start prod build: `npm run start`
- Lint: `npm run lint`
- Lint a single file: `npm run lint -- app/components/OnboardingWizard.tsx`

### Backend (`server/`)
- Install: `npm install`
- Configure env: `cp env.example .env` and set `DATABASE_URL`, `JWT_SECRET`, etc.
- Run dev server: `npm run dev` (Express on port 3001 by default)
- Build TS: `npm run build`
- Start built server: `npm run start`

### Database and Drizzle (`server/`)
- Generate migration files: `npm run db:generate`
- Apply migrations: `npm run db:migrate`
- Push schema directly (dev only): `npm run db:push`
- Seed data: `npm run db:seed`
- Reset DB: `npm run db:reset`
- Open Drizzle Studio: `npm run db:studio`

### Solver prerequisites
- Python 3 must be available in PATH as `python3` or `python`.
- Install solver dependency: `pip install -r src/solver/python/requirements.txt` (from `server/`).

## Tests and verification
There is no Jest/Vitest-style test runner configured in `package.json` (root or `server/`).

Validation is primarily done with:
- Frontend linting: `npm run lint` (root)
- Backend build/type check: `npm run build` (in `server/`)
- Backend script-based checks in `server/scripts/`

Run a single backend verification script:
- `npx tsx scripts/test-solver-small.ts` (from `server/`)

Other commonly used script checks:
- `npx tsx scripts/test-api-flow.ts`
- `npx tsx scripts/test-solver.ts`
- `npx tsx scripts/test-schedule.ts`

Note: several scripts include hardcoded project/user IDs and may need local edits before use.

## High-level architecture
### Frontend flow
- API integration lives in `app/lib/api/client.ts`; all domain calls are centralized here.
- Auth token is read from `localStorage` and attached as `Authorization: Bearer ...`.
- Per-project state is centralized in `app/projects/[id]/ProjectContext.tsx` and consumed by route pages/components.
- Project section routes under `app/projects/[id]/...` map to tabs for classes, schedule calculations, generation, teachers, rooms, and settings.

### Backend flow
- Entry point: `server/src/index.ts`
  - mounts all API routers
  - enables CORS and JSON parsing
  - exposes `/health`
- Auth:
  - `server/src/routes/auth.ts` handles register/login + JWT issue
  - `server/src/middleware/auth.ts` enforces bearer auth on protected routes
- Main domain routers:
  - `projects.ts` (project/class/curriculum lifecycle, curriculum initialization from Skolverket)
  - `teachers.ts`, `rooms.ts`
  - `service-distributions.ts` (teacher workload/course assignment)
  - `schedule.ts` (minutes-per-week calculations from course points + term dates)
  - `schedule-generator.ts` (generate/list/read/delete/update generated schedules)

### Data model and persistence
- Drizzle schema is in `server/src/db/schema.ts` (single source of truth).
- Core entities:
  - projects, classes, curricula, course instances
  - teachers, rooms, class mentors
  - term dates and teacher service distributions
  - generated schedules + scheduled lessons
- DB bootstrap/connection is in `server/src/db/index.ts`; requires `DATABASE_URL`.

### Scheduling pipeline (important cross-file flow)
1. Frontend requests generation via `api.scheduleGenerator.generate(...)`.
2. Backend route `server/src/routes/schedule-generator.ts` validates input and auth/project access.
3. Route calls `loadSolverData(...)` from `server/src/solver/data-loader.ts`.
4. `data-loader.ts`:
   - loads project settings, classes, active curricula, course instances, teachers, rooms, term dates
   - converts HT/VT term encoding to `term1..term6`
   - computes lesson demand (`lessonsPerWeek`, `minutesPerWeek`) via `schedule-calculations.ts`
5. Route runs `generateSchedule(...)` from `server/src/solver/index.ts`.
6. `solver/index.ts` spawns Python solver (`server/src/solver/python/scheduler.py`) as subprocess and exchanges JSON over stdin/stdout.
7. Python OR-Tools solver applies constraints (class/teacher/room no-overlap, lunch/break constraints, optimization penalties) and returns scheduled lessons.
8. Backend persists result to `generated_schedules` and `scheduled_lessons`.

## Important operational notes
- Frontend expects backend base URL from `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001`).
- Most backend endpoints are auth-protected and project-scoped; ownership checks are enforced server-side.
- For schedule-quality or infeasibility issues, inspect both:
  - `server/src/solver/data-loader.ts` (input construction)
  - `server/src/solver/python/scheduler.py` (constraint model and diagnostics)
