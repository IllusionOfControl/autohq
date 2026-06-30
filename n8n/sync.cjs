/**
 * Push the workflow JSON files in this folder to an n8n instance via its
 * Public REST API — create new ones, update existing ones (matched by name).
 *
 * Why "by name": the public API has no upsert, and the JSON files don't carry a
 * stable instance id. So we list workflows, match on `name`, then PUT or POST.
 *
 * Templating: workflow files may contain {{TOKEN}} placeholders (e.g.
 * {{APP_URL}}, {{AUTOHQ_SECRET_TOKEN}}) that are rendered from env right before
 * push — so the committed JSON stays free of instance URLs and secrets, and
 * the same files target any environment. See TOKENS below.
 *
 * Prompt includes: a {{>name}} placeholder is replaced with the contents of
 * n8n/prompts/name.txt, JSON-escaped so it slots into an existing JSON string
 * value. This keeps long LLM prompts out of the workflow JSON and lets both
 * workflows share one prompt file. See renderIncludes below.
 *
 * OpenAI credential: the proper OpenAI node (@n8n/n8n-nodes-langchain.openAi)
 * authenticates via an n8n credential referenced by id — a key cannot live in
 * the workflow JSON. So this script creates that credential from env
 * (OPENAI_API_KEY / OPENAI_BASE_URL) and fills its id into the
 * {{OPENAI_CREDENTIAL_ID}} placeholder. The Public API can neither list nor
 * patch credentials, so the id is cached in n8n/.credentials.json (gitignored)
 * and an "update" is a delete + recreate. See ensureOpenAiCredential below.
 *
 * Env:
 *   N8N_API_URL          base URL of the instance, e.g. https://n8n.example.com
 *   N8N_API_KEY          Public API key (n8n → Settings → n8n API)
 *   NUXT_PUBLIC_APP_URL  app origin; fills {{APP_URL}} (webhook/config URLs)
 *   AUTOHQ_SECRET_TOKEN  shared secret; fills {{AUTOHQ_SECRET_TOKEN}}
 *   OPENAI_API_KEY       OpenAI key; used to (re)create the OpenAI credential
 *   OPENAI_BASE_URL      OpenAI-compatible base URL (default api.openai.com/v1)
 *
 * Usage:
 *   node n8n/sync.cjs [file ...]      # defaults to n8n/workflow-*.json
 *   node n8n/sync.cjs --activate      # also activate each synced workflow
 *
 * Note: the Telegram credential is NOT part of the workflow JSON and must be
 * configured once in n8n by hand.
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
  AUTOHQ_SECRET_TOKEN: process.env.AUTOHQ_SECRET_TOKEN || process.env.NUXT_AUTOHQ_SECRET_TOKEN || '',
}
/** Env var that backs each token, for actionable error messages. */
const ENV_FOR = {
  APP_URL: 'NUXT_PUBLIC_APP_URL',
  AUTOHQ_SECRET_TOKEN: 'AUTOHQ_SECRET_TOKEN',
  OPENAI_CREDENTIAL_ID: 'OPENAI_API_KEY',
}

/** Directory holding {{>name}} prompt includes. */
const PROMPTS_DIR = path.join(__dirname, 'prompts')
/** Local id cache for credentials created via the Public API (gitignored). */
const CRED_CACHE = path.join(__dirname, '.credentials.json')
/** Stable name for the OpenAI credential this script manages. */
const OPENAI_CRED_NAME = 'AutoHQ OpenAI'

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

/**
 * Replace {{>name}} includes with the contents of n8n/prompts/name.txt,
 * JSON-escaped (no surrounding quotes) so the placeholder can sit inside an
 * existing JSON string value, e.g. "content": "={{>cover-letter}}". Matches
 * lowercase [a-z0-9_-] names, so it never collides with {{TOKEN}} or n8n's own
 * {{ $json }} expressions. Throws if a referenced file is missing.
 */
function renderIncludes(text, file) {
  return text.replace(/\{\{>([a-z0-9_-]+)\}\}/g, (m, name) => {
    const p = path.join(PROMPTS_DIR, `${name}.txt`)
    if (!fs.existsSync(p)) {
      throw new Error(`${path.basename(file)}: missing prompt include n8n/prompts/${name}.txt`)
    }
    const content = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '')
    return JSON.stringify(content).slice(1, -1)
  })
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

function readCredCache() {
  try { return JSON.parse(fs.readFileSync(CRED_CACHE, 'utf8')) } catch { return {} }
}

function writeCredCache(cache) {
  fs.writeFileSync(CRED_CACHE, JSON.stringify(cache, null, 2) + '\n')
}

/**
 * Ensure an OpenAI API credential built from env exists in n8n and return its
 * id. The Public API can neither list nor patch credentials, so we cache the id
 * locally and "update" by deleting the previous one and creating a fresh one —
 * that way a rotated OPENAI_API_KEY / OPENAI_BASE_URL actually takes effect.
 */
async function ensureOpenAiCredential() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY must be set — it backs the n8n OpenAI credential')
  }
  const url = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')

  const cache = readCredCache()
  const prevId = cache.openai?.id
  if (prevId) {
    // Drop the stale credential so the new key/url take effect (ignore if gone).
    try { await req('DELETE', `/credentials/${prevId}`) } catch { /* already removed */ }
  }

  const created = await req('POST', '/credentials', {
    name: OPENAI_CRED_NAME,
    type: 'openAiApi',
    // header/allowedHttpRequestDomains must be set explicitly: the schema's
    // `if: { properties: { header: { enum: [true] } } }` also matches when the
    // field is absent, which would wrongly demand headerName/headerValue. false
    // = standard Bearer auth; 'all' = no per-domain restriction on the key.
    data: { apiKey, url, header: false, allowedHttpRequestDomains: 'all' },
  })

  cache.openai = { id: created.id, name: OPENAI_CRED_NAME }
  writeCredCache(cache)
  console.log(`🔑 credential  ${OPENAI_CRED_NAME} (${created.id})`)
  return created.id
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
  const raw = fs.readFileSync(file, 'utf8')
  const text = renderIncludes(renderTokens(raw, file), file)
  const parsed = JSON.parse(text)
  return Array.isArray(parsed) ? parsed[0] : parsed
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

  // Provision the OpenAI credential first so {{OPENAI_CREDENTIAL_ID}} resolves.
  TOKENS.OPENAI_CREDENTIAL_ID = await ensureOpenAiCredential()

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
