# CrisisLink Admin Dashboard

Next.js 16 (App Router) admin console for the CrisisLink Disaster Management
Platform. Pairs with the Expo mobile app in `../mobile` and shares the same
Supabase backend.

## Quick start

```bash
cd web
npm install
cp .env.local .env.local.example  # already present, just edit it
npm run dev
```

Then open <http://localhost:3000>. Unauthenticated visitors are redirected to
`/login`. After signing in with an admin account (a row in `profiles` with
`role = 'admin'`) you land on `/admin`.

## Environment

`/web/.env.local`

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Same Supabase project as the mobile app. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Public anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Bypasses RLS — used by privileged admin actions. **Never** import from a client component. |

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- `@supabase/ssr` for cookie-based session handling
- Recharts for visualizations
- TanStack Table v8 for data grids
- `react-hot-toast` for notifications
- `lucide-react` for icons

## Structure

```
src/
  app/
    layout.tsx            # Root layout, fonts, toaster
    page.tsx              # Redirects to /admin
    login/                # Admin login (server page + client form)
    admin/
      layout.tsx          # Server-side admin gate + sidebar shell
      page.tsx            # Dashboard overview with metrics + charts
      _components/        # Sidebar, Topbar, MetricCard, charts
      users/              # … and one folder per sidebar section
      ...
  lib/
    supabase/
      client.ts           # Browser Supabase client
      server.ts           # Server client (RLS) + service-role client
      middleware.ts       # Session refresh + /admin gate
    colors.ts             # Shared palette mirroring mobile
    nav.ts                # Sidebar config
    dashboardMetrics.ts   # Server-side data fetching for the dashboard
  middleware.ts           # Wires lib/supabase/middleware into Next.js
  types/auth.ts           # Profile / role types (mirrors mobile)
```

## Auth & access control

Two layers:

1. **Middleware** (`src/middleware.ts` → `lib/supabase/middleware.ts`) refreshes
   the auth session on every request and redirects:
   - unauthenticated visitors of `/admin/*` → `/login?redirect=…`
   - non-admin authenticated users of `/admin/*` → `/login?error=forbidden`
   - already-signed-in admins on `/login` → `/admin`
2. **Server layout** (`app/admin/layout.tsx`) does a defensive re-check before
   rendering, so even if the middleware matcher is misconfigured the page
   still won't leak data.

The login form (`app/login/LoginForm.tsx`) also verifies the role client-side
so we can show a friendly toast instead of a redirect bounce.

## Dashboard data

`lib/dashboardMetrics.ts` runs a parallel batch of Supabase queries from a
server component:

- counts: `profiles`, `volunteers (approved)`, `disasters (≠ resolved)`,
  `campaigns (active)`, `reports (submitted)`
- sum: `campaigns.collected_amount`
- series: profile creations over the last 30 days
- aggregations (in-memory): disasters by type this month, approved volunteers
  by skill (each skill in the `skills` array counted once)

Missing tables / columns are tolerated — the helper logs a warning and falls
back to `0` / `[]` so the dashboard never hard-fails if the schema is still
being built out.
