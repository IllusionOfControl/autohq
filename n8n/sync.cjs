/**
 * Push the workflow JSON files in this folder to an n8n instance via its
 * Public REST API — create new ones, update existing ones (matched by name).
 *
 * Why "by name": the public API has no upsert, and the JSON files don't carry a
 * stable instance id. So we list workflows, match on `name`, then PUT or POST.
 *
 * Templating: workflow files may contain {{TOKEN}} placeholders (e.g.
 * {{APP_URL}}, {{WEBHOOK_SECRET}}) that are rendered from env right before
 * push — so the committed JSON stays free of instance URLs and secrets, and
 * the same files target any environment. See TOKENS below.
 *
 * Env:
 *   N8N_API_URL          base URL of the instance, e.g. https://n8n.example.com
 *   N8N_API_KEY          Public API key (n8n → Settings → n8n API)
 *   NUXT_PUBLIC_APP_URL  app origin; fills {{APP_URL}} (webhook/config URLs)
 *   WEBHOOK_SECRET       shared webhook secret; fills {{WEBHOOK_SECRET}}
 *
 * Usage:
 *   node n8n/sync.cjs [file ...]      # defaults to n8n/workflow-*.json
 *   node n8n/sync.cjs --activate      # also activate each synced workflow
 *
 * Note: other credentials (OpenAI / Telegram) are NOT part of the workflow JSON
 * and must be configured once in n8n by hand.
 */
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const activate = args.includes('--activate')
const files = args.filter(a => !a.startsWith('--'))

const base = (process.env.N8N_API_URL || '').replace(/\/$/, '')
const key = process.env.N8N_API_KEY
if (!base || !key) {
  console.error('✗ N8N_API_URL and N8N_API_KEY must be set')
  process.exit(1)
}

const api = `${base}/api/v1`
const headers = { 'X-N8N-API-KEY': key, 'Content-Type': 'application/json', Accept: 'application/json' }

/** {{TOKEN}} placeholders in workflow files, resolved from env at push time. */
const TOKENS = {
  APP_URL: (process.env.NUXT_PUBLIC_APP_URL || '').replace(/\/$/, ''),
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || process.env.NUXT_WEBHOOK_SECRET || '',
}
/** Env var that backs each token, for actionable error messages. */
const ENV_FOR = { APP_URL: 'NUXT_PUBLIC_APP_URL', WEBHOOK_SECRET: 'WEBHOOK_SECRET' }

/**
 * Replace {{TOKEN}} placeholders from TOKENS. Matches only [A-Z0-9_] between
 * the braces, so n8n expressions like {{ $json }} (spaces, $) are left intact.
 * Throws if any placeholder is missing or has an empty value, rather than
 * pushing a half-rendered workflow.
 */
function renderTokens(text, file) {
  const missing = new Set()
  const out = text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, name) => {
    const val = TOKENS[name]
    if (!val) { missing.add(name); return m }
    return val
  })
  if (missing.size) {
    const lines = [...missing].map(n => `    {{${n}}}  → set ${ENV_FOR[n] || n} in .env`)
    throw new Error(`${path.basename(file)}: unresolved placeholders:\n${lines.join('\n')}`)
  }
  return out
}

async function req(method, urlPath, body) {
  const res = await fetch(api + urlPath, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const msg = data?.message || text || res.statusText
    throw new Error(`${method} ${urlPath} → ${res.status}: ${msg}`)
  }
  return data
}

/** All workflows, following pagination. */
async function listWorkflows() {
  const all = []
  let cursor
  do {
    const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
    const page = await req('GET', `/workflows${q}`)
    all.push(...(page.data || []))
    cursor = page.nextCursor
  } while (cursor)
  return all
}

/** The Public API rejects unknown/read-only props, so send only these. */
function sanitize(wf) {
  return {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || {},
  }
}

function loadWorkflow(file) {
  const text = renderTokens(fs.readFileSync(file, 'utf8'), file)
  const raw = JSON.parse(text)
  return Array.isArray(raw) ? raw[0] : raw
}

function resolveFiles() {
  if (files.length) return files
  const dir = __dirname
  return fs.readdirSync(dir)
    .filter(f => /^workflow-.*\.json$/.test(f))
    .map(f => path.join(dir, f))
}

async function main() {
  const targets = resolveFiles()
  if (targets.length === 0) {
    console.error('✗ no workflow files found (expected n8n/workflow-*.json)')
    process.exit(1)
  }

  const existing = await listWorkflows()
  const byName = new Map(existing.map(w => [w.name, w]))

  for (const file of targets) {
    const wf = loadWorkflow(file)
    if (!wf?.name) {
      console.error(`✗ ${path.basename(file)}: missing "name", skipped`)
      continue
    }

    const payload = sanitize(wf)
    const match = byName.get(wf.name)

    let saved
    if (match) {
      saved = await req('PUT', `/workflows/${match.id}`, payload)
      console.log(`↻ updated  ${wf.name}`)
    } else {
      saved = await req('POST', '/workflows', payload)
      console.log(`＋ created  ${wf.name}`)
    }

    if (activate && saved?.id) {
      await req('POST', `/workflows/${saved.id}/activate`)
      console.log(`  ✓ activated`)
    }
  }

  console.log('✓ sync complete')
}

main().catch((err) => {
  console.error('\n✗ sync failed:', err.message)
  process.exit(1)
})
