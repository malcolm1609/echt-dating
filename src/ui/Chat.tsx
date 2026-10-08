import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { afterDateOutcome, DateAnswer, waitingDays } from '../domain/conversation.ts';
import { dateIdeas } from '../domain/dateIdeas.ts';
import { PARTNER_DATE_DISCOUNT, readReceiptShown } from '../domain/plus.ts';
import type { Match } from '../lib/matches';
import { Button, Chip, s } from './kit';
import { PlaceLink } from './PlaceLink';
import { colors, font, fontFamily } from './theme';

export const PARTNER_CAFES = [
  { name: 'Café am Kirchenplatz', address: 'Kirchenplatz, 35390 Gießen', km: 0.8 },
  { name: 'Kaffeebar Seltersweg', address: 'Seltersweg, 35390 Gießen', km: 1.1 },
  { name: 'Rösterei an der Lahn', address: 'Lahnstraße, 35398 Gießen', km: 2.3 },
];
const TIMES = ['Samstag, 15 Uhr', 'Sonntag, 11 Uhr', 'Mittwoch, 19 Uhr'];

interface Props {
  match: Match;
  now?: Date;
  send: (text: string) => void;
  proposeDate: (idea: string, place: string, when: string, reserved: boolean) => void;
  acceptDate?: () => void;
  markDatePast: () => void;
  answerAfterDate: (a: DateAnswer) => void;
  endKindly: (text: string) => void;
  /** Demo und Testbetrieb: Date sofort als vorbei markieren. */
  testTools?: boolean;
  plus?: { active: boolean; readReceipts: boolean };
  onUpgrade?: () => void;
}

