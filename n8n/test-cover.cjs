/**
 * Local quality test for the new cover-letter prompt.
 * Reads the real resumes from the vault, builds the exact prompt the n8n node
 * will send, calls OpenAI, and prints the resulting letter.
 *
 * Usage: OPENAI_KEY=sk-... node test-cover.cjs [en|ru]
 */
const fs = require('fs')
const VAULT = 'D:/Obsidian Vaults/Main/obsidian-git-sync/Personal'
const en = fs.readFileSync(VAULT + '/Resume EN.md', 'utf8')
const ru = fs.readFileSync(VAULT + '/Resume RU.md', 'utf8')

// sample jobs
const JOBS = {
  en: {
    title: 'Senior Frontend Engineer (Vue/Nuxt)',
    company: 'Northwind Labs',
    description: 'We are a remote-first SaaS team looking for a senior frontend engineer with deep Vue 3 and Nuxt experience. You will own complex SPA modules, work closely with our backend (Node.js), and help us introduce AI-assisted features. TypeScript is required. Bonus: experience with automation tooling (n8n), analytics, and shipping products end-to-end in a small team.',
  },
  ru: {
    title: 'Frontend-разработчик (Vue 3)',
    company: 'ТехноСофт',
    description: 'Ищем сильного фронтенд-разработчика на Vue 3 / Nuxt в удалённую команду. Нужен опыт с TypeScript, построением SPA, интеграцией с бэкендом на Node.js. Плюсом будет опыт автоматизации (n8n) и работа в стартапе с широкой зоной ответственности.',
  },
}
const job = JOBS[process.argv[2] === 'ru' ? 'ru' : 'en']

const isRu = /[Ѐ-ӿ]/.test((job.title || '') + (job.description || ''))
const content =
  'You are writing a tailored cover letter on behalf of the candidate. Write the ENTIRE letter in ' +
  (isRu ? 'Russian' : 'English') + ' only. Do not use any other language.\n\n' +
  '=== CANDIDATE RESUME ===\n' + (isRu ? ru : en) +
  '\n\n=== JOB ===\nTitle: ' + job.title +
  '\nCompany: ' + job.company +
  '\nDescription: ' + job.description +
  '\n\n=== RULES ===\n' +
  '- 3 to 4 short paragraphs. No header, no date, no salutation line. Start directly with the first content paragraph.\n' +
  '- Connect 2 to 3 concrete things from the resume to specific requirements in the job description.\n' +
  '- Professional but human tone. Avoid cliches such as excited to apply, passionate developer, or I am writing to.\n' +
  '- If the description is empty, write a strong letter based on the resume and the job title.\n' +
  '- End with one clear call to action. Output ONLY the letter text, nothing else.'

;(async () => {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.OPENAI_KEY },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content }] }),
  })
  const j = await r.json()
  console.log('JOB:', job.title, '@', job.company, '\n')
  console.log('LETTER:\n' + (j.choices?.[0]?.message?.content ?? JSON.stringify(j)))
})()
