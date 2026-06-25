<div align="center">

# ⚡ AutoHQ

### AI-powered job search OS

Collects job postings from multiple sources, scores every one against **your** profile with AI,
auto-writes cover letters, pings you on Telegram about the good ones — and gives you a clean
dashboard to run the whole pipeline from "new" to "offer".

[![Nuxt](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt.js&logoColor=white)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3-42b883?logo=vue.js&logoColor=white)](https://vuejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-database-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![n8n](https://img.shields.io/badge/n8n-automation-EA4B71?logo=n8n&logoColor=white)](https://n8n.io)
[![Vercel](https://img.shields.io/badge/Vercel-deploy-000000?logo=vercel&logoColor=white)](https://vercel.com)

</div>

---

## What is this?

Job hunting is mostly grunt work: open five job boards, skim hundreds of postings, guess which
ones are worth your time, rewrite the same cover letter over and over. **AutoHQ automates the
boring 90%** so you spend your energy only on the postings that actually fit.

It's built as two halves that talk over a single webhook:

1. **The collector** — [n8n](https://n8n.io) workflows run on a schedule (every weekday morning),
   pull fresh postings from job boards, ask **OpenAI** to rate each one *1–100* against your
   stack and preferences, generate a tailored cover letter, and forward everything to the app. High
   scorers also trigger a **Telegram** notification.
2. **The cockpit** — a [Nuxt 4](https://nuxt.com) dashboard where every job lands in a Kanban-style
   pipeline (`new → reviewing → applied → interviewing → offer`). You read the AI score and reason,
   copy the generated cover letter, track applications, and tune the whole engine (keywords, score
   threshold, which sources are active) live — changes are picked up by n8n on the next run.

> **Note** — this is a personal tool for one job seeker. Sign-in is GitHub OAuth, and since any
> GitHub account can complete OAuth, an owner-gate (`OWNER_GITHUB` env, enforced in the OAuth
> callback) restricts access to a single owner. Data lives in a Postgres database accessed only
> through the app's server API. If you fork it for a team, replace the owner-gate with per-user
> scoping (see [Security notes](#security-notes)).

---

## Features

| | |
|---|---|
| 🤖 **AI scoring** | Every posting rated **1–100** against your profile; only relevant jobs surface to the top. |
| ✍️ **Auto cover letters** | OpenAI writes a tailored, language-aware (EN/RU) cover letter per job — no clichés, references your real projects. |
| 📲 **Telegram alerts** | Get pinged *only* for jobs scoring above your threshold (default ≥ 70). No noise. |
| 🔌 **Multiple sources** | Remotive, Arbeitnow, HH.ru, Djinni out of the box — each its own n8n workflow, toggleable from the UI. |
| 📊 **Pipeline dashboard** | Stats, a funnel view, top matches, and a Kanban board from *new* to *offer*. |
| 📄 **Live resume** | Your resume is rendered straight from a Markdown file in a GitHub repo (e.g. an Obsidian vault) — single source of truth. |
| 🎛️ **Live control panel** | Change search keywords, score threshold, and enable/disable sources without redeploying — n8n reads these at runtime. |
| 🌑 **Polished dark UI** | shadcn-vue + Tailwind v4, dark by default. |

---

## Architecture

```
                          ┌──────────────────────────────────────────┐
                          │                  n8n                       │
   ⏰ weekday cron  ─────▶ │  Fetch (Remotive / Arbeitnow / HH / Djinni)│
                          │            │                               │
                          │            ▼                               │
                          │   OpenAI: score 1–100 + cover letter       │
                          │            │                               │
                          │   ┌────────┴────────┐                      │
                          │   ▼                 ▼                      │
                          │  Telegram      POST /api/webhook/jobs ──────┼──┐
                          │  (score ≥ N)        (x-webhook-secret)      │  │
                          └─────────────────────────────────────────────┘  │
                                          ▲                                 │
   reads keywords / threshold / sources   │  GET /api/config                │
                                          └─────────────────────────────────┘
                                                                            │
                          ┌─────────────────────────────────────────────────▼─┐
                          │              Nuxt 4 app  (Vercel)                  │
                          │                                                    │
                          │   Dashboard · Jobs · Applications · Resume · Control│
                          │                       │                            │
                          │                       ▼                            │
                          │     server API (postgres) + GitHub OAuth session   │
                          │                       │                            │
                          │                       ▼                            │
                          │                  PostgreSQL                         │
                          │   (jobs, app_config, source_settings, profile)     │
                          └────────────────────────────────────────────────────┘
                                          ▲
                                          │ live resume (GitHub raw API)
                          ┌───────────────┴───────────────┐
                          │  Private repo (Obsidian vault) │
                          │   Resume EN.md / Resume RU.md   │
                          └─────────────────────────────────┘
```

### Tech stack

| Layer | Tech |
|---|---|
| **Frontend / SSR** | Nuxt 4, Vue 3, TypeScript |
| **UI** | shadcn-vue (Reka UI), Tailwind CSS v4, Lucide icons, `@nuxtjs/color-mode` |
| **State / data** | Pinia, VueUse, TanStack Vue Table |
| **Database** | PostgreSQL via [`postgres`](https://github.com/porsager/postgres) (direct driver) |
| **Auth** | GitHub OAuth + encrypted cookie sessions ([`nuxt-auth-utils`](https://github.com/atinux/nuxt-auth-utils)) |
| **Automation** | n8n (self-hosted) |
| **AI** | OpenAI (scoring + cover letters) |
| **Hosting** | Vercel (app) + your own n8n instance |

---

## Getting started

### Prerequisites

- **Node.js 20+** and npm
- A **PostgreSQL database** (any provider — Supabase, Neon, Railway, or local Postgres)
- A **GitHub OAuth app** (for login)
- A running **[n8n](https://n8n.io)** instance (self-hosted or cloud) — for the automated collection
- An **OpenAI API key** — for AI scoring and cover letters
- *(optional)* A **Telegram bot** token + chat id — for alerts
- *(optional)* A **GitHub personal access token** — only if you want the live-resume feature

> You can run the **app alone** (just Postgres + GitHub login) and add jobs by hand. n8n, OpenAI and
> Telegram are what make it *automatic*.

---

### 1. Clone & install

```bash
git clone <your-fork-url> autohq
cd autohq
npm install
```

### 2. Set up the database

Create a PostgreSQL database and set `DATABASE_URL` (step 4), then apply the schema:

```bash
npm run db:migrate
```

This runs the SQL files in [`db/migrations/`](db/migrations/) in order, tracking what's been
applied in a `schema_migrations` table — so it's safe to re-run and safe against an existing
database (the migrations are idempotent). [`0001_init.sql`](db/migrations/0001_init.sql) creates
all tables: `jobs`, `app_config`, `source_settings`, `profile`.

To evolve the schema later, add a new numbered file (`db/migrations/0002_*.sql`) and run
`npm run db:migrate` again. There's no Row Level Security — access is enforced by the app's auth
middleware, and the app connects with the database owner role.

### 3. Configure GitHub OAuth

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. **Authorization callback URL**: `https://<your-app-domain>/auth/github`
   (locally: `http://localhost:3000/auth/github`).
3. Copy the **Client ID** and generate a **Client Secret** — these go into
   `NUXT_OAUTH_GITHUB_CLIENT_ID` / `NUXT_OAUTH_GITHUB_CLIENT_SECRET` (step 4).
4. *(single-user lock)* Any GitHub account can complete OAuth, so set `OWNER_GITHUB` to your
   GitHub login. The OAuth callback ([`server/routes/auth/github.get.ts`](server/routes/auth/github.get.ts))
   rejects any other login.

### 4. Environment variables

Copy the example and fill it in:

```bash
cp .env.example .env
```

```dotenv
# ── Database ───────────────────────────────────────────
# Postgres connection string. With Supabase use the "postgres" role string;
# on Vercel use the pooler (pgBouncer, port 6543).
DATABASE_URL=postgresql://postgres:password@host:5432/postgres

# ── Auth ───────────────────────────────────────────────
NUXT_OAUTH_GITHUB_CLIENT_ID=your-oauth-client-id
NUXT_OAUTH_GITHUB_CLIENT_SECRET=your-oauth-client-secret
# Encrypts the session cookie. At least 32 chars: openssl rand -base64 32
NUXT_SESSION_PASSWORD=change-me-to-a-random-string-32-chars-min

# GitHub login of the single owner. ANY GitHub account can pass OAuth,
# so the callback rejects anyone whose login != this value.
# Leave empty to disable the gate (local dev). REQUIRED in production.
OWNER_GITHUB=your-github-username

# ── Frontend (public, exposed to the browser) ──────────
# Show sample jobs on the Jobs page instead of querying the DB (dev/demo).
NUXT_PUBLIC_USE_SAMPLE_DATA=false
# Control-page links (all optional, each shown only if set). NUXT_PUBLIC_APP_URL
# builds the displayed webhook URL; if empty, the current origin is used.
NUXT_PUBLIC_N8N_URL=https://n8n.example.com
NUXT_PUBLIC_TELEGRAM_BOT=@your_bot
NUXT_PUBLIC_APP_URL=https://your-app.example.com

# ── Server-only ────────────────────────────────────────
# Shared secret n8n must send in the `x-webhook-secret` header
WEBHOOK_SECRET=choose-a-long-random-string

# Optional: live-resume feature (reads Resume *.md from a GitHub repo)
RESUME_REPO=your-username/your-private-repo
RESUME_PATH_EN=Personal/Resume EN.md
RESUME_PATH_RU=Personal/Resume RU.md
GITHUB_TOKEN=ghp_xxx
```

> **Live resume** is configured via `RESUME_REPO` / `RESUME_PATH_EN` / `RESUME_PATH_RU` /
> `GITHUB_TOKEN` (see [`server/api/resume.get.ts`](server/api/resume.get.ts)). Point them at your
> own repo and Markdown files, or drop the Resume page if you don't need it.

### 5. Run it

```bash
npm run dev      # http://localhost:3000
```

Sign in with GitHub works locally as long as your OAuth app's callback URL includes
`http://localhost:3000/auth/github`. Set `NUXT_PUBLIC_USE_SAMPLE_DATA=true` to show a few sample
rows on the Jobs page instead of querying the DB, so the UI isn't empty before you add data.
Build for production with `npm run build`.

### 6. Deploy the app (Vercel)

The repo is Vercel-ready ([`vercel.json`](vercel.json)):

1. Import the repo into Vercel.
2. Add all the env vars from step 4 in **Project → Settings → Environment Variables**.
3. Deploy. Your webhook endpoint is now `https://<your-app>.vercel.app/api/webhook/jobs`.

### 7. Wire up n8n (the automation)

The [`n8n/`](n8n/) folder contains starter workflow exports and helper scripts.

1. **Push the workflows via the Public API** (recommended) — the JSON files are
   templates: they carry `{{APP_URL}}` and `{{WEBHOOK_SECRET}}` placeholders that
   `n8n:sync` renders from your `.env` at push time, so each workflow already points
   at your app with the right webhook secret — no manual node editing.
   ```bash
   # set N8N_API_URL + N8N_API_KEY (Settings → n8n API), plus
   # NUXT_PUBLIC_APP_URL + WEBHOOK_SECRET in .env first
   npm run n8n:sync            # create/update by name
   npm run n8n:sync -- --activate
   ```
   `n8n:sync` ([`n8n/sync.cjs`](n8n/sync.cjs)) matches workflows by name (safe to re-run) and
   fails loudly if a placeholder has no env value, rather than pushing a broken workflow.
   Each workflow fetches postings, maps them to the AutoHQ format, and POSTs to your webhook.

   *(Alternatively, import [`n8n/workflow-remotive.json`](n8n/workflow-remotive.json) /
   [`n8n/workflow-hh.json`](n8n/workflow-hh.json) via the UI's *Import from File* — but then
   you must fill the `{{APP_URL}}` / `{{WEBHOOK_SECRET}}` placeholders in the nodes by hand.)*
2. **Live settings are already wired** — keywords, the search period, and (for HH) a fresh OAuth
   token are read at runtime from the app via a *Get Config* node baked into each workflow, so you
   change them on the *Control* page, not in n8n.
3. **AI cover letters are already wired** — each workflow fetches the live resume (`GET /api/resume`),
   builds a language-aware prompt from the job description, and calls OpenAI (*OpenAI Cover Letter* node)
   before posting the result with a `cover_letter`. You only need to attach the credential: create an
   **Header Auth** credential with header `Authorization` = `Bearer sk-…` and select it on the
   *OpenAI Cover Letter* node (never inline the key). Optional next step: add an *OpenAI Score* node that
   returns a `fit_score`, and a Telegram node gated on the webhook's `telegram_notify` response.
4. **Activate** the workflows. They'll run on their cron schedule and your dashboard fills up.

The webhook respects your **live settings**: a posting is skipped if its source is disabled in the
*Control* page, and Telegram only fires when `fit_score ≥ telegram_min_score` (default 70). n8n reads
the current keywords and threshold from `GET /api/config` on each run.

---

## Project structure

```
autohq/
├── app/
│   ├── pages/                 # Dashboard, Jobs, Applications, Resume, Control, Login
│   │   ├── index.vue          #   Dashboard: stats, funnel, top matches
│   │   ├── jobs/              #   list (filters + bulk ops), detail, manual add
│   │   ├── applications.vue   #   what you've applied to
│   │   ├── profile.vue        #   live-rendered resume (EN/RU)
│   │   └── automations.vue    #   "Control": keywords, threshold, source toggles
│   ├── components/
│   │   ├── app/AppSidebar.vue
│   │   └── ui/                # shadcn-vue components
│   ├── composables/useJobStatus.ts   # single source of truth for statuses & score colors
│   └── layouts/               # default (app shell) + auth (login)
├── server/
│   ├── api/
│   │   ├── jobs/...           # CRUD + bulk ops for the jobs table
│   │   ├── webhook/jobs.post.ts   # ← n8n posts here; the heart of ingestion
│   │   ├── config.get.ts / .patch.ts  # live keywords + telegram threshold
│   │   ├── sources/...        # per-source enable/disable
│   │   └── resume.get.ts      # pulls resume Markdown from GitHub
│   ├── routes/auth/github.get.ts  # GitHub OAuth callback (owner-gate)
│   ├── middleware/auth.ts     # requires a session for /api/* (except webhook/resume)
│   └── utils/db.ts            # postgres connection pool (useDb())
├── db/migrations/             # numbered .sql migrations (npm run db:migrate)
├── scripts/migrate.mjs        # forward-only migration runner
├── n8n/                       # workflow exports + local prompt-testing helpers
└── nuxt.config.ts
```

---

## Job pipeline statuses

`new` → `reviewing` → `applied` → `interviewing` → `offer` — plus `rejected` and `archived`.
Defined once in [`app/composables/useJobStatus.ts`](app/composables/useJobStatus.ts) (labels, colors,
which statuses count as "applied", score-to-color thresholds), so the whole UI stays consistent.

## Customizing

- **What gets searched** — edit keywords on the *Control* page (stored in `app_config`, read live by n8n).
- **Score threshold for alerts** — the slider on *Control* (`telegram_min_score`).
- **Sources** — toggle existing ones on *Control*; add a new one by creating a new n8n workflow + a row
  in `source_settings`.
- **Scoring & cover-letter prompts** — they live in the n8n OpenAI nodes. Tune them to your stack and tone.

---

## Security notes

This was built as a **single-user personal tool**, so a few things are deliberately loose — review
before exposing it more widely:

- **Access is owner-gated, not multi-tenant.** Any GitHub account can pass OAuth, so the OAuth
  callback (`server/routes/auth/github.get.ts`) rejects any login other than `OWNER_GITHUB`, and
  the server middleware (`server/middleware/auth.ts`) requires a valid session for every data
  endpoint. There is no per-user data isolation — for a team you'd add `user_id`-scoped rows and
  filter every query by the logged-in user.
- **The webhook auth is a single shared secret** (`x-webhook-secret`). Keep `WEBHOOK_SECRET` long and
  private; rotate if leaked.
- **Never commit real keys.** `.env` is gitignored. Keep OpenAI / n8n / Telegram secrets in n8n
  credentials or environment variables — never inline them in tracked files.

---

<div align="center">

Built with Nuxt, PostgreSQL, n8n and a lot of "why am I doing this by hand".

</div>
