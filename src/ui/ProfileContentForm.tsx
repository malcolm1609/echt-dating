import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  answerHint, GOALS, GoalId, INTEREST_MAX, INTERESTS, PROMPT_CATEGORIES, PROMPT_MAX, PromptAnswer, PromptCategory, PROMPTS,
  ProfileContent, ProfileContentErrors, validateProfileContent,
} from '../domain/profileContent.ts';
import { MusicLink, SONGS_MAX } from '../domain/music.ts';
import { lookupMusicTitle } from '../lib/musicTitle';
import { Button, Chip, Field, s } from './kit';
import { MusicField } from './MusicField';
import { colors, font } from './theme';

interface Props {
  initial?: ProfileContent;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (content: ProfileContent) => void;
  lookupTitle?: (url: string) => Promise<string | null>;
}

const categoryOf = (promptId: string) => PROMPTS.find((p) => p.id === promptId)?.category;

export function ProfileContentForm({ initial, submitLabel, busy, onSubmit, lookupTitle = lookupMusicTitle }: Props) {
  const [answers, setAnswers] = useState<Partial<Record<PromptCategory, PromptAnswer>>>(() =>
    Object.fromEntries((initial?.prompts ?? []).map((p) => [categoryOf(p.promptId), p])),
  );
  const [picking, setPicking] = useState<PromptCategory>();
  const [goal, setGoal] = useState<GoalId | undefined>(initial?.goal);
  const [interests, setInterests] = useState<string[]>(initial?.interests ?? []);
  // Ein Platz je Song; der Schlüssel bleibt, damit beim Entfernen die übrigen Eingaben stehen bleiben.
  const [songs, setSongs] = useState<{ key: number; value?: MusicLink }[]>(() => {
    const start = initial?.music?.length ? initial.music : [undefined];
    return start.map((value, key) => ({ key, value }));
  });
  const nextKey = () => Math.max(-1, ...songs.map((x) => x.key)) + 1;
  const [errors, setErrors] = useState<ProfileContentErrors>({});

  const edited = (field: keyof ProfileContentErrors) => setErrors(({ [field]: _, ...rest }) => rest);
  const setAnswer = (category: PromptCategory, a: PromptAnswer) => {
    edited(category);
    setAnswers((cur) => ({ ...cur, [category]: a }));
  };
  const toggleInterest = (i: string) => {
    edited('interests');
    setInterests((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : cur.length < INTEREST_MAX ? [...cur, i] : cur));
  };

  const submit = () => {
    const chosen = songs.flatMap(({ value }) => (value ? [{ ...value, title: value.title.trim() }] : []));
    const content: ProfileContent = {
      prompts: PROMPT_CATEGORIES.flatMap(({ id }) => (answers[id] ? [{ ...answers[id]!, answer: answers[id]!.answer.trim() }] : [])),
      goal,
      interests,
      ...(chosen.length > 0 && { music: chosen }),
    };
    const found = validateProfileContent(content);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(content);
  };

  return (
    <View style={{ gap: 32 }}>
      {PROMPT_CATEGORIES.map(({ id, title }) => {
        const chosen = answers[id];
        const prompt = chosen && PROMPTS.find((p) => p.id === chosen.promptId);
        const hint = chosen ? answerHint(chosen.answer) : null;
        return (
          <View key={id} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[font.label, { color: colors.hint }]}>{title}</Text>
              {prompt && picking !== id && <Link label="Andere Frage" onPress={() => setPicking(id)} />}
            </View>
            {picking === id || !prompt ? (
              picking === id ? (
                <View style={{ gap: 8 }}>
                  {PROMPTS.filter((p) => p.category === id).map((p) => (
                    <Pressable
                      key={p.id}
                      accessibilityRole="button"
                      onPress={() => { setAnswer(id, { promptId: p.id, answer: chosen?.answer ?? '' }); setPicking(undefined); }}
                      style={({ pressed }) => [s.option, p.id === chosen?.promptId && { borderColor: colors.hint }, pressed && { backgroundColor: colors.raised }]}
                    >
                      <Text style={font.body}>{p.text}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Pressable accessibilityRole="button" accessibilityLabel={`Frage wählen: ${id}`} onPress={() => setPicking(id)} style={({ pressed }) => [s.option, { borderStyle: 'dashed' }, pressed && { backgroundColor: colors.raised }]}>
                  <Text style={[font.body, { color: colors.muted }]}>Frage wählen</Text>
                </Pressable>
              )
            ) : (
              <View style={{ gap: 6 }}>
                <Field
                  label={prompt.text}
                  labelStyle={{ textTransform: 'none', letterSpacing: 0, fontSize: 17, lineHeight: 23, color: colors.text }}
                  accessibilityLabel={`Antwort auf: ${prompt.text}`}
                  value={chosen.answer}
                  onChangeText={(answer) => setAnswer(id, { ...chosen, answer })}
                  multiline
                  maxLength={PROMPT_MAX}
                  placeholder="Etwas Konkretes: ein Ort, ein Erlebnis, ein Name"
                  style={{ minHeight: 84, textAlignVertical: 'top' }}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Text style={[font.small, { flex: 1, color: colors.hint }]}>{hint ?? ''}</Text>
                  <Text style={font.small}>{`${chosen.answer.length} / ${PROMPT_MAX}`}</Text>
                </View>
              </View>
            )}
            {errors[id] && <Text style={s.error}>{errors[id]}</Text>}
          </View>
        );
      })}

      <View style={{ gap: 12 }}>
        <Text style={[font.label, { color: colors.hint }]}>Was du suchst</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {GOALS.map((g) => (
            <Chip key={g.id} role="radio" label={g.label} a11y={g.label} selected={goal === g.id} onPress={() => { edited('goal'); setGoal(g.id); }} />
          ))}
        </View>
        {errors.goal && <Text style={s.error}>{errors.goal}</Text>}
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[font.label, { color: colors.hint }]}>Interessen, freiwillig</Text>
          <Text style={font.small}>{`${interests.length} / ${INTEREST_MAX}`}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {INTERESTS.map((i) => (
            <Chip key={i} label={i} a11y={`Interesse ${i}`} selected={interests.includes(i)} onPress={() => toggleInterest(i)} />
          ))}
        </View>
        {errors.interests && <Text style={s.error}>{errors.interests}</Text>}
      </View>

      <View style={{ gap: 12 }}>
        <Text style={[font.label, { color: colors.hint }]}>Deine Top-Songs, freiwillig</Text>
        <Text style={font.small}>{`Bis zu ${SONGS_MAX} Songs oder Playlists aus Spotify oder Apple Music. Andere können sie direkt anhören.`}</Text>
        {songs.map(({ key, value }, i) => (
          <View key={key} style={{ gap: 8, paddingTop: i > 0 ? 8 : 0, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.line }}>
            {songs.length > 1 && <Text style={font.label}>{`Song ${i + 1}`}</Text>}
            <MusicField
              value={value}
              number={i + 1}
              lookupTitle={lookupTitle}
              onChange={(m) => {
                edited('music');
                setSongs((cur) => (!m && cur.length > 1 ? cur.filter((x) => x.key !== key) : cur.map((x) => (x.key === key ? { key, value: m } : x))));
              }}
            />
          </View>
        ))}
        {songs.length < SONGS_MAX && songs.every((x) => x.value) && (
          <Link label="Weiteren Song hinzufügen" onPress={() => setSongs((cur) => [...cur, { key: nextKey() }])} />
        )}
        {errors.music && <Text style={s.error}>{errors.music}</Text>}
      </View>

      <Button title={submitLabel} busy={busy} onPress={submit} />
    </View>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={12} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={[font.small, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}