export function Chat({ match, now = new Date(), send, proposeDate, acceptDate, markDatePast, answerAfterDate, endKindly, testTools, plus = { active: false, readReceipts: false }, onUpgrade }: Props) {
  const [draft, setDraft] = useState('');
  const [panel, setPanel] = useState<'none' | 'date' | 'end'>('none');
  const ideas = dateIdeas(match.shared ?? []);
  const [idea, setIdea] = useState(ideas[0]);
  const [place, setPlace] = useState(PARTNER_CAFES[0].name);
  const [reserve, setReserve] = useState(false);
  const [checkIn, setCheckIn] = useState(false);
  const [when, setWhen] = useState(TIMES[0]);
  const goodbye = `Hey ${match.name}, danke für die schönen Gespräche. Ich merke, dass es für mich nicht ganz passt, und wollte dir das ehrlich sagen. Alles Gute für dich!`;
  const waiting = waitingDays(match.messages, now);
  const outcome = afterDateOutcome(match.afterDate.mine, match.afterDate.theirs);
  const lastMine = match.messages.at(-1)?.from === 'me' ? match.messages.at(-1)!.id : undefined;
  const showRead = readReceiptShown(plus.readReceipts, !!match.readReceipts);

  return (
    <View style={{ gap: 16 }}>
      {match.messages.length === 0 && <Text style={font.small}>{`Fragenrunde geschafft. Schreib ${match.name} etwas zu einer Antwort, die dich neugierig gemacht hat.`}</Text>}
      {match.messages.map((m) => (
        <View key={m.id} style={{ alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start', maxWidth: '82%', backgroundColor: m.from === 'me' ? colors.accent : colors.surface, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14 }}>
          <Text style={[font.body, m.from === 'me' && { color: colors.onAccent }]}>{m.text}</Text>
        </View>
      ))}
      {lastMine && showRead && <Text style={[font.small, { alignSelf: 'flex-end', marginTop: -10 }]}>Gelesen</Text>}

      {match.date && (
        <View style={s.hint}>
          <Text style={s.label}>Date</Text>
          <Text style={font.body}>{[match.date.idea, match.date.when].filter(Boolean).join(' · ')}</Text>
          <View style={{ marginVertical: 8 }}>
            <PlaceLink place={match.date.place} address={PARTNER_CAFES.find((c) => c.name === match.date!.place)?.address} />
          </View>
          <Text style={font.small}>{match.date.accepted ? (match.date.past ? 'Vorbei' : 'Zugesagt') : match.date.mine === false ? `${match.name} schlägt das vor` : `Wartet auf ${match.name}`}</Text>
          {!match.date.accepted && match.date.mine === false && acceptDate && <Button title="Zusagen" onPress={acceptDate} />}
          {match.date.reserved && <Text style={font.small}>Tisch ist reserviert.</Text>}
          {PARTNER_CAFES.some((c) => c.name === match.date!.place) && <Text style={font.small}>{`Mit Echt bekommt ihr dort ${PARTNER_DATE_DISCOUNT} % Rabatt.`}</Text>}
          {!match.date.past && (checkIn ? (
            <Text style={[font.small, { color: colors.hint, marginTop: 8 }]}>Check-in aktiv: Eine Vertrauensperson sieht während des Dates, wo du bist, und wir fragen nach einer Stunde, ob alles okay ist.</Text>
          ) : (
            <View style={{ marginTop: 10 }}>
              <Button title="Date-Check-in einschalten (kostenlos)" variant="ghost" icon="shield" onPress={() => setCheckIn(true)} />
            </View>
          ))}
          {testTools && match.date.accepted && !match.date.past && <Button title="Test: Date ist vorbei" variant="ghost" onPress={markDatePast} />}
        </View>
      )}

      {match.date?.past && (
        <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, gap: 12 }}>
          {outcome === 'open' && (
            <>
              <Text style={font.title}>Wie war’s?</Text>
              <Text style={font.body}>{`Möchtest du ${match.name} wiedersehen?`}</Text>
              <Text style={font.small}>{`${match.name} erfährt deine Antwort nur, wenn ihr beide Ja sagt.`}</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Chip label="Ja, gern" a11y="Ja, wiedersehen" selected={false} onPress={() => answerAfterDate('yes')} />
                <Chip label="Eher nicht" a11y="Nein, nicht wiedersehen" selected={false} onPress={() => answerAfterDate('no')} />
              </View>
            </>
          )}
          {outcome === 'both_yes' && <Text style={font.title}>Ihr wollt euch beide wiedersehen 🎉</Text>}
          {(outcome === 'waiting' || (outcome === 'closed' && match.afterDate.mine === 'yes')) && (
            <Text style={font.body}>Danke für deine Antwort. Wenn ihr beide Ja sagt, erfahrt ihr es hier.</Text>
          )}
          {outcome === 'closed' && match.afterDate.mine === 'no' && <Text style={font.body}>Danke für deine ehrliche Antwort. Das hilft uns, bessere Vorschläge zu machen.</Text>}
        </View>
      )}

      {match.ended ? (
        <Text style={font.small}>Ihr habt das Gespräch freundlich beendet.</Text>
      ) : (
        <>
          {waiting !== null && <Text style={[font.small, { color: colors.hint }]}>{`${match.name} wartet seit ${waiting} Tagen auf deine Antwort.`}</Text>}
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            <TextInput accessibilityLabel="Nachricht" value={draft} onChangeText={setDraft} placeholder="Nachricht" placeholderTextColor={colors.muted} multiline style={[s.input, { flex: 1 }]} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Senden"
              disabled={!draft.trim()}
              onPress={() => {
                send(draft.trim());
                setDraft('');
              }}
              style={{ backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, opacity: draft.trim() ? 1 : 0.5 }}
            >
              <Text style={{ color: colors.onAccent, fontFamily: fontFamily.semibold }}>Senden</Text>
            </Pressable>
          </View>
          {!match.date && panel !== 'date' && <Button title="Date vorschlagen" variant="ghost" onPress={() => setPanel('date')} />}
          {panel === 'date' && (
            <View style={{ gap: 12 }}>
              <Text style={s.label}>{match.shared?.length ? 'Ideen aus euren Gemeinsamkeiten' : 'Ideen'}</Text>
              <View style={{ flexWrap: 'wrap', flexDirection: 'row', gap: 8 }}>
                {ideas.map((i) => <Chip key={i} role="radio" label={i} a11y={i} selected={idea === i} onPress={() => setIdea(i)} />)}
              </View>
              <Text style={s.label}>{`Treffpunkt · Partner mit ${PARTNER_DATE_DISCOUNT} % Rabatt`}</Text>
              <View style={{ flexWrap: 'wrap', flexDirection: 'row', gap: 8 }}>
                {PARTNER_CAFES.map((c) => <Chip key={c.name} role="radio" label={`${c.name} · ${c.km.toFixed(1).replace('.', ',')} km`} a11y={c.name} selected={place === c.name} onPress={() => setPlace(c.name)} />)}
              </View>
              <Text style={s.label}>Wann</Text>
              <View style={{ flexWrap: 'wrap', flexDirection: 'row', gap: 8 }}>
                {TIMES.map((t) => <Chip key={t} label={t} a11y={t} selected={when === t} onPress={() => setWhen(t)} />)}
              </View>
              {plus.active ? (
                <Chip label="Tisch reservieren" a11y="Tisch reservieren" selected={reserve} onPress={() => setReserve(!reserve)} />
              ) : (
                <Pressable accessibilityRole="button" onPress={onUpgrade}>
                  <Text style={[font.small, { color: colors.hint }]}>Tisch gleich mitreservieren mit Echt Plus ›</Text>
                </Pressable>
              )}
              <Text style={font.small}>Fürs erste Treffen: ein öffentlicher Ort und ein eigener Heimweg.</Text>
              <Button title="Vorschlag senden" onPress={() => { proposeDate(idea, place, when, plus.active && reserve); setPanel('none'); }} />
            </View>
          )}
          {panel !== 'end' && <Button title="Freundlich beenden" variant="ghost" onPress={() => setPanel('end')} />}
          {panel === 'end' && (
            <View style={s.hint}>
              <Text style={font.small}>Tipp: Ein ehrlicher Satz ist freundlicher als Schweigen. Diese Nachricht geht an {match.name}:</Text>
              <Text style={[font.body, { marginVertical: 10 }]}>{goodbye}</Text>
              <Button title="Nachricht senden und beenden" onPress={() => endKindly(goodbye)} />
            </View>
          )}
        </>
      )}
    </View>
  );
}
