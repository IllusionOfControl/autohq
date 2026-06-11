const w = require(process.argv[2])[0]
const map = w.nodes.find(n => /^map/i.test(n.name))
const cl = w.nodes.find(n => /cover letter/i.test(n.name))
const body = cl ? String(cl.parameters.jsonBody) : ''
console.log(JSON.stringify({
  name: w.name,
  active: w.active,
  getResume: !!w.nodes.find(n => n.name === 'Get Resume'),
  mapHasDescription: !!map?.parameters?.assignments?.assignments?.find(a => a.name === 'description'),
  coverUsesResume: body.includes("Get Resume') .item".replace(' ', '')) || body.includes("$('Get Resume')"),
  coverUsesDescription: body.includes('description'),
}))
