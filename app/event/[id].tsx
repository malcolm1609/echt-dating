import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { Gender } from '../../src/domain/admission.ts';
import { backend } from '../../src/lib/backend';
import { eventStore, useEvent } from '../../src/lib/events';
import { Button, Screen, s } from '../../src/ui/kit';
import { photoTone } from '../../src/ui/ProfileCard';
import { colors, font, fontFamily } from '../../src/ui/theme';

// Gruppenchat und Teilnehmende eines Events. Sichtbar nur für alle, die dabei sind.
export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useEvent(id);
  const [gender, setGender] = useState<Gender>('f');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    backend.myProfile().then((p) => setGender(p.gender), () => {});
    eventStore.refresh();
    const timer = setInterval(eventStore.refresh, 4000);
    return () => clearInterval(timer);
  }, []);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/treffen'));

  if (!event) {
    return (
      <Screen>
        <Text style={font.body}>Dieses Event gibt es nicht mehr.</Text>
        <Button title="Zu den Treffen" variant="ghost" onPress={() => router.replace('/treffen')} />
      </Screen>
    );
  }
  const people = [...(event.people ?? [])];
  const joined = !!event.people;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Zurück" onPress={back} hitSlop={12}>
          <Text style={{ color: colors.accent, fontSize: 28 }}>‹</Text>
        </Pressable>
        <Text style={[font.title, { flex: 1 }]} numberOfLines={1}>{event.title}</Text>
      </View>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 4 }}>
          <Text style={s.label}>{`${event.kind} · Gastgeber ${event.host.name}`}</Text>
          <Text style={font.body}>{event.when}</Text>
          <Text style={font.small}>{event.place}</Text>
        </View>

        {!joined ? (
          <Text style={font.body}>Wer dabei ist und den Gruppenchat siehst du, sobald du einen Platz hast.</Text>
        ) : (
          <>
            <View style={{ gap: 10 }}>
              <Text style={s.label}>{people.length ? `Mit dir dabei · ${people.length}` : 'Noch bist du allein dabei'}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {people.map((p) => (
                  <View key={p.id} style={{ alignItems: 'center', gap: 4, width: 64 }}>
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: photoTone(p.name), alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#FFFFFF', fontFamily: fontFamily.semibold, fontSize: 18 }}>{p.name[0]}</Text>
                    </View>
                    <Text style={font.small} numberOfLines={1}>{`${p.name}, ${p.age}`}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <Text style={s.label}>Gruppenchat</Text>
              {event.messages?.length ? null : <Text style={font.small}>Sag kurz Hallo, dann findet ihr euch am Treffpunkt leichter.</Text>}
              {event.messages?.map((m) => (
                <View key={m.id} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '82%', backgroundColor: m.mine ? colors.accent : colors.surface, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14 }}>
                  {!m.mine && <Text style={[font.small, { fontFamily: fontFamily.semibold, color: colors.text }]}>{m.name}</Text>}
                  <Text style={[font.body, m.mine && { color: colors.onAccent }]}>{m.text}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
                <TextInput accessibilityLabel="Nachricht an die Gruppe" value={draft} onChangeText={setDraft} placeholder="Nachricht an die Gruppe" placeholderTextColor={colors.muted} multiline style={[s.input, { flex: 1 }]} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Senden"
                  disabled={!draft.trim()}
                  onPress={() => {
                    eventStore.send(id, draft.trim());
                    setDraft('');
                  }}
                  style={{ backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, opacity: draft.trim() ? 1 : 0.5 }}
                >
                  <Text style={{ color: colors.onAccent, fontFamily: fontFamily.semibold }}>Senden</Text>
                </Pressable>
              </View>
            </View>

            <Text style={font.small}>Ihr trefft euch an einem öffentlichen Ort. Teilt keine Adressen im Chat.</Text>
            {!event.isHost && (
              <Button
                title="Doch absagen"
                variant="ghost"
                busy={busy}
                onPress={() => {
                  setBusy(true);
                  eventStore.leave(id, gender).finally(() => setBusy(false));
                }}
              />
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
