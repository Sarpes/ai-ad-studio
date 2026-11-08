// Server-side account state, keyed by the RevenueCat app user ID (the login name).
// Free tier: 3 images per 7-day window, only during the first 30 days of the account.
// Paid credits: RevenueCat Virtual Currency "CRD" when RC_SECRET_KEY is set (source of truth);
// otherwise a local balance in this file (hackathon fallback, see DECISIONS.md D5).
import fs from 'node:fs';
import path from 'node:path';

import * as rc from './revenuecat';

export type Tier = 'free' | 'creator' | 'studio';

export type HistoryItem = {
  kind: 'image' | 'video';
  url: string;
  universe: string;
  headline?: string;
  caption?: string;
  watermarked?: boolean;
  rawUrl?: string; // clean original of a watermarked image; server-only, never returned to the app
  createdAt: string;
};

/** For a paid user animating an image they made while free: use the clean original. */
export function cleanSource(userId: string, url: string): string {
  const db = load();
  const h = db[userId]?.history.find((x) => x.url === url);
  return h?.rawUrl ?? url;
}

type Account = {
  createdAt: string;
  weekStart: string;
  freeUsed: number;
  localCredits: number;
  grantedTiers: Tier[];
  history: HistoryItem[];
};

const FILE = path.join(process.cwd(), 'data', 'ledger.json');
const DAY = 24 * 60 * 60 * 1000;
export const FREE_PER_WEEK = 3;
const FREE_DAYS = 30;
const TIER_GRANT: Record<Tier, number> = { free: 0, creator: 40, studio: 100 };

function load(): Record<string, Account> {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

function save(db: Record<string, Account>) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

function account(db: Record<string, Account>, userId: string): Account {
  const now = new Date().toISOString();
  db[userId] ??= { createdAt: now, weekStart: now, freeUsed: 0, localCredits: 0, grantedTiers: [], history: [] };
  const a = db[userId];
  // roll the 7-day free window
  if (Date.now() - Date.parse(a.weekStart) >= 7 * DAY) {
    a.weekStart = now;
    a.freeUsed = 0;
  }
  return a;
}

function freeState(a: Account) {
  const endsAt = Date.parse(a.createdAt) + FREE_DAYS * DAY;
  const active = Date.now() < endsAt;
  return {
    freeActive: active,
    freeLeft: active ? Math.max(0, FREE_PER_WEEK - a.freeUsed) : 0,
    freeResetsAt: new Date(Date.parse(a.weekStart) + 7 * DAY).toISOString(),
    freeEndsAt: new Date(endsAt).toISOString(),
  };
}

/** Resolve the tier: RevenueCat entitlements when the secret key is set, else the app's claim. */
// Fail closed: with RevenueCat verification on, an unverifiable tier is 'free'. Trusting the app's claim
// (and the local top-up grant) is only allowed behind ALLOW_INSECURE_DEMO=1 (DECISIONS.md D5).
export const insecureDemo = () => process.env.ALLOW_INSECURE_DEMO === '1';

export async function resolveTier(userId: string, claimed: Tier): Promise<Tier> {
  const verified = await rc.activeTier(userId);
  if (verified) return verified;
  return !rc.enabled() && insecureDemo() ? claimed : 'free';
}

async function paidBalance(userId: string, a: Account): Promise<number> {
  const remote = await rc.creditBalance(userId);
  return remote ?? a.localCredits;
}

export async function getAccount(userId: string, tier: Tier) {
  const db = load();
  const a = account(db, userId);
  // Fallback grant (only used when RevenueCat VC is not reachable): first time we see a paid tier.
  if (tier !== 'free' && !a.grantedTiers.includes(tier) && !rc.enabled() && insecureDemo()) {
    a.localCredits += TIER_GRANT[tier];
    a.grantedTiers.push(tier);
  }
  save(db);
  return { userId, tier, credits: await paidBalance(userId, a), ...freeState(a), history: a.history.slice(-20).reverse().map(({ rawUrl: _raw, ...h }) => h) };
}

export class OutOfCredits extends Error {}

/** Throws OutOfCredits if the user cannot afford `cost` now. Does not charge. */
export async function assertCanAfford(userId: string, tier: Tier, cost: number, kind: 'image' | 'video') {
  const db = load();
  const a = account(db, userId);
  save(db);
  if (tier === 'free') {
    if (kind === 'video') throw new OutOfCredits('video-locked');
    if (freeState(a).freeLeft < cost) throw new OutOfCredits('free-exhausted');
    return;
  }
  if ((await paidBalance(userId, a)) < cost) throw new OutOfCredits('no-credits');
}

/** Charge only for what was actually delivered (failed images are never charged). */
export async function charge(userId: string, tier: Tier, cost: number) {
  if (cost <= 0) return;
  const db = load();
  const a = account(db, userId);
  if (tier === 'free') {
    a.freeUsed += cost;
  } else if (!(await rc.spendCredits(userId, cost))) {
    a.localCredits = Math.max(0, a.localCredits - cost);
  }
  save(db);
}

export function addLocalCredits(userId: string, n: number) {
  const db = load();
  account(db, userId).localCredits += n;
  save(db);
}

export function remember(userId: string, items: HistoryItem[]) {
  const db = load();
  account(db, userId).history.push(...items);
  save(db);
}
