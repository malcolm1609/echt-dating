import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Gender } from '../../src/domain/admission.ts';
import { backend } from '../../src/lib/backend';
import { eventStore, useEvents } from '../../src/lib/events';
import { Button, Chip, Field, Screen, s } from '../../src/ui/kit';
import { colors, font } from '../../src/ui/theme';

export default function Rueckblick() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useEvents().past.find((p) => p.id === id);
  const [seeking, setSeeking] = useState<Gender[]>();
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [picks, setPicks] = useState<string[]>([]);
  useEffect(() => {
    backend.myProfile().then((p) => setSeeking(p.seeking), () => {});
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
  const people = event.attendees.filter((a) => !seeking || seeking.includes(a.gender));
  const nameOf = (pid: string) => event.attendees.find((a) => a.id === pid)?.name ?? pid;

  return (
    <Screen>
      <Pressable accessibilityRole="button" accessibilityLabel="Zurück" onPress={back} hitSlop={12}>
        <Text style={{ color: colors.accent, fontSize: 28 }}>‹</Text>
      </Pressable>
      <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 4 }}>
          <Text style={s.label}>{`${event.when} · Gastgeber ${event.host}`}</Text>
          <Text style={font.title}>{event.title}</Text>
          <Text style={font.small}>{event.place}</Text>
        </View>

        {event.review ? (
          <View style={{ gap: 12 }}>
            <Text style={font.title}>Danke für deine Bewertung!</Text>
            {event.review.mutual.length > 0 ? (
              <>
                <Text style={font.body}>{`Ihr wollt euch wiedersehen: ${event.review.mutual.map(nameOf).join(', ')} 🎉 Ihr findet euch jetzt bei deinen Matches.`}</Text>
                <Button title="Zu den Matches" onPress={() => router.replace('/matches')} />
              </>
            ) : (
              <Text style={font.body}>Diesmal war kein gegenseitiger Wunsch dabei. Wen du gewählt hast, bleibt verborgen.</Text>
            )}
          </View>
        ) : (
          <>
            <View style={{ gap: 8 }}>
              <Text style={s.label}>Wie war der Abend?</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} Sterne`} accessibilityState={{ selected: stars === n }} onPress={() => setStars(n)} hitSlop={6}>
                    <Text style={{ fontSize: 34, color: n <= stars ? colors.accent : colors.line }}>★</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Field label="Ein Satz für andere (optional)" value={text} onChangeText={setText} placeholder="z. B. Lockere Runde, gute Fragen" />
            <View style={{ gap: 8 }}>
              <Text style={s.label}>Wen möchtest du wiedersehen?</Text>
              <Text style={font.small}>Die andere Person erfährt es nur, wenn ihr euch beide gewählt habt.</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {people.map((a) => (
                  <Chip key={a.id} label={`${a.name}, ${a.age}`} a11y={`${a.name} wiedersehen`} selected={picks.includes(a.id)} onPress={() => setPicks(picks.includes(a.id) ? picks.filter((x) => x !== a.id) : [...picks, a.id])} />
                ))}
              </View>
            </View>
            <Button title="Absenden" disabled={stars === 0} onPress={() => eventStore.review(event.id, stars, text, picks)} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
