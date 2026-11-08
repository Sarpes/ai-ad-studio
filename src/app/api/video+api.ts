// POST /api/video: one finished ad image -> one vertical clip. Paid tiers only.
// Short (5 s, 5 credits) for Creator and Studio; Premium (10 s, 10 credits) for Studio only.
import { z } from 'zod';

import { makeVideo } from '@/server/fal';
import { fail, parse, UserBody } from '@/server/http';
import { DEFAULT_MOTION, VIDEO_RULES } from '@/lib/universes';
import { assertCanAfford, charge, cleanSource, OutOfCredits, remember, resolveTier } from '@/server/ledger';

const Body = UserBody.extend({
  imageUrl: z.string().url(),
  length: z.enum(['short', 'premium']),
  universe: z.string(),
  headline: z.string().max(80).default(''),
  motion: z.string().trim().min(3).max(1200).optional(), // user-edited "what happens in the video"
});

export async function POST(req: Request) {
  try {
    const b = await parse(req, Body);
    const tier = await resolveTier(b.userId, b.tier);
    if (tier === 'free') throw new OutOfCredits('video-locked');
    if (b.length === 'premium' && tier !== 'studio') throw new OutOfCredits('premium-locked');
    const cost = b.length === 'premium' ? 10 : 5;
    await assertCanAfford(b.userId, tier, cost, 'video');

    // Paid users get a clean video even from an image they made while on Free (no watermark baked in).
    const prompt = `${b.motion ?? DEFAULT_MOTION} ${VIDEO_RULES}`;
    const url = await makeVideo(cleanSource(b.userId, b.imageUrl), prompt, b.length === 'premium' ? '10' : '5');
    await charge(b.userId, tier, cost);
    remember(b.userId, [
      { kind: 'video', url, universe: b.universe, headline: b.headline, createdAt: new Date().toISOString() },
    ]);
    return Response.json({ tier, charged: cost, url });
  } catch (e) {
    return fail(e);
  }
}
