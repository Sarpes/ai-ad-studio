// RevenueCat REST API v2, server side only. Needs RC_SECRET_KEY (a v2 secret key from the
// dashboard). Without it every function returns null/false and the ledger falls back to local state.
const BASE = 'https://api.revenuecat.com/v2';
const PROJECT = process.env.RC_PROJECT_ID ?? 'proj789921cd';
const CURRENCY = 'CRD';
const ENTITLEMENT_TIER: Record<string, 'creator' | 'studio'> = {
  entl696a03fcfa: 'creator',
  entledea9c6b21: 'studio',
};

export const enabled = () => Boolean(process.env.RC_SECRET_KEY);

async function call(method: string, p: string, body?: unknown) {
  const res = await fetch(`${BASE}/projects/${PROJECT}${p}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.RC_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`RevenueCat ${method} ${p} -> ${res.status} ${await res.text()}`);
  return res.json();
}

const cust = (id: string) => `/customers/${encodeURIComponent(id)}`;

export async function creditBalance(userId: string): Promise<number | null> {
  if (!enabled()) return null;
  try {
    const data = await call('GET', `${cust(userId)}/virtual_currencies`);
    const item = (data.items ?? []).find((i: { currency_code: string }) => i.currency_code === CURRENCY);
    return item?.balance ?? 0;
  } catch (e) {
    console.warn('[rc] balance failed', (e as Error).message);
    return null;
  }
}

export async function spendCredits(userId: string, n: number): Promise<boolean> {
  if (!enabled()) return false;
  try {
    await call('POST', `${cust(userId)}/virtual_currencies/transactions`, { adjustments: { [CURRENCY]: -n } });
    return true;
  } catch (e) {
    console.warn('[rc] spend failed', (e as Error).message);
    return false;
  }
}

export async function activeTier(userId: string): Promise<'free' | 'creator' | 'studio' | null> {
  if (!enabled()) return null;
  try {
    const data = await call('GET', `${cust(userId)}/active_entitlements`);
    const tiers = (data.items ?? []).map((i: { entitlement_id: string }) => ENTITLEMENT_TIER[i.entitlement_id]);
    return tiers.includes('studio') ? 'studio' : tiers.includes('creator') ? 'creator' : 'free';
  } catch (e) {
    console.warn('[rc] entitlements failed', (e as Error).message);
    return null;
  }
}
