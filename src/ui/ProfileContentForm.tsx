import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  answerHint, GOALS, GoalId, INTEREST_MAX, INTERESTS, PROMPT_CATEGORIES, PROMPT_MAX, PromptAnswer, PromptCategory, PROMPTS,
  ProfileContent, ProfileContentErrors, validateProfileContent,
} from '../domain/profileContent.ts';
import type { MusicLink } from '../domain/music.ts';
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
  const [music, setMusic] = useState<MusicLink | undefined>(initial?.music);
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
    const content: ProfileContent = {
      prompts: PROMPT_CATEGORIES.flatMap(({ id }) => (answers[id] ? [{ ...answers[id]!, answer: answers[id]!.answer.trim() }] : [])),
      goal,
      interests,
      ...(music && { music: { ...music, title: music.title.trim() } }),
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
        <Text style={[font.label, { color: colors.hint }]}>Dein Song, freiwillig</Text>
        <Text style={font.small}>Ein Lieblingssong oder eine Playlist aus Spotify oder Apple Music. Andere können ihn direkt anhören.</Text>
        <MusicField value={music} error={errors.music} lookupTitle={lookupTitle} onChange={(m) => { edited('music'); setMusic(m); }} />
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
