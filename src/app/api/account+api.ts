// POST /api/account: balance, free-tier counter and recent ads for the logged-in name.
// `topup: true` is the local fallback grant, used only when RevenueCat Virtual Currency is not configured.
import { z } from 'zod';

import { fail, parse, UserBody } from '@/server/http';
import { addLocalCredits, getAccount, resolveTier } from '@/server/ledger';
import * as rc from '@/server/revenuecat';

const Body = UserBody.extend({ topup: z.boolean().optional() });

export async function POST(req: Request) {
  try {
    const b = await parse(req, Body);
    const tier = await resolveTier(b.userId, b.tier);
    if (b.topup && !rc.enabled()) addLocalCredits(b.userId, 10);
    return Response.json({ ...(await getAccount(b.userId, tier)), verified: rc.enabled() });
  } catch (e) {
    return fail(e);
  }
}
