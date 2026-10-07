// Fragenrunde nach dem Match (angelehnt an die 36-Fragen-Studien), Chat-Hinweise und Check nach dem Date.

export const QUESTION_ROUNDS = [
  { title: 'Leicht', questions: ['Wie sähe für dich ein perfekter Tag aus?', 'Wann hast du zuletzt für dich allein gesungen?'] },
  { title: 'Persönlich', questions: ['Wofür bist du in deinem Leben am dankbarsten?', 'Was würdest du gern besser können?'] },
  { title: 'Tief', questions: ['Was bedeutet Freundschaft für dich?', 'Welche Erinnerung ist dir am wichtigsten?'] },
];

export interface AnswerPair { mine?: string; theirs?: string }
export type Answers = Record<string, AnswerPair>;
export type RoundState = 'locked' | 'open' | 'done';

export const answerKey = (round: number, question: number) => `${round}-${question}`;

const roundDone = (a: Answers, round: number) =>
  QUESTION_ROUNDS[round].questions.every((_, q) => a[answerKey(round, q)]?.mine && a[answerKey(round, q)]?.theirs);

export function roundState(a: Answers, round: number): RoundState {
  if (roundDone(a, round)) return 'done';
  return round === 0 || roundDone(a, round - 1) ? 'open' : 'locked';
}

/** Die Antwort der anderen Person gibt es erst, wenn man selbst geantwortet hat. */
export function theirAnswerFor(pair: AnswerPair = {}): { state: 'hidden' } | { state: 'pending' } | { state: 'visible'; text: string } {
  if (!pair.mine) return { state: 'hidden' };
  return pair.theirs ? { state: 'visible', text: pair.theirs } : { state: 'pending' };
}

export const chatUnlocked = (a: Answers) => QUESTION_ROUNDS.every((_, r) => roundDone(a, r));

/** Tage, die die andere Person schon auf eine Antwort wartet (ab 2 Tagen), sonst null. */
export function waitingDays(messages: { from: 'me' | 'them'; at: Date }[], now: Date): number | null {
  const last = messages[messages.length - 1];
  if (!last || last.from !== 'them') return null;
  const days = Math.floor((now.getTime() - last.at.getTime()) / 86_400_000);
  return days >= 2 ? days : null;
}

export type DateAnswer = 'yes' | 'no';

/** Ein Wiedersehen wird nur bei beidseitigem Ja geteilt; ein einseitiges Nein bleibt verborgen. */
export function afterDateOutcome(mine?: DateAnswer, theirs?: DateAnswer): 'open' | 'waiting' | 'both_yes' | 'closed' {
  if (!mine) return 'open';
  if (mine === 'no') return 'closed';
  if (!theirs) return 'waiting';
  return theirs === 'yes' ? 'both_yes' : 'closed';
}
