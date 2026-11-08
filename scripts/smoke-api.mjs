// End-to-end API smoke test against the running dev server (real fal calls, costs ~$0.12).
// Usage: node scripts/smoke-api.mjs [port] [imagePathOrUrl]
import fs from 'node:fs';

const port = process.argv[2] ?? '8082';
const src = process.argv[3] ?? 'https://storage.googleapis.com/falserverless/example_inputs/nano-banana-edit-input.png';
const base = `http://localhost:${port}`;
const user = `smoke-${Date.now()}`;

async function post(p, body) {
  const t = Date.now();
  const res = await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json();
  console.log(`${p} -> ${res.status} in ${((Date.now() - t) / 1000).toFixed(1)}s`);
  return { status: res.status, json };
}

const bytes = src.startsWith('http') ? Buffer.from(await (await fetch(src)).arrayBuffer()) : fs.readFileSync(src);
const mime = src.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
const photo = { b64: bytes.toString('base64'), mime };

let r = await post('/api/account', { userId: user, tier: 'free', lang: 'en' });
console.log('  account:', JSON.stringify({ freeLeft: r.json.freeLeft, credits: r.json.credits, verified: r.json.verified }));

r = await post('/api/director', { lang: 'tr', mode: 'director', product: 'product in the photo' });
console.log('  source:', r.json.source);
for (const i of r.json.ideas ?? []) console.log(`  ${i.universe}: ${i.headline} | ${i.caption}`);
const ideas = r.json.ideas;

r = await post('/api/multiverse', { userId: user, tier: 'free', lang: 'en', photo, ideas });
console.log('  charged:', r.json.charged, 'code:', r.json.code ?? '-');
for (const c of r.json.cards ?? []) console.log(`  ${c.universe} wm=${c.watermarked} ${c.url}`);

r = await post('/api/account', { userId: user, tier: 'free', lang: 'en' });
console.log('  after: freeLeft', r.json.freeLeft, 'history', r.json.history?.length);

r = await post('/api/multiverse', { userId: user, tier: 'free', lang: 'en', photo, ideas });
console.log('  4th free image blocked ->', r.status, r.json.code, r.json.reason);
