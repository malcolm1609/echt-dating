import { useEffect, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { formatPhone, normalizePhone } from '../domain/phone.ts';
import { Button, Field, s } from './kit';
import { useEntrance } from './motion';
import { colors, font } from './theme';

const COOLDOWN_S = 30;

interface Props {
  onSend: (phone: string) => Promise<void>;
  onVerify: (phone: string, code: string) => Promise<void>;
  onDone: () => void;
}

export function PhoneVerify({ onSend, onVerify, onDone }: Props) {
  const [input, setInput] = useState('');
  const [phone, setPhone] = useState<string>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [wait, setWait] = useState(0);
  const enter = useEntrance(phone);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async (to: string) => {
    setBusy(true);
    setError(undefined);
    try {
      await onSend(to);
      setPhone(to);
      setWait(COOLDOWN_S);
    } catch (e) {
      setError((e as { code?: string })?.code === 'phone_exists'
        ? 'Diese Nummer gehört schon zu einem anderen Konto. Pro Person gibt es bei Echt nur ein Konto.'
        : 'Die SMS konnte nicht verschickt werden. Prüfe die Nummer und versuch es noch einmal.');
    } finally {
      setBusy(false);
    }
  };

  const submitNumber = () => {
    const to = normalizePhone(input);
    if (!to) return setError('Bitte gib eine Handynummer an, Festnetz kann keine SMS empfangen.');
    send(to);
  };

  const confirm = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await onVerify(phone!, code.trim());
      onDone();
    } catch {
      setError('Der Code stimmt nicht oder ist abgelaufen.');
    } finally {
      setBusy(false);
    }
  };

  if (!phone) {
    return (
      <View style={{ flex: 1, gap: 20 }}>
        <View style={{ gap: 12 }}>
          <Text style={font.display}>Deine{'\n'}Nummer<Text style={{ color: colors.accent }}>.</Text></Text>
          <Text style={font.body}>Eine Nummer, ein Konto. So legt niemand mehrere Profile an. Andere sehen deine Nummer nie.</Text>
        </View>
        <Field
          label="Handynummer"
          value={input}
          onChangeText={(v) => { setError(undefined); setInput(v); }}
          placeholder="0151 23456789"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          error={error}
        />
        <View style={{ flex: 1 }} />
        <Button title={busy ? 'SMS wird gesendet …' : 'Code per SMS senden'} icon="message-square" busy={busy} disabled={input.replace(/\D/g, '').length < 6} onPress={submitNumber} />
      </View>
    );
  }

  return (
    <Animated.View style={[{ flex: 1, gap: 20 }, enter]}>
      <View style={{ gap: 12 }}>
        <Text style={font.display}>Kurz in die{'\n'}SMS schauen<Text style={{ color: colors.accent }}>.</Text></Text>
        <Text style={font.body}>{`Der 6-stellige Code ist an ${formatPhone(phone)} unterwegs.`}</Text>
      </View>
      <Field label="SMS-Code" value={code} onChangeText={(v) => { setError(undefined); setCode(v.replace(/\D/g, '').slice(0, 6)); }} keyboardType="number-pad" autoComplete="sms-otp" textContentType="oneTimeCode" error={error} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <Pressable accessibilityRole="button" onPress={() => { setPhone(undefined); setCode(''); setError(undefined); }} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={[font.small, { color: colors.text }]}>Nummer ändern</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={wait > 0 || busy} onPress={() => send(phone)} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={[font.small, { color: wait > 0 ? colors.muted : colors.hint }]}>{wait > 0 ? `Neuer Code in ${wait} s` : 'Neuen Code senden'}</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1 }} />
      <Button title="Bestätigen" busy={busy} disabled={code.length < 6} onPress={confirm} />
    </Animated.View>
  );
}
