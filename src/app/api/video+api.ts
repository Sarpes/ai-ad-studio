// POST /api/video: one finished ad image -> one vertical clip. Paid tiers only.
// Short (5 s, 5 credits) for Creator and Studio; Premium (10 s, 10 credits) for Studio only.
import { z } from 'zod';

import { makeVideo } from '@/server/fal';
import { fail, parse, UserBody } from '@/server/http';
import { assertCanAfford, charge, cleanSource, OutOfCredits, remember, resolveTier } from '@/server/ledger';

const Body = UserBody.extend({
  imageUrl: z.string().url(),
  length: z.enum(['short', 'premium']),
  universe: z.string(),
  headline: z.string().max(80).default(''),
});

const MOTION =
  'Slow cinematic camera push-in around the product, gentle light movement in the scene, smooth premium commercial motion. ' +
  'The product packaging, logo and label stay exactly the same. No text appears.';

export async function POST(req: Request) {
  try {
    const b = await parse(req, Body);
    const tier = await resolveTier(b.userId, b.tier);
    if (tier === 'free') throw new OutOfCredits('video-locked');
    if (b.length === 'premium' && tier !== 'studio') throw new OutOfCredits('premium-locked');
    const cost = b.length === 'premium' ? 10 : 5;
    await assertCanAfford(b.userId, tier, cost, 'video');

    // Paid users get a clean video even from an image they made while on Free (no watermark baked in).
    const url = await makeVideo(cleanSource(b.userId, b.imageUrl), MOTION, b.length === 'premium' ? '10' : '5');
    await charge(b.userId, tier, cost);
    remember(b.userId, [
      { kind: 'video', url, universe: b.universe, headline: b.headline, createdAt: new Date().toISOString() },
    ]);
    return Response.json({ tier, charged: cost, url });
  } catch (e) {
    return fail(e);
  }
}
