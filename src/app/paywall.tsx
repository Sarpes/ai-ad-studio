// Plans: Free / Creator / Studio (monthly, RevenueCat subscriptions) + one-time top-up.
// Purchases go through RevenueCat Test Store. Copy is plain language (brand kit: no metaphors on money).
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Header, RevenueCatBadge, s } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { buy, loadPackages, useSession, type Tier } from '@/lib/session';
import { C, F } from '@/lib/theme';

const PLANS: { tier: Tier; pkg: string | null; price: string }[] = [
  { tier: 'free', pkg: null, price: '$0' },
  { tier: 'creator', pkg: '$rc_custom_creator', price: '$12.99' },
  { tier: 'studio', pkg: '$rc_custom_studio', price: '$29.99' },
];

export default function Paywall() {
  const { t } = useT();
  const ses = useSession();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const [pkgs, setPkgs] = useState<PurchasesPackage[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    loadPackages().then(setPkgs).catch((e) => setMsg(String(e?.message ?? e)));
  }, [ses.rcReady]);

  const canBuy = ses.rcReady && pkgs.length > 0;

  async function purchase(id: string) {
    const pkg = pkgs.find((p) => p.identifier === id);
    if (!pkg) return;
    setBusy(id);
    setMsg(null);
    try {
      const kind = await buy(pkg);
      setMsg(`${kind === 'topup' ? t.toppedUp : t.purchased} ${t.verifiedBy(ses.userId ?? '')}`);
    } catch (e) {
      const err = e as { userCancelled?: boolean; message?: string };
      setMsg(err.userCancelled ? t.cancelled : String(err.message));
    } finally {
      setBusy(null);
    }
  }

  const names = { free: t.tierFree, creator: t.tierCreator, studio: t.tierStudio };
  const descs = { free: t.tierFreeDesc, creator: t.tierCreatorDesc, studio: t.tierStudioDesc };
  const rank = { free: 0, creator: 1, studio: 2 };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.void }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <Header />
        <Text style={s.h1}>{t.paywallTitle}</Text>
        <Text style={[s.hint, { marginTop: 8, marginBottom: 14 }]}>{t.paywallBody}</Text>
        <View style={{ marginBottom: 16 }}>
          <RevenueCatBadge customer={ses.rcReady ? ses.userId : null} />
        </View>

        {PLANS.map((p) => {
          const current = ses.tier === p.tier;
          const isStudio = p.tier === 'studio';
          const pkg = pkgs.find((x) => x.identifier === p.pkg);
          return (
            <View
              key={p.tier}
              style={[s.card, { marginBottom: 12, borderColor: isStudio ? C.lilac : C.line, borderWidth: isStudio ? 2 : 1 }]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={[s.h2, { marginBottom: 0 }]}>{names[p.tier]}</Text>
                <Text style={{ fontFamily: F.heading, color: C.star, fontSize: 20 }}>
                  {pkg?.product.priceString ?? p.price}
                  {p.tier !== 'free' && <Text style={[s.mono, { fontSize: 11 }]}> {t.perMonth}</Text>}
                </Text>
              </View>
              <Text style={[s.hint, { marginTop: 6, marginBottom: 12 }]}>{descs[p.tier]}</Text>
              {current ? (
                <Text style={[s.mono, { color: C.lime }]}>{t.current.toUpperCase()}</Text>
              ) : p.tier === 'free' ? null : rank[ses.tier] > rank[p.tier] ? null : (
                <Button
                  label={t.subscribe}
                  kind={isStudio ? 'primary' : 'secondary'}
                  onPress={() => purchase(p.pkg!)}
                  busy={busy === p.pkg}
                  disabled={!canBuy || busy !== null}
                />
              )}
            </View>
          );
        })}

        <Pressable
          onPress={() => purchase('$rc_custom_topup')}
          disabled={!canBuy || busy !== null || ses.tier === 'free'}
          style={[s.card, { flexDirection: 'row', alignItems: 'center', opacity: ses.tier === 'free' ? 0.5 : 1 }]}
          accessibilityRole="button"
        >
          <View style={{ flex: 1 }}>
            <Text style={[s.h2, { fontSize: 16, marginBottom: 2 }]}>{t.topup}</Text>
            <Text style={s.hint}>{t.topupDesc}</Text>
          </View>
          <Text style={{ fontFamily: F.heading, color: C.star, fontSize: 18 }}>
            {pkgs.find((x) => x.identifier === '$rc_custom_topup')?.product.priceString ?? '$4.99'}
          </Text>
        </Pressable>

        {!canBuy && <Text style={[s.hint, { color: C.lilac, marginTop: 12 }]}>{Platform.OS === 'web' ? t.buyOnPhone : t.buyOnPhone}</Text>}
        {msg && <Text style={[s.body, { marginTop: 12 }]}>{msg}</Text>}

        <Button
          label={onboarding ? (ses.tier === 'free' ? t.continueFree : t.loginCta) : t.back}
          kind="ghost"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/create'))}
          style={{ marginTop: 18 }}
        />
        <Text style={[s.mono, { textAlign: 'center', marginTop: 18 }]}>{t.poweredBy.toUpperCase()}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
