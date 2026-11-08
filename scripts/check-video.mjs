// Real video smoke test through /api/video with a Studio demo user (needs ALLOW_INSECURE_DEMO=1).
// Costs one short clip (H3 Max 5 s = $0.175). Usage: node scripts/check-video.mjs [port] [imageUrl]
const port = process.argv[2] ?? '8082';
const img = process.argv[3] ?? 'https://v3b.fal.media/files/b/0ab185a7/0r4j9RfQ2e74QiHK9cfMr_1794062478525.jpeg';
const base = `http://localhost:${port}`;
const user = `video-check-${Date.now()}`;
const post = async (p, body) => {
  const r = await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json() };
};
await post('/api/account', { userId: user, tier: 'studio', lang: 'en' }); // demo grant: 100 credits
const t = Date.now();
const r = await post('/api/video', {
  userId: user, tier: 'studio', lang: 'en', imageUrl: img, length: 'short', universe: 'luxe',
  motion: 'Soft light sweeps across the marble, the camera slowly circles the bottle.',
});
const secs = ((Date.now() - t) / 1000).toFixed(0);
const acc = await post('/api/account', { userId: user, tier: 'studio', lang: 'en' });
console.log(`video -> ${r.status} in ${secs}s, charged=${r.json.charged}, credits now ${acc.json.credits}`);
console.log(r.json.url ?? JSON.stringify(r.json));
process.exit(r.status === 200 && r.json.charged === 5 && acc.json.credits === 95 ? 0 : 1);
