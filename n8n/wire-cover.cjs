/**
 * Upgrade the "OpenAI Cover Letter" node in a source workflow:
 *  - add a "Get Resume" node (GET /api/resume?lang=both) after the trigger
 *  - add a cleaned `description` field to "Map fields" (HTML-stripped, capped)
 *  - rewrite the cover-letter prompt to use the live resume + job description
 *    and to detect the job language and write the letter in that language.
 *
 * Usage: node wire-cover.cjs <in.json> <out.json>
 */
const fs = require('fs')
const [file, out] = process.argv.slice(2)
const RESUME_URL = 'https://credorevolution.space/api/resume?lang=both'

const data = JSON.parse(fs.readFileSync(file, 'utf8'))
const wf = Array.isArray(data) ? data[0] : data

const trigger = wf.nodes.find(n => n.type === 'n8n-nodes-base.scheduleTrigger')
if (!trigger) throw new Error('no trigger: ' + wf.name)
const cl = wf.nodes.find(n => /cover letter/i.test(n.name))
if (!cl) throw new Error('no cover letter node: ' + wf.name)
const map = wf.nodes.find(n => /^map/i.test(n.name))
if (!map) throw new Error('no map node: ' + wf.name)

// 1) Get Resume node + rewire trigger -> Get Resume -> (old first node)
const firstNode = wf.connections[trigger.name]?.main?.[0]?.[0]?.node
if (!firstNode) throw new Error('no first node: ' + wf.name)
if (!wf.nodes.find(n => n.name === 'Get Resume')) {
  wf.nodes.push({
    id: 'get-resume-' + Math.random().toString(36).slice(2, 8),
    name: 'Get Resume',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [trigger.position[0] + 110, trigger.position[1] + 170],
    parameters: { url: RESUME_URL, options: {} },
  })
  wf.connections[trigger.name] = { main: [[{ node: 'Get Resume', type: 'main', index: 0 }]] }
  wf.connections['Get Resume'] = { main: [[{ node: firstNode, type: 'main', index: 0 }]] }
}

// 2) cleaned description on Map fields (idempotent)
const assigns = map.parameters.assignments.assignments
if (!assigns.find(a => a.name === 'description')) {
  assigns.push({
    id: 'desc-' + Math.random().toString(36).slice(2, 8),
    name: 'description',
    type: 'string',
    value: "={{ (($json.description || '') + '').replace(/<[^>]*>/g,' ').replace(/\\s+/g,' ').trim().slice(0,1500) }}",
  })
}

// 3) new cover-letter prompt
const esc = s => s.replace(/\n/g, '\\n')
const EN = "($('Get Resume').item.json.en || '')"
const RU = "($('Get Resume').item.json.ru || '')"
const TITLE = "($('Map fields').item.json.title || '')"
const COMPANY = "($('Map fields').item.json.company || '')"
const DESC = "($('Map fields').item.json.description || '')"

const SEG1 = 'You are writing a tailored cover letter on behalf of the candidate.\n\n'
  + 'LANGUAGE: detect the language of the JOB from its title and description, then write the ENTIRE letter in that language (a Russian job produces a Russian letter, an English job produces an English letter). Use the candidate resume written in that same language.\n\n'
  + '=== CANDIDATE RESUME (English) ===\n'
const SEG2 = '\n=== CANDIDATE RESUME (Russian) ===\n'
const SEG3 = '\n\n=== JOB ===\nTitle: '
const SEG4 = '\nCompany: '
const SEG5 = '\nDescription: '
const SEG6 = '\n\n=== RULES ===\n'
  + '- 3 to 4 short paragraphs. No header, no date, no salutation line. Start directly with the first content paragraph.\n'
  + '- Connect 2 to 3 concrete things from the resume to specific requirements in the job description.\n'
  + '- Professional but human tone. Avoid cliches such as excited to apply, passionate developer, or I am writing to.\n'
  + '- If the description is empty, write a strong letter based on the resume and the job title.\n'
  + '- End with one clear call to action. Output ONLY the letter text, nothing else.'

const content =
  "'" + esc(SEG1) + "' + " + EN +
  " + '" + esc(SEG2) + "' + " + RU +
  " + '" + esc(SEG3) + "' + " + TITLE +
  " + '" + esc(SEG4) + "' + " + COMPANY +
  " + '" + esc(SEG5) + "' + " + DESC +
  " + '" + esc(SEG6) + "'"

cl.parameters.specifyBody = 'json'
cl.parameters.sendBody = true
cl.parameters.jsonBody =
  "={{ JSON.stringify({model: 'gpt-4o-mini', messages: [{role: 'user', content: " + content + " }]}) }}"

fs.writeFileSync(out, JSON.stringify([wf]))
console.log('COVER UPGRADED: ' + wf.name)
