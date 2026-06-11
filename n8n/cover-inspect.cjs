const w = require(process.argv[2])[0]
console.log('\n################ ' + w.name)
const cl = w.nodes.find(n => /cover letter/i.test(n.name))
const score = w.nodes.find(n => /openai score/i.test(n.name))
const map = w.nodes.find(n => /^map/i.test(n.name))
console.log('NODES: ' + w.nodes.map(n => n.name).join(' | '))
if (map) {
  console.log('\n--- ' + map.name + ' assignments (available downstream fields):')
  const a = map.parameters?.assignments?.assignments || []
  for (const x of a) console.log('   ' + x.name + ' = ' + String(x.value).slice(0, 80))
}
if (cl) {
  console.log('\n--- COVER LETTER node: "' + cl.name + '"')
  console.log(String(cl.parameters?.jsonBody || '').slice(0, 900))
}
// hunt for "description" anywhere
const blob = JSON.stringify(w)
const hits = [...blob.matchAll(/[\w$().'\[\] ]{0,30}description[\w$().'\[\] ]{0,20}/gi)].map(m => m[0]).slice(0, 6)
console.log('\n--- "description" mentions: ' + (hits.length ? '' : 'NONE'))
hits.forEach(h => console.log('   …' + h + '…'))
