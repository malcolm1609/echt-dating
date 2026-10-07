import { useSyncExternalStore } from 'react';
import { Answers, answerKey, DateAnswer, QUESTION_ROUNDS } from '../domain/conversation.ts';
import type { ShownPrompt } from '../ui/ProfileDetails';

export interface Message { id: string; from: 'me' | 'them'; text: string; at: Date }
export interface DateProposal { idea?: string; place: string; when: string; accepted: boolean; past: boolean }

export interface Match {
  id: string;
  name: string;
  age: number;
  /** Profilantwort der anderen Person, mit der die Fragenrunde beginnt. */
  opener?: ShownPrompt;
  /** Gemeinsame Interessen, daraus kommen die Date-Ideen. */
  shared?: string[];
  answers: Answers;
  messages: Message[];
  date?: DateProposal;
  afterDate: { mine?: DateAnswer; theirs?: DateAnswer };
  ended: boolean;
}

export interface MatchStore {
  list(): Match[];
  get(id: string): Match | undefined;
  subscribe(listener: () => void): () => void;
  add(person: { id: string; name: string; age: number; opener?: ShownPrompt; shared?: string[] }): void;
  answer(id: string, key: string, text: string): void;
  send(id: string, text: string): void;
  proposeDate(id: string, idea: string, place: string, when: string): void;
  markDatePast(id: string): void;
  answerAfterDate(id: string, answer: DateAnswer): void;
  endKindly(id: string, text: string): void;
  reset(): void;
}

const hours = (h: number) => new Date(Date.now() - h * 3600_000);
const allAnswered = (): Answers =>
  Object.fromEntries(QUESTION_ROUNDS.flatMap((r, ri) => r.questions.map((_, qi) => [answerKey(ri, qi), { mine: '…', theirs: '…' }])));

const DEMO_THEIR_ANSWERS = [
  ['Ausschlafen, Markt, abends mit Freunden kochen.', 'Heute Morgen unter der Dusche.'],
  ['Für meine Schwester.', 'Nein sagen, ohne mich zu rechtfertigen.'],
  ['Jemand, bei dem ich nichts erklären muss.', 'Der Sommer, in dem ich schwimmen gelernt habe.'],
];

const DEMO_OPENER_REPLY = 'Ich habe deine Antworten gelesen und hatte sofort Fragen. Die erste: Wie bist du darauf gekommen?';

/** Klickbarer Prototyp: alles im Speicher, die andere Seite antwortet automatisch. */
export function createDemoStore(delayMs = 1200): MatchStore {
  const initial = (): Match[] => [
    {
      id: 'mara', name: 'Mara', age: 29, answers: allAnswered(), afterDate: {}, ended: false,
      messages: [
        { id: 'm1', from: 'me', text: 'Deine Antwort zur Freundschaft hat mich echt berührt.', at: hours(80) },
        { id: 'm2', from: 'them', text: 'Danke! Hast du am Wochenende Zeit für einen Kaffee?', at: hours(60) },
      ],
    },
    {
      id: 'noah', name: 'Noah', age: 32, answers: allAnswered(), afterDate: {}, ended: false,
      messages: [{ id: 'n1', from: 'them', text: 'Bis Samstag, ich freu mich!', at: hours(30) }],
      date: { place: 'Café Partner, Kreuzberg', when: 'Samstag, 15 Uhr', accepted: true, past: true },
    },
  ];
  let matches = initial();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  const update = (id: string, fn: (m: Match) => Match) => {
    matches = matches.map((m) => (m.id === id ? fn(m) : m));
    emit();
  };
  const later = (fn: () => void) => setTimeout(fn, delayMs);
  const msg = (from: 'me' | 'them', text: string): Message => ({ id: `${Date.now()}-${Math.random()}`, from, text, at: new Date() });

  return {
    list: () => matches,
    get: (id) => matches.find((m) => m.id === id),
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    add(p) {
      if (matches.some((m) => m.id === p.id)) return;
      matches = [{ ...p, answers: {}, messages: [], afterDate: {}, ended: false }, ...matches];
      emit();
    },
    answer(id, key, text) {
      update(id, (m) => ({ ...m, answers: { ...m.answers, [key]: { ...m.answers[key], mine: text } } }));
      const [r, q] = key.split('-').map(Number);
      const theirs = key === answerKey(0, 0) && get(id)?.opener ? DEMO_OPENER_REPLY : DEMO_THEIR_ANSWERS[r][q];
      later(() => update(id, (m) => ({ ...m, answers: { ...m.answers, [key]: { ...m.answers[key], theirs } } })));
    },
    send(id, text) {
      update(id, (m) => ({ ...m, messages: [...m.messages, msg('me', text)] }));
      const replied = get(id)?.messages.some((m) => m.from === 'them');
      if (!replied) later(() => update(id, (m) => ({ ...m, messages: [...m.messages, msg('them', 'Haha, genau so! Erzähl mir mehr 🙂')] })));
    },
    proposeDate(id, idea, place, when) {
      update(id, (m) => ({ ...m, date: { idea, place, when, accepted: false, past: false } }));
      later(() => update(id, (m) => ({ ...m, date: m.date && { ...m.date, accepted: true }, messages: [...m.messages, msg('them', `${when} passt mir super. Bis dann!`)] })));
    },
    markDatePast(id) {
      update(id, (m) => ({ ...m, date: m.date && { ...m.date, past: true } }));
    },
    answerAfterDate(id, answer) {
      update(id, (m) => ({ ...m, afterDate: { ...m.afterDate, mine: answer } }));
      later(() => update(id, (m) => ({ ...m, afterDate: { ...m.afterDate, theirs: 'yes' } })));
    },
    endKindly(id, text) {
      update(id, (m) => ({ ...m, ended: true, messages: [...m.messages, msg('me', text)] }));
    },
    reset() {
      matches = initial();
      emit();
    },
  };

  function get(id: string) {
    return matches.find((m) => m.id === id);
  }
}

export const matchStore = createDemoStore();

export function useMatches() {
  return useSyncExternalStore(matchStore.subscribe, matchStore.list);
}

export function useMatch(id: string) {
  return useSyncExternalStore(matchStore.subscribe, () => matchStore.get(id));
}
