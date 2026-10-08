import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { backend } from '../src/lib/backend';
import { matchStore } from '../src/lib/matches';
import { Button, Field, Screen, s } from '../src/ui/kit';
import { colors, font } from '../src/ui/theme';

// Nur im Testbetrieb: fertige Konten mit Passwort, damit man ohne E-Mail-Code, SMS und Ausweis hineinkommt.
const ACCOUNTS = [
  ['test-tom@example.com', 'Tom, 24, sucht Frauen'],
  ['test-lea@example.com', 'Lea, 23, sucht Männer'],
];

export default function TestAccess() {
  const [email, setEmail] = useState(ACCOUNTS[0][0]);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const signIn = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await backend.signInWithPassword(email.trim(), password);
      matchStore.reset();
      const { status } = await backend.myStatus();
      router.replace(status === 'admitted' ? '/heute' : '/status');
    } catch {
      setError('E-Mail oder Passwort stimmt nicht.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Zurück" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12} style={{ width: 44, height: 44, justifyContent: 'center' }}>
            <Feather name="chevron-left" size={28} color={colors.accent} />
          </Pressable>
          <Text accessibilityRole="header" style={font.display}>Testzugang</Text>
        </View>
        <Text style={font.body}>Beta mit Testserver: Alle Menschen hier sind Beispielprofile aus Gießen. Die Testkonten sind schon geprüft und zugelassen, zum Start warten zwei Matches und ein paar Vorschläge, die dich schon mögen.</Text>
      </View>
      <View style={[s.hint, { gap: 6 }]}>
        {ACCOUNTS.map(([mail, who]) => (
          <Text key={mail} style={font.small} onPress={() => setEmail(mail)}>{`${mail} · ${who}`}</Text>
        ))}
      </View>
      <Field label="E-Mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Field label="Passwort" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" error={error} />
      <View style={{ flex: 1 }} />
      <Button title="Anmelden" busy={busy} disabled={busy || !email.includes('@') || !password} onPress={signIn} />
    </Screen>
  );
}
