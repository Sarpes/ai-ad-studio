import { z } from 'zod';

import { OutOfCredits } from './ledger';

export const UserBody = z.object({
  userId: z.string().trim().min(1).max(80),
  tier: z.enum(['free', 'creator', 'studio']),
  lang: z.enum(['en', 'tr']).default('en'),
});

export const PhotoBody = z.object({
  b64: z.string().min(100).max(12_000_000),
  mime: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export async function parse<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<z.infer<T>> {
  const body = await req.json().catch(() => null);
  const r = schema.safeParse(body);
  if (!r.success) throw new BadRequest(r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  return r.data;
}

export class BadRequest extends Error {}

/** Maps errors to the status codes the app understands. `code` is machine-readable for the UI. */
export function fail(e: unknown) {
  if (e instanceof OutOfCredits) return Response.json({ code: 'out_of_credits', reason: e.message }, { status: 402 });
  if (e instanceof BadRequest) return Response.json({ code: 'bad_request', reason: e.message }, { status: 400 });
  console.error('[api]', e);
  const msg = (e as Error).message ?? '';
  if (msg.includes('Demo limit')) return Response.json({ code: 'limit', reason: msg }, { status: 429 });
  return Response.json({ code: 'glitch', reason: msg }, { status: 502 });
}
