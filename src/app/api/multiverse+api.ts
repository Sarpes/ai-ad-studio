// POST /api/multiverse: the approved 3 ideas -> 3 images in parallel (one per universe).
// Charging: 1 credit per image that actually came back; failed universes cost nothing.
// Free tier: images are downscaled and stamped "Made with AdVerse" on the server.
import { z } from 'zod';

import { decodeB64, editImage, upload, watermark } from '@/server/fal';
import { fail, parse, PhotoBody, UserBody } from '@/server/http';
import { assertCanAfford, charge, remember, resolveTier } from '@/server/ledger';
import { imagePrompt } from '@/lib/universes';

const Idea = z.object({
  universe: z.string(),
  scene: z.string().min(3).max(800),
  headline: z.string().max(80),
  caption: z.string().max(240),
});

const Body = UserBody.extend({ photo: PhotoBody, ideas: z.array(Idea).min(1).max(3) });

export async function POST(req: Request) {
  try {
    const b = await parse(req, Body);
    const tier = await resolveTier(b.userId, b.tier);
    await assertCanAfford(b.userId, tier, b.ideas.length, 'image'); // 1 credit per universe

    const productUrl = await upload(decodeB64(b.photo.b64), b.photo.mime);
    const results = await Promise.allSettled(
      b.ideas.map(async (idea) => {
        const raw = await editImage(imagePrompt(idea.scene), [productUrl]);
        return { url: tier === 'free' ? await watermark(raw) : raw, raw };
      }),
    );

    const cards = b.ideas.map((idea, i) => {
      const r = results[i];
      return {
        universe: idea.universe,
        headline: idea.headline,
        caption: idea.caption,
        url: r.status === 'fulfilled' ? r.value.url : null,
        watermarked: tier === 'free',
      };
    });
    const raws = results.map((r) => (r.status === 'fulfilled' ? r.value.raw : undefined));
    const ok = cards.filter((c) => c.url);
    await charge(b.userId, tier, ok.length);
    remember(
      b.userId,
      cards.flatMap((c, i) =>
        c.url
          ? [{
              kind: 'image' as const, url: c.url, universe: c.universe, headline: c.headline, caption: c.caption,
              watermarked: c.watermarked, rawUrl: c.watermarked ? raws[i] : undefined, createdAt: new Date().toISOString(),
            }]
          : [],
      ),
    );
    results.forEach(
      (r) =>
        r.status === 'rejected' &&
        console.warn('[multiverse] universe failed', r.reason, JSON.stringify((r.reason as { body?: unknown })?.body)),
    );
    return Response.json({ tier, charged: ok.length, cards, productUrl });
  } catch (e) {
    return fail(e);
  }
}
