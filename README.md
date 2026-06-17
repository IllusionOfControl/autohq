<div align="center">

# ⚡ AutoHQ

### AI-powered job search OS

Collects job postings from multiple sources, scores every one against **your** profile with AI,
auto-writes cover letters, pings you on Telegram about the good ones — and gives you a clean
dashboard to run the whole pipeline from "new" to "offer".

[![Nuxt](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt.js&logoColor=white)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3-42b883?logo=vue.js&logoColor=white)](https://vuejs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
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

> **Note** — this started as a personal tool for one job seeker, so the auth is single-user (GitHub
> OAuth, owner only) and RLS is wide-open for authenticated users. If you fork it for a team, tighten
> the policies first (see [Security notes](#security-notes)).

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
                          │                   Supabase                         │
                          │  (Postgres: jobs, app_config, source_settings,     │
                          │   profile)  +  Auth: GitHub OAuth                   │
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
| **Database & Auth** | Supabase (Postgres + GitHub OAuth) |
| **Automation** | n8n (self-hosted) |
| **AI** | OpenAI (scoring + cover letters) |
| **Hosting** | Vercel (app) + your own n8n instance |

---

## Getting started

### Prerequisites

- **Node.js 20+** and npm
- A free **[Supabase](https://supabase.com)** project
- A **GitHub OAuth app** (for login)
- A running **[n8n](https://n8n.io)** instance (self-hosted or cloud) — for the automated collection
- An **OpenAI API key** — for AI scoring and cover letters
- *(optional)* A **Telegram bot** token + chat id — for alerts
- *(optional)* A **GitHub personal access token** — only if you want the live-resume feature

> You can run the **app alone** (just Supabase + GitHub login) and add jobs by hand. n8n, OpenAI and
> Telegram are what make it *automatic*.

---

### 1. Clone & install

```bash
git clone <your-fork-url> autohq
cd autohq
npm install
```

### 2. Set up Supabase

Create a project, then open **SQL Editor** and run the following. The base `jobs` table:

```sql
create table if not exists jobs (
  id            bigint generated always as identity primary key,
  title         text not null,
  company       text not null,
  url           text,
  location      text,
  remote        boolean default false,
  status        text default 'new',          -- new | reviewing | applied | interviewing | offer | rejected | archived
  fit_score     integer,                     -- 0–100
  salary_min    integer,
  salary_max    integer,
  notes         text,
  description   text,
  cover_letter  text,
  score_reason  text,
  source        text,                        -- remotive | arbeitnow | hh | djinni
  created_at    timestamptz default now()
);
```

Then run the migration files in [`supabase/`](supabase/) (order doesn't matter much, but this is safe):

```
supabase/ai_fields.sql        -- description / cover_letter / score_reason + dedupe-by-URL index
supabase/app_config.sql       -- live tunables: keywords + telegram_min_score (single row)
supabase/source_settings.sql  -- per-source on/off toggles (remotive, arbeitnow, hh, djinni)
supabase/profile.sql          -- candidate profile (single row)
supabase/rls_policies.sql     -- Row Level Security for the jobs table
```

### 3. Configure GitHub OAuth

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. **Authorization callback URL**: `https://<your-supabase-ref>.supabase.co/auth/v1/callback`.
3. In Supabase → **Authentication → Providers → GitHub**, paste the Client ID and Secret, enable it.
4. *(single-user lock)* The app is intended for one owner — restrict sign-ups in Supabase Auth
   settings or check the user id in middleware if you want to be strict.

### 4. Environment variables

Copy the example and fill it in:

```bash
cp .env.example .env
```

```dotenv
# ── Public (browser-safe) ──────────────────────────────
NUXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NUXT_PUBLIC_SUPABASE_KEY=your-anon-key

# ── Server-only ────────────────────────────────────────
# Shared secret n8n must send in the `x-webhook-secret` header
WEBHOOK_SECRET=choose-a-long-random-string

# Service-role key — lets the webhook write to Supabase bypassing RLS
SUPABASE_SERVICE_KEY=your-service-role-key

# Optional: live-resume feature (reads Resume *.md from a GitHub repo)
GITHUB_TOKEN=ghp_xxx
```

> **Live resume** points at a hard-coded repo/paths in [`server/api/resume.get.ts`](server/api/resume.get.ts)
> (`REPO` and `PATHS`). Change those to your own repo and Markdown files, or drop the Resume page if you
> don't need it.

### 5. Run it

```bash
npm run dev      # http://localhost:3000
```

In development, the GitHub-login redirect is disabled (see [`nuxt.config.ts`](nuxt.config.ts)) so you
can work locally without OAuth bouncing you to production. Build for production with `npm run build`.

### 6. Deploy the app (Vercel)

The repo is Vercel-ready ([`vercel.json`](vercel.json)):

1. Import the repo into Vercel.
2. Add all the env vars from step 4 in **Project → Settings → Environment Variables**.
3. Deploy. Your webhook endpoint is now `https://<your-app>.vercel.app/api/webhook/jobs`.

### 7. Wire up n8n (the automation)

The [`n8n/`](n8n/) folder contains starter workflow exports and helper scripts.

1. **Import a base workflow** — in n8n, *Import from File* → [`n8n/workflow-remotive.json`](n8n/workflow-remotive.json)
   or [`n8n/workflow-hh.json`](n8n/workflow-hh.json). Each one fetches postings, maps them to the
   AutoHQ format, and POSTs to your webhook.
2. **Point it at your app** — set the HTTP Request node URL to your `/api/webhook/jobs` and add the
   header `x-webhook-secret: <WEBHOOK_SECRET>`.
3. **Add the AI layer** — in the n8n editor, drop in an OpenAI (HTTP Request / OpenAI node) step after
   the mapping node that returns a `fit_score` and a `cover_letter`, then a Telegram node for jobs above
   your threshold. Store your OpenAI key as an n8n credential — never inline it. You can iterate on the
   cover-letter prompt locally with [`n8n/test-cover.cjs`](n8n/test-cover.cjs) (`OPENAI_KEY=sk-... node n8n/test-cover.cjs en`).
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
├── server/api/
│   ├── webhook/jobs.post.ts   # ← n8n posts here; the heart of ingestion
│   ├── config.get.ts / .patch.ts      # live keywords + telegram threshold
│   ├── sources/...            # per-source enable/disable
│   └── resume.get.ts          # pulls resume Markdown from GitHub
├── supabase/                  # SQL migrations (run in the SQL editor)
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

- **RLS is wide open** for authenticated users (`using (true)`), and `app_config` / `source_settings`
  allow all. Fine for one owner; tighten for multi-user.
- **The webhook auth is a single shared secret** (`x-webhook-secret`). Keep `WEBHOOK_SECRET` long and
  private; rotate if leaked.
- **Never commit real keys.** `.env` is gitignored. Keep OpenAI / n8n / Telegram secrets in n8n
  credentials or environment variables — never inline them in tracked files.

---

<div align="center">

Built with Nuxt, Supabase, n8n and a lot of "why am I doing this by hand".

</div>
