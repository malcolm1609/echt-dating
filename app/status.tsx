import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { backend, MyStatus } from '../src/lib/backend';
import { Button, Screen, s } from '../src/ui/kit';
import { colors, font } from '../src/ui/theme';

export default function Status() {
  const [state, setState] = useState<MyStatus>();
  const load = useCallback(() => {
    backend.myStatus().then(setState, () => setState(undefined));
  }, []);
  useFocusEffect(load);

  return (
    <Screen>
      {!state && <Text style={font.small}>Lädt …</Text>}
      {state?.status === 'pending_verification' && (
        <>
          <Text style={font.display}>Wir prüfen gerade<Text style={{ color: colors.accent }}>.</Text></Text>
          <Text style={font.body}>Sobald dein Ausweis und dein Selfie geprüft sind, siehst du hier, wie es weitergeht.</Text>
          <Button title="Aktualisieren" variant="ghost" onPress={load} />
        </>
      )}
      {state?.status === 'waitlisted' && <Waitlist {...state} />}
      {state?.status === 'waitlisted' && backend.demo && (
        <>
          <View style={{ flex: 1 }} />
          <Button title="Demo: Vorschläge ansehen" variant="ghost" onPress={() => router.replace('/heute')} />
        </>
      )}
      {state?.status === 'admitted' && (
        <>
          <Text style={font.display}>Du bist dabei<Text style={{ color: colors.accent }}>.</Text></Text>
          <Text style={font.body}>Du bekommst jeden Tag bis zu 6 Vorschläge.</Text>
          <View style={{ flex: 1 }} />
          <Button title="Zu deinen Vorschlägen" onPress={() => router.replace('/heute')} />
        </>
      )}
      {state?.status === 'rejected' && (
        <>
          <Text style={font.display}>Das hat leider nicht geklappt<Text style={{ color: colors.accent }}>.</Text></Text>
          <Text style={font.body}>Wir konnten deine Identität nicht bestätigen oder du bist noch keine 18. Schreib uns, wenn du denkst, dass das ein Fehler ist.</Text>
        </>
      )}
    </Screen>
  );
}

function Waitlist({ position, ratio }: Extract<MyStatus, { status: 'waitlisted' }>) {
  const total = ratio ? ratio.f + ratio.m : 0;
  return (
    <>
      <Text style={[font.label, { color: colors.hint }]}>Du bist verifiziert</Text>
      <Text style={font.display}>Fast da<Text style={{ color: colors.accent }}>.</Text></Text>
      {position !== null && (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <Text style={[font.display, { fontSize: 96, lineHeight: 96, color: colors.accent }]}>{position}</Text>
          <Text style={font.small}>{'Platz auf der\nWarteliste'}</Text>
        </View>
      )}
      <Text style={font.body}>
        Wir lassen nur so viele Menschen in deinen Umkreis, dass das Verhältnis fair bleibt und alle aktiv sind. Sobald jemand inaktiv wird, rückst du nach.
      </Text>
      {ratio && total > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={s.label}>In deinem Umkreis</Text>
          <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' }}>
            <View style={{ flex: ratio.f, backgroundColor: colors.accent }} />
            <View style={{ flex: ratio.m, backgroundColor: colors.hint }} />
          </View>
          <Text style={font.small}>
            {Math.round((ratio.f / total) * 100)} % Frauen · {Math.round((ratio.m / total) * 100)} % Männer
          </Text>
        </View>
      )}
    </>
  );
}
