import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import { Unbounded_600SemiBold, Unbounded_800ExtraBold, useFonts } from '@expo-google-fonts/unbounded';
import { getLocales } from 'expo-localization';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { setLang } from '@/lib/i18n';
import { C } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();
// Default language = phone language (TR if Turkish, else EN); the header toggle overrides it.
setLang(getLocales()[0]?.languageCode === 'tr' ? 'tr' : 'en');

export default function RootLayout() {
  const [loaded] = useFonts({
    Unbounded_600SemiBold, Unbounded_800ExtraBold, Inter_400Regular, Inter_600SemiBold, SpaceMono_400Regular,
  });
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);
  if (!loaded) return null;
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.void } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="create" />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
