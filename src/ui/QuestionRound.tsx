import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Answers, answerKey, QUESTION_ROUNDS, roundState, theirAnswerFor } from '../domain/conversation.ts';
import { Button, s } from './kit';
import { colors, font } from './theme';

interface Props {
  name: string;
  answers: Answers;
  onAnswer: (key: string, text: string) => void;
}

export function QuestionRound({ name, answers, onAnswer }: Props) {
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
              round.questions.map((q, qi) => <Question key={q} name={name} question={q} pair={answers[answerKey(r, qi)]} onAnswer={(t) => onAnswer(answerKey(r, qi), t)} />)
            )}
          </View>
        );
      })}
    </View>
  );
}

function Question({ name, question, pair, onAnswer }: { name: string; question: string; pair?: Answers[string]; onAnswer: (t: string) => void }) {
  const [draft, setDraft] = useState('');
  const theirs = theirAnswerFor(pair);
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, gap: 10 }}>
      <Text style={[font.body, { fontWeight: '700' }]}>{question}</Text>
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
