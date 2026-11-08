// Who is logged in, which plan they have, and how many credits/free images are left.
// Identity = the login name, used as the RevenueCat app user ID (Purchases.logIn).
import Constants from 'expo-constants';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { getLang } from './i18n';

export type Tier = 'free' | 'creator' | 'studio';

export type HistoryItem = {
  kind: 'image' | 'video'; url: string; universe: string; headline?: string; caption?: string;
  watermarked?: boolean; createdAt: string;
};

export type Session = {
  userId: string | null;
  tier: Tier;
  credits: number;
  freeLeft: number;
  freeActive: boolean;
  freeResetsAt?: string;
  history: HistoryItem[];
  rcReady: boolean;
};

let state: Session = { userId: null, tier: 'free', credits: 0, freeLeft: 3, freeActive: true, history: [], rcReady: false };
const subs = new Set<() => void>();
function set(p: Partial<Session>) {
  state = { ...state, ...p };
  subs.forEach((f) => f());
}
export function useSession() {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => state, () => state);
}
export const session = () => state;

// ---------- server calls ----------
function base(): string {
  if (Platform.OS === 'web') return '';
  const host = Constants.expoConfig?.hostUri; // laptop LAN IP:port in Expo Go
  return process.env.EXPO_PUBLIC_API_URL ?? (host ? `http://${host}` : '');
}

export class ApiError extends Error {
  constructor(public code: string, public reason: string, public status: number) { super(reason); }
}

export async function api<T>(path: string, body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: state.userId, tier: state.tier, lang: getLang(), ...body }),
    });
  } catch {
    throw new ApiError('network', 'network', 0);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json.code ?? 'glitch', json.reason ?? '', res.status);
  return json as T;
}

// ---------- RevenueCat ----------
const RC_KEY = process.env.EXPO_PUBLIC_REVENUECAT_KEY;
export const OFFERING = 'adverse_tiers';

function tierFrom(info: CustomerInfo): Tier {
  const a = info.entitlements.active;
  return a.studio ? 'studio' : a.creator ? 'creator' : 'free';
}

export async function login(name: string) {
  const userId = name.trim();
  let tier: Tier = 'free';
  let rcReady = false;
  if (RC_KEY) {
    try {
      Purchases.configure({ apiKey: RC_KEY, appUserID: userId });
      const { customerInfo } = await Purchases.logIn(userId);
      tier = tierFrom(customerInfo);
      rcReady = true;
    } catch (e) {
      console.warn('[rc] login failed', e);
    }
  }
  set({ userId, tier, rcReady });
  await refresh();
}

export async function logout() {
  try { if (state.rcReady) await Purchases.logOut(); } catch { /* anonymous already */ }
  set({ userId: null, tier: 'free', credits: 0, history: [], rcReady: false });
}

export async function refresh() {
  if (!state.userId) return;
  if (state.rcReady) {
    try {
      const info = await Purchases.getCustomerInfo();
      set({ tier: tierFrom(info) });
    } catch { /* keep last known tier */ }
  }
  const acc = await api<Session & { verified: boolean }>('/api/account', {});
  set({
    tier: acc.tier, credits: acc.credits, freeLeft: acc.freeLeft, freeActive: acc.freeActive,
    freeResetsAt: acc.freeResetsAt, history: acc.history,
  });
}

export async function loadPackages(): Promise<PurchasesPackage[]> {
  if (!state.rcReady) return [];
  const o = await Purchases.getOfferings();
  return (o.all[OFFERING] ?? o.current)?.availablePackages ?? [];
}

export async function buy(pkg: PurchasesPackage): Promise<'plan' | 'topup'> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  const isTopup = pkg.product.identifier === 'adverse_topup_10';
  set({ tier: tierFrom(customerInfo) });
  await api('/api/account', { topup: isTopup });
  await refresh();
  return isTopup ? 'topup' : 'plan';
}
