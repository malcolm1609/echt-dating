import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { backend } from '../src/lib/backend';
import { Button, Field, Screen, StepHeader } from '../src/ui/kit';
import { colors, font } from '../src/ui/theme';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch {
      setError(sent ? 'Der Code stimmt nicht oder ist abgelaufen.' : 'Das hat nicht geklappt. Prüfe die E-Mail-Adresse.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <StepHeader step={1} total={6} name="E-Mail" />
      <View style={{ gap: 12 }}>
        <Text style={font.display}>{sent ? 'Schau in\ndein Postfach' : 'Wie erreichen\nwir dich'}{sent ? '' : '?'}</Text>
        <Text style={font.body}>{sent ? `Der 6-stellige Code ist an ${email} unterwegs.` : 'Du bekommst einen Code per Mail. Kein Passwort, das du dir merken musst.'}</Text>
      </View>
      {sent ? (
        <Field label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" error={error} />
      ) : (
        <Field label="E-Mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={error} />
      )}
      <View style={{ flex: 1 }} />
      {sent && <Button title="Andere E-Mail" variant="ghost" onPress={() => { setSent(false); setCode(''); setError(undefined); }} />}
      <Button
        title={sent ? 'Bestätigen' : 'Code senden'}
        busy={busy}
        disabled={busy || (sent ? code.length < 6 : !email.includes('@'))}
        onPress={() =>
          run(async () => {
            if (!sent) {
              await backend.sendCode(email.trim());
              setSent(true);
            } else {
              await backend.verifyCode(email.trim(), code.trim());
              router.replace('/handy');
            }
          })
        }
      />
    </Screen>
  );
}
