import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Answers, answerKey, QUESTION_ROUNDS, roundState, theirAnswerFor } from '../domain/conversation.ts';
import { Button, s } from './kit';
import type { ShownPrompt } from './ProfileDetails';
import { colors, font, fontFamily } from './theme';

interface Props {
  name: string;
  opener?: ShownPrompt;
  answers: Answers;
  onAnswer: (key: string, text: string) => void;
}

export function QuestionRound({ name, opener, answers, onAnswer }: Props) {
  return (
    <View style={{ gap: 28 }}>
      <Text style={font.small}>
        Statt Smalltalk: drei kurze Runden. Die Antwort von {name} siehst du, sobald du selbst geantwortet hast. Danach öffnet sich der Chat.
      </Text>
      {QUESTION_ROUNDS.map((round, r) => {
        const state = roundState(answers, r);
        return (
          <View key={round.title} style={{ gap: 14, opacity: state === 'locked' ? 0.45 : 1 }}>
            <Text style={s.label}>{`Runde ${r + 1} · ${round.title}${state === 'done' ? ' ✓' : ''}`}</Text>
            {state === 'locked' ? (
              <Text style={font.small}>{`Wird frei, wenn ihr beide Runde ${r} beantwortet habt.`}</Text>
            ) : (
              round.questions.map((q, qi) => (
                <Question
                  key={q}
                  name={name}
                  question={r === 0 && qi === 0 && opener ? `Was fällt dir zu ${name}s Antwort ein?` : q}
                  opener={r === 0 && qi === 0 ? opener : undefined}
                  pair={answers[answerKey(r, qi)]}
                  onAnswer={(t) => onAnswer(answerKey(r, qi), t)}
                />
              ))
            )}
          </View>
        );
      })}
    </View>
  );
}

function Question({ name, question, opener, pair, onAnswer }: { name: string; question: string; opener?: ShownPrompt; pair?: Answers[string]; onAnswer: (t: string) => void }) {
  const [draft, setDraft] = useState('');
  const theirs = theirAnswerFor(pair);
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, gap: 10 }}>
      {opener && (
        <View style={{ gap: 6, borderLeftWidth: 3, borderLeftColor: colors.accent, paddingLeft: 12 }}>
          <Text style={[font.label, { color: colors.accent }]}>Zum Einstieg</Text>
          <Text style={font.small}>{opener.question}</Text>
          <Text style={[font.body, { fontStyle: 'italic' }]}>{`„${opener.answer}“`}</Text>
        </View>
      )}
      <Text style={[font.body, { fontFamily: fontFamily.semibold }]}>{question}</Text>
      {pair?.mine ? (
        <Text style={font.body}>
          <Text style={{ color: colors.muted }}>Du: </Text>
          {pair.mine}
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          <TextInput accessibilityLabel="Deine Antwort" value={draft} onChangeText={setDraft} multiline placeholder="Deine Antwort" placeholderTextColor={colors.muted} style={s.input} />
          <Button title="Antworten" disabled={!draft.trim()} onPress={() => onAnswer(draft.trim())} />
        </View>
      )}
      {theirs.state === 'visible' && (
        <Text style={font.body}>
          <Text style={{ color: colors.hint }}>{name}: </Text>
          {theirs.text}
        </Text>
      )}
      {theirs.state === 'pending' && <Text style={font.small}>{`${name} hat noch nicht geantwortet.`}</Text>}
      {theirs.state === 'hidden' && pair?.theirs && <Text style={[font.small, { color: colors.hint }]}>{`${name} hat schon geantwortet. Antworte, um es zu sehen.`}</Text>}
    </View>
  );
}
