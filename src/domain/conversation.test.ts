import { QUESTION_ROUNDS, roundState, theirAnswerFor, chatUnlocked, waitingDays, afterDateOutcome, Answers } from './conversation';

const key = (r: number, q: number) => `${r}-${q}`;
const allAnswered = (rounds: number, who: 'both' | 'mine' = 'both'): Answers => {
  const a: Answers = {};
  for (let r = 0; r < rounds; r++)
    QUESTION_ROUNDS[r].questions.forEach((_, q) => (a[key(r, q)] = { mine: 'x', theirs: who === 'both' ? 'y' : undefined }));
  return a;
};

describe('question rounds', () => {
  it('has three rounds that get more personal', () => {
    expect(QUESTION_ROUNDS.map((r) => r.title)).toEqual(['Leicht', 'Persönlich', 'Tief']);
  });

  it('opens the first round right away and the next only when both finished', () => {
    expect(roundState({}, 0)).toBe('open');
    expect(roundState({}, 1)).toBe('locked');
    expect(roundState(allAnswered(1, 'mine'), 1)).toBe('locked');
    expect(roundState(allAnswered(1), 0)).toBe('done');
    expect(roundState(allAnswered(1), 1)).toBe('open');
  });

  it('shows the other answer only after answering yourself', () => {
    expect(theirAnswerFor({ theirs: 'Pizza' })).toEqual({ state: 'hidden' });
    expect(theirAnswerFor({ mine: 'Pasta' })).toEqual({ state: 'pending' });
    expect(theirAnswerFor({ mine: 'Pasta', theirs: 'Pizza' })).toEqual({ state: 'visible', text: 'Pizza' });
  });

  it('unlocks the chat after all three rounds', () => {
    expect(chatUnlocked(allAnswered(2))).toBe(false);
    expect(chatUnlocked(allAnswered(3))).toBe(true);
  });
});

describe('waitingDays', () => {
  const now = new Date('2026-10-07T12:00:00Z');
  const at = (h: number) => new Date(now.getTime() - h * 3600_000);

  it('reminds you when the other person waits for more than 2 days', () => {
    expect(waitingDays([{ from: 'me', at: at(80) }, { from: 'them', at: at(60) }], now)).toBe(2);
  });

  it('stays quiet when you wrote last or it is recent', () => {
    expect(waitingDays([{ from: 'them', at: at(60) }, { from: 'me', at: at(50) }], now)).toBeNull();
    expect(waitingDays([{ from: 'them', at: at(20) }], now)).toBeNull();
    expect(waitingDays([], now)).toBeNull();
  });
});

describe('afterDateOutcome', () => {
  it('reveals a second date only when both want one', () => {
    expect(afterDateOutcome('yes', 'yes')).toBe('both_yes');
  });

  it('never reveals a one-sided no', () => {
    expect(afterDateOutcome('yes', 'no')).toBe('closed');
    expect(afterDateOutcome('no', 'yes')).toBe('closed');
  });

  it('waits for the other answer', () => {
    expect(afterDateOutcome('yes', undefined)).toBe('waiting');
    expect(afterDateOutcome(undefined, 'yes')).toBe('open');
  });
});
