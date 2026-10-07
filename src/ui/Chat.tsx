import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { afterDateOutcome, DateAnswer, waitingDays } from '../domain/conversation.ts';
import { dateIdeas } from '../domain/dateIdeas.ts';
import type { Match } from '../lib/matches';
import { Button, Chip, s } from './kit';
import { colors, font } from './theme';

export const PARTNER_CAFES = ['Café Lindner, Kreuzberg', 'Kaffeebar Nord, Prenzlauer Berg', 'Rösterei am Kanal, Neukölln'];
const TIMES = ['Samstag, 15 Uhr', 'Sonntag, 11 Uhr', 'Mittwoch, 19 Uhr'];

interface Props {
  match: Match;
  now?: Date;
  send: (text: string) => void;
  proposeDate: (idea: string, place: string, when: string) => void;
  markDatePast: () => void;
  answerAfterDate: (a: DateAnswer) => void;
  endKindly: (text: string) => void;
  demo?: boolean;
}

export function Chat({ match, now = new Date(), send, proposeDate, markDatePast, answerAfterDate, endKindly, demo }: Props) {
  const [draft, setDraft] = useState('');
  const [panel, setPanel] = useState<'none' | 'date' | 'end'>('none');
  const ideas = dateIdeas(match.shared ?? []);
  const [idea, setIdea] = useState(ideas[0]);
  const [place, setPlace] = useState(PARTNER_CAFES[0]);
  const [when, setWhen] = useState(TIMES[0]);
  const goodbye = `Hey ${match.name}, danke für die schönen Gespräche. Ich merke, dass es für mich nicht ganz passt, und wollte dir das ehrlich sagen. Alles Gute für dich!`;
  const waiting = waitingDays(match.messages, now);
  const outcome = afterDateOutcome(match.afterDate.mine, match.afterDate.theirs);

  return (
    <View style={{ gap: 16 }}>
      {match.messages.length === 0 && <Text style={font.small}>{`Fragenrunde geschafft. Schreib ${match.name} etwas zu einer Antwort, die dich neugierig gemacht hat.`}</Text>}
      {match.messages.map((m) => (
        <View key={m.id} style={{ alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start', maxWidth: '82%', backgroundColor: m.from === 'me' ? colors.accent : colors.surface, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14 }}>
          <Text style={[font.body, m.from === 'me' && { color: colors.bg }]}>{m.text}</Text>
        </View>
      ))}

      {match.date && (
        <View style={s.hint}>
          <Text style={s.label}>Date</Text>
          <Text style={font.body}>{[match.date.idea, match.date.when, `Treffpunkt ${match.date.place}`].filter(Boolean).join(' · ')}</Text>
          <Text style={font.small}>{match.date.accepted ? (match.date.past ? 'Vorbei' : 'Zugesagt') : `Wartet auf ${match.name}`}</Text>
          {demo && match.date.accepted && !match.date.past && <Button title="Demo: Date ist vorbei" variant="ghost" onPress={markDatePast} />}
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
              style={{ backgroundColor: colors.accent, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 18, opacity: draft.trim() ? 1 : 0.5 }}
            >
              <Text style={{ color: colors.bg, fontWeight: '700' }}>Senden</Text>
            </Pressable>
          </View>
          {!match.date && panel !== 'date' && <Button title="Date vorschlagen" variant="ghost" onPress={() => setPanel('date')} />}
          {panel === 'date' && (
            <View style={{ gap: 12 }}>
              <Text style={s.label}>{match.shared?.length ? 'Ideen aus euren Gemeinsamkeiten' : 'Ideen'}</Text>
              <View style={{ flexWrap: 'wrap', flexDirection: 'row', gap: 8 }}>
                {ideas.map((i) => <Chip key={i} role="radio" label={i} a11y={i} selected={idea === i} onPress={() => setIdea(i)} />)}
              </View>
              <Text style={s.label}>Treffpunkt (Partner-Cafés)</Text>
              <View style={{ flexWrap: 'wrap', flexDirection: 'row', gap: 8 }}>
                {PARTNER_CAFES.map((c) => <Chip key={c} label={c} a11y={c} selected={place === c} onPress={() => setPlace(c)} />)}
              </View>
              <Text style={s.label}>Wann</Text>
              <View style={{ flexWrap: 'wrap', flexDirection: 'row', gap: 8 }}>
                {TIMES.map((t) => <Chip key={t} label={t} a11y={t} selected={when === t} onPress={() => setWhen(t)} />)}
              </View>
              <Text style={font.small}>Fürs erste Treffen: ein öffentlicher Ort und ein eigener Heimweg.</Text>
              <Button title="Vorschlag senden" onPress={() => { proposeDate(idea, place, when); setPanel('none'); }} />
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
