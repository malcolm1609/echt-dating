import { HankenGrotesk_400Regular } from '@expo-google-fonts/hanken-grotesk/400Regular';
import { HankenGrotesk_500Medium } from '@expo-google-fonts/hanken-grotesk/500Medium';
import { HankenGrotesk_600SemiBold } from '@expo-google-fonts/hanken-grotesk/600SemiBold';
import { HankenGrotesk_700Bold } from '@expo-google-fonts/hanken-grotesk/700Bold';
import { useFonts } from 'expo-font';
import { enableAppSwitcherProtectionAsync, preventScreenCaptureAsync } from 'expo-screen-capture';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { colors } from '../src/ui/theme';

export default function Layout() {
  // Keine Screenshots und Bildschirmaufnahmen von Profilen, Chats und Fotos (im Browser nicht möglich).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    preventScreenCaptureAsync().catch(() => {});
    if (Platform.OS === 'ios') enableAppSwitcherProtectionAsync(0.6).catch(() => {});
  }, []);
  const [loaded, error] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    // Fraunces mit weichen Formen (SOFT 100), als feste Schnitte aus der variablen Schrift.
    Fraunces_500Soft: require('../assets/fonts/Fraunces-Soft-Medium.ttf'),
    Fraunces_500SoftItalic: require('../assets/fonts/Fraunces-Soft-MediumItalic.ttf'),
    Fraunces_600Soft: require('../assets/fonts/Fraunces-Soft-SemiBold.ttf'),
  });
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right', animationDuration: 280 }} />
    </>
  );
}
