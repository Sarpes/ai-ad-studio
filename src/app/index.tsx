// Login: the typed name becomes the RevenueCat customer ID. After login the plans are shown
// first (demo flow: login -> tiers -> choose Free -> create).
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Header, s } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { login } from '@/lib/session';
import { C, F } from '@/lib/theme';

export default function Login() {
  const { t } = useT();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    if (name.trim().length < 2) return;
    setBusy(true);
    setErr(null);
    try {
      await login(name);
      router.replace('/create');
      router.push({ pathname: '/paywall', params: { onboarding: '1' } });
    } catch {
      setErr(t.network);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.void }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: 16, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
          <Header />
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={[s.h1, { fontSize: 34, lineHeight: 40 }]}>{t.tagline}</Text>
            <Text style={[s.hint, { marginTop: 10, marginBottom: 32 }]}>{t.loginHint}</Text>
            <Text style={[s.h2, { fontSize: 16 }]}>{t.loginTitle}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              onSubmitEditing={go}
              placeholder="A Lab Study Club"
              placeholderTextColor={C.dust}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={60}
              style={{
                fontFamily: F.body, fontSize: 17, color: C.star, backgroundColor: C.deep, borderColor: C.line,
                borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 14,
              }}
            />
            <Button label={t.loginCta} onPress={go} busy={busy} disabled={name.trim().length < 2} />
            {err && <Text style={s.error}>{err}</Text>}
          </View>
          <Text style={[s.mono, { textAlign: 'center', marginBottom: 8 }]}>{t.poweredBy.toUpperCase()}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
