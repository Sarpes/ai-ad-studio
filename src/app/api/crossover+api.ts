// POST /api/crossover: product photo + creator photo -> 1 image in one universe (Glow by default).
// Consent is required (brand kit p.04, plan p.08/p.10). 1 credit.
import { z } from 'zod';

import { decodeB64, editImage, upload, watermark } from '@/server/fal';
import { BadRequest, fail, parse, PhotoBody, UserBody } from '@/server/http';
import { assertCanAfford, charge, remember, resolveTier } from '@/server/ledger';
import { crossoverPrompt } from '@/lib/universes';

const Body = UserBody.extend({
  product: PhotoBody,
  person: PhotoBody,
  consent: z.literal(true, { message: 'consent required' }),
  scene: z.string().min(3).max(800),
  headline: z.string().max(80),
  caption: z.string().max(240),
});

export async function POST(req: Request) {
  try {
    const b = await parse(req, Body).catch((e) => {
      throw e instanceof BadRequest && e.message.includes('consent') ? new BadRequest('consent required') : e;
    });
    const tier = await resolveTier(b.userId, b.tier);
    await assertCanAfford(b.userId, tier, 1, 'image');

    const [productUrl, personUrl] = await Promise.all([
      upload(decodeB64(b.product.b64), b.product.mime),
      upload(decodeB64(b.person.b64), b.person.mime),
    ]);
    const raw = await editImage(crossoverPrompt(b.scene), [productUrl, personUrl]);
    const url = tier === 'free' ? await watermark(raw) : raw;
    await charge(b.userId, tier, 1);
    const card = { universe: 'glow', headline: b.headline, caption: b.caption, url, watermarked: tier === 'free' };
    remember(b.userId, [{ kind: 'image', ...card, createdAt: new Date().toISOString() }]);
    return Response.json({ tier, charged: 1, cards: [card], productUrl });
  } catch (e) {
    return fail(e);
  }
}
