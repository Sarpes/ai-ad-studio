// Gate: 1-universe runs. Director must return exactly `count` ideas; Multiverse must charge 1 per image.
// Costs ~$0.04. Usage: node scripts/check-count.mjs [port]
const port = process.argv[2] ?? '8082';
const base = `http://localhost:${port}`;
const user = `count-check-${Date.now()}`;
const post = async (p, body) => {
  const r = await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json() };
};
const src = 'https://storage.googleapis.com/falserverless/example_inputs/nano-banana-edit-input.png';
const photo = { b64: Buffer.from(await (await fetch(src)).arrayBuffer()).toString('base64'), mime: 'image/png' };
const fails = [];

for (const [mode, extra] of [['director', { count: 1 }], ['director', { count: 2 }], ['choose', { picks: ['neon'] }], ['idea', { count: 1, idea: 'floating on ice' }]]) {
  const r = await post('/api/director', { lang: 'en', mode, ...extra });
  const want = extra.picks ? extra.picks.length : extra.count;
  console.log(`director ${mode} want=${want} got=${r.json.ideas?.length} (${r.json.source})`);
  if (r.json.ideas?.length !== want) fails.push(`${mode}/${want}`);
}
const { json } = await post('/api/director', { lang: 'en', mode: 'choose', picks: ['luxe'] });
const mv = await post('/api/multiverse', { userId: user, tier: 'free', lang: 'en', photo, ideas: json.ideas });
const acc = await post('/api/account', { userId: user, tier: 'free', lang: 'en' });
console.log(`multiverse 1 idea -> ${mv.status}, charged=${mv.json.charged}, freeLeft=${acc.json.freeLeft}`);
if (mv.json.charged !== 1 || acc.json.freeLeft !== 2) fails.push('charge');
const bad = await post('/api/director', { lang: 'en', mode: 'choose', picks: [] });
console.log(`choose with 0 picks -> ${bad.status}`);
if (bad.status !== 400) fails.push('zero-picks not rejected');
console.log(fails.length ? `FAIL: ${fails.join(', ')}` : 'PASS');
process.exit(fails.length ? 1 : 0);
