import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { backend } from '../src/lib/backend';
import { Button, Field, Screen } from '../src/ui/kit';
import { font } from '../src/ui/theme';

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
      <Text style={font.title}>{sent ? 'Code eingeben' : 'Deine E-Mail'}</Text>
      <Text style={font.small}>{sent ? `Wir haben dir einen Code an ${email} geschickt.` : 'Wir schicken dir einen Code, kein Passwort nötig.'}</Text>
      {sent ? (
        <Field label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" error={error} />
      ) : (
        <Field label="E-Mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={error} />
      )}
      <Button
        title={sent ? 'Bestätigen' : 'Code senden'}
        disabled={busy || (sent ? code.length < 6 : !email.includes('@'))}
        onPress={() =>
          run(async () => {
            if (!sent) {
              await backend.sendCode(email.trim());
              setSent(true);
            } else {
              await backend.verifyCode(email.trim(), code.trim());
              router.replace('/profil');
            }
          })
        }
      />
    </Screen>
  );
}
