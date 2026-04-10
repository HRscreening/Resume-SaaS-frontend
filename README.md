# HireSort — Frontend

React SPA for HireSort, an AI-powered resume screening platform. Built with Vite, TanStack Router, TanStack Query, and Tailwind CSS.

---

## Architecture

```
frontend/
  src/
    routes/            Page-level components (one file per route)
    components/        Shared UI (layout, AuthGuard, Sidebar)
    lib/               API client, Supabase client, auth cache, utils
    hooks/             useAuth
    types/             Shared TypeScript types
  App.tsx              Route tree definition
  main.tsx             App entry point
  vite.config.ts
```

### Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 6 |
| Routing | TanStack Router v1 |
| Data fetching | TanStack Query v5 |
| Auth | Supabase JS (implicit OAuth flow) |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |

### Auth

Auth tokens are cached in memory on load (hydrated from localStorage via Supabase) to avoid a network round-trip on every navigation. `initAuth()` is called immediately in `main.tsx` before React renders, so the session is available synchronously when the first route mounts.

### Data fetching

TanStack Query is used for all API calls. Long-running jobs (resume processing) are polled with exponential backoff via `refetchInterval` until the batch completes.

---

## Getting started

### Prerequisites

- Node.js 20+
- The [HireSort backend](https://github.com/prashant905/Resume-SaaS) running at `http://localhost:8000`
- A Supabase project with Email and Google auth enabled

### Install

```bash
npm install
```

### Configure

```bash
cp .env.example .env.local
# Fill in your values
```

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_API_URL` | Backend API base URL (e.g. `http://localhost:8000`) |

### Supabase setup

In the Supabase dashboard:

1. Enable **Email** and **Google** providers under Authentication > Providers.
2. Add `http://localhost:5173/auth/callback` to **Redirect URLs** under Authentication > URL Configuration.

### Run

```bash
npm run dev
```

App runs at `http://localhost:5173`.

### Build

```bash
npm run build
```

Output is in `dist/`.

---

## Routes

| Path | Description |
|---|---|
| `/` | Landing page |
| `/login` | Login with email or Google |
| `/signup` | Sign up |
| `/auth/callback` | OAuth callback handler |
| `/onboarding` | First-time profile setup |
| `/dashboard` | Usage overview |
| `/screenings` | List of all jobs |
| `/screenings/new` | Create a new job (JD upload + rubric generation) |
| `/screenings/:id` | Job detail — upload CVs, view ranked results |
| `/screenings/:id/:resumeId` | Individual candidate detail |
| `/settings` | Profile, plan, billing, account deletion |

---

## License

MIT
