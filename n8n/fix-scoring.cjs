/* eslint-disable */
/**
 * AutoHQ scoring + cover-letter fixer.
 * Rewrites a single n8n workflow export (array form) in place-ish:
 *   1. OpenAI Score  -> grounds the prompt in the REAL fetched resume,
 *                       switches to a 0-100 direct scale with bands,
 *                       upgrades model to gpt-4o (temperature 0.1).
 *   2. Parse Score   -> fit_score = the raw 0-100 score (no more *10).
 *   3. Cover Gate    -> new IF node: only score >= threshold gets a letter.
 *   4. Build Payload No Cover -> clone of the final payload with empty letter.
 *   5. Rewires connections accordingly. Idempotent.
 *
 * Usage: node fix-scoring.cjs <in.json> <out.json>
 */
const fs = require('fs')
const [, , inPath, outPath] = process.argv
if (!inPath || !outPath) { console.error('usage: node fix-scoring.cjs in.json out.json'); process.exit(1) }

const arr = JSON.parse(fs.readFileSync(inPath, 'utf8'))
const wf = arr[0]
const byName = (n) => wf.nodes.find(x => x.name === n)

// single-quoted JS string literal for embedding inside an n8n ={{ }} expression
const lit = (s) => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'"

const hasGetConfig = !!byName('Get Config')

// ---------- 1. OpenAI Score ----------
const score = byName('OpenAI Score')
if (!score) { console.error(inPath + ': no OpenAI Score node, skipping'); process.exit(0) }

const rubric =
`You are a STRICT job-fit scorer for ONE specific candidate. Read the candidate's REAL resume below, then score how well a single job matches THIS candidate. Output an integer 0-100.

=== CANDIDATE RESUME ===
`

const rubric2 =
`

=== HOW TO SCORE (pick the band that fits, then fine-tune inside it; USE THE FULL RANGE) ===
85-100  Bullseye: role is primarily Vue / Nuxt / TypeScript frontend, or JS/TS full-stack. Remote.
70-84   Strong: JS/TS frontend on another framework (React / Angular), or full-stack leaning JS; the candidate's skills clearly transfer.
50-69   Partial: frontend-adjacent but a real stack mismatch, or full-stack where JS is only a minor part.
25-49   Weak: engineering, but the PRIMARY stack is something the candidate does NOT do as a main skill - backend-only Python / Java / PHP / .NET / Go, mobile, data engineering, no-code / WordPress / Webflow.
1-24    No match: not primarily software engineering (analyst, product / project manager, designer, standalone QA, marketing, sales, recruiting, HR), OR it demands a primary language the candidate does not have.

=== MODIFIERS ===
- Requires on-site / no remote: subtract 30.
- A tangential link ("nice to have", "would be a plus", "could learn") is NOT a match - never inflate for it.
- Be decisive. Most jobs are NOT a strong match. Do NOT cluster scores around 70 - a perfect match should reach 90+, a clear mismatch should fall below 40.

=== JOB ===
Title: `

const tail = `

Respond ONLY with valid JSON: {"score": <integer 0-100>, "reason": "one sentence naming the single deciding factor"}`

const content =
  lit(rubric) +
  " + (($('Get Resume').item.json.en || '').slice(0, 3000))" +
  ' + ' + lit(rubric2) +
  " + ($('Map fields').item.json.title || '')" +
  ' + ' + lit('\nCompany: ') + " + ($('Map fields').item.json.company || '')" +
  ' + ' + lit('\nKeywords: ') + " + ($('Map fields').item.json.notes || '')" +
  ' + ' + lit('\nDescription: ') + " + ($('Map fields').item.json.description || '').slice(0, 2000)" +
  ' + ' + lit(tail)

score.parameters.jsonBody =
  '={{ JSON.stringify({ model: \'gpt-4o\', temperature: 0.1, messages: [{ role: \'user\', content: ' +
  content +
  ' }], response_format: { type: \'json_object\' } }) }}'

// ---------- 2. Parse Score (drop the *10) ----------
const parse = byName('Parse Score')
const fitAssign = parse.parameters.assignments.assignments.find(a => a.name === 'fit_score')
fitAssign.value = '={{ Math.max(0, Math.min(100, Math.round(JSON.parse($json.choices[0].message.content).score))) }}'

// ---------- 3 + 4. Cover gate + no-cover payload ----------
const coverLetter = byName('OpenAI Cover Letter')
const finalPayload = byName('Build Final Payload')
const scorePos = score.position || [0, 0]

if (!byName('Cover Gate')) {
  const threshold = hasGetConfig
    ? "={{ Number($('Get Config').item.json.telegram_min_score || 70) }}"
    : '={{ 70 }}'

  const gate = {
    id: 'cover-gate-1',
    name: 'Cover Gate',
    type: 'n8n-nodes-base.if',
    typeVersion: 2,
    position: [scorePos[0] + 220, scorePos[1] + 200],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{
          id: 'cg1',
          leftValue: '={{ $json.fit_score }}',
          rightValue: threshold,
          operator: { type: 'number', operation: 'gte' },
        }],
        combinator: 'and',
      },
      options: {},
    },
  }

  // clone the final payload, but with an empty cover letter
  const noCover = JSON.parse(JSON.stringify(finalPayload))
  noCover.id = 'build-no-cover-1'
  noCover.name = 'Build Payload No Cover'
  noCover.position = [(finalPayload.position || [0, 0])[0], (finalPayload.position || [0, 0])[1] + 220]
  const cl = noCover.parameters.assignments.assignments.find(a => a.name === 'cover_letter')
  if (cl) cl.value = ''

  wf.nodes.push(gate, noCover)

  // rewire
  const c = wf.connections
  // whatever the final payload feeds (e.g. Send to AutoHQ) — reuse for no-cover branch
  const downstream = c['Build Final Payload'] ? c['Build Final Payload'].main : [[]]

  c['Parse Score'] = { main: [[{ node: 'Cover Gate', type: 'main', index: 0 }]] }
  c['Cover Gate'] = {
    main: [
      [{ node: 'OpenAI Cover Letter', type: 'main', index: 0 }], // true  -> write letter
      [{ node: 'Build Payload No Cover', type: 'main', index: 0 }], // false -> skip
    ],
  }
  c['Build Payload No Cover'] = { main: JSON.parse(JSON.stringify(downstream)) }
} else {
  console.log(inPath + ': Cover Gate already present, prompts/score refreshed only')
}

fs.writeFileSync(outPath, JSON.stringify(arr, null, 2))
console.log('OK ' + outPath + '  (getConfig=' + hasGetConfig + ', nodes=' + wf.nodes.length + ')')
