// Gate for the "upgrade after free" path (bug seen 7 Nov on phone, account "Rehelsal 3"):
// a free Multiverse must store the clean original server-side and must NOT expose it to the app.
// Costs ~$0.12 (3 images). Usage: node scripts/check-clean-source.mjs [port]
import fs from 'node:fs';

const port = process.argv[2] ?? '8082';
const base = `http://localhost:${port}`;
const user = `clean-check-${Date.now()}`;
const post = async (p, body) =>
  (await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();

const src = 'https://storage.googleapis.com/falserverless/example_inputs/nano-banana-edit-input.png';
const photo = { b64: Buffer.from(await (await fetch(src)).arrayBuffer()).toString('base64'), mime: 'image/png' };
const { ideas } = await post('/api/director', { lang: 'en', mode: 'choose', picks: ['luxe', 'neon', 'wild'] });
const mv = await post('/api/multiverse', { userId: user, tier: 'free', lang: 'en', photo, ideas });
const acc = await post('/api/account', { userId: user, tier: 'free', lang: 'en' });

const ledger = JSON.parse(fs.readFileSync('data/ledger.json', 'utf8'))[user];
const stored = ledger.history.filter((h) => h.watermarked);
const fails = [];
if (stored.length === 0) fails.push('no watermarked images stored');
if (stored.some((h) => !h.rawUrl || h.rawUrl === h.url)) fails.push('watermarked image without a distinct rawUrl');
if (JSON.stringify(mv).includes('rawUrl') || JSON.stringify(acc).includes('rawUrl')) fails.push('rawUrl leaked to the app');
const leakedRaw = stored.some((h) => JSON.stringify(mv).includes(h.rawUrl) || JSON.stringify(acc).includes(h.rawUrl));
if (leakedRaw) fails.push('clean URL value leaked to the app');

console.log(`stored watermarked: ${stored.length}, with rawUrl: ${stored.filter((h) => h.rawUrl).length}`);
console.log(fails.length ? `FAIL: ${fails.join('; ')}` : 'PASS');
process.exit(fails.length ? 1 : 0);
