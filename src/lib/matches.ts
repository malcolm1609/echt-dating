import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useSyncExternalStore } from 'react';
import { Answers, answerKey, DateAnswer, QUESTION_ROUNDS } from '../domain/conversation.ts';
import { PROMPTS, promptText, sharedInterests } from '../domain/profileContent.ts';
import { ReportReason, unreadCount } from '../domain/safety.ts';
import type { MusicLink } from '../domain/music.ts';
import type { GoalId } from '../domain/profileContent.ts';
import type { ShownPrompt } from '../ui/ProfileDetails';
import { photoUrls, placeholderPhoto } from './photos';
import { supabase } from './supabase';

export interface Message { id: string; from: 'me' | 'them'; text: string; at: Date }
export interface DateProposal {
  idea?: string; place: string; when: string; accepted: boolean; past: boolean; reserved?: boolean;
  /** Von mir vorgeschlagen? Zusagen kann nur die andere Person. */
  mine?: boolean;
}

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
  /** Hat die andere Person „Gelesen“ eingeschaltet? */
  readReceipts?: boolean;
  /** Neues Match oder etwas Neues von der anderen Person seit dem letzten Ansehen. */
  unread?: boolean;
  /** Das ganze Profil der anderen Person, zum Nachlesen im Chat. */
  profile?: MatchProfile;
  /** Bild-Adressen, das erste ist das Hauptfoto. */
  photos?: string[];
}

export interface MatchProfile { bio: string; goal?: GoalId; prompts: ShownPrompt[]; interests: string[]; music?: MusicLink }

export interface MatchStore {
  list(): Match[];
  get(id: string): Match | undefined;
  subscribe(listener: () => void): () => void;
  add(person: { id: string; name: string; age: number; opener?: ShownPrompt; shared?: string[]; profile?: MatchProfile; photos?: string[] }): void;
  answer(id: string, key: string, text: string): void;
  send(id: string, text: string): void;
  proposeDate(id: string, idea: string, place: string, when: string, reserved?: boolean): void;
  acceptDate(id: string): void;
  markDatePast(id: string): void;
  answerAfterDate(id: string, answer: DateAnswer): void;
  endKindly(id: string, text: string): void;
  reset(): void;
  /** Neu vom Server laden (Demo: nichts zu tun). */
  refresh(): void;
  /** Hält ein offenes Match aktuell und gelesen, bis die zurückgegebene Funktion aufgerufen wird. */
  watch(id: string): () => void;
  /** Melden blockiert mit. Geht mit und ohne Match (auch aus den Vorschlägen). */
  report(id: string, reason: ReportReason): Promise<void>;
  /** Für beide weg: kein Match, keine Nachrichten, keine Vorschläge mehr. */
  block(id: string): Promise<void>;
}

// Die Fragenrunde beginnt mit der Antwort, die am meisten zum Anknüpfen einlädt.
export const openerFor = (prompts?: ShownPrompt[]) =>
  prompts?.find((p) => PROMPTS.find((x) => x.text === p.question)?.category === 'anknuepfen') ?? prompts?.[0];

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
      id: 'mara', name: 'Mara', age: 29, photos: [placeholderPhoto('Mara')], answers: allAnswered(), afterDate: {}, ended: false, readReceipts: true, unread: true, shared: ['Kaffee', 'Flohmärkte'],
      profile: { bio: 'Lehramt Bio und Deutsch, sonntags auf dem Flohmarkt.', goal: 'fest', prompts: [{ question: 'Ein Ort in meiner Stadt, den ich dir zeigen würde …', answer: 'Die Lahnwiesen, wenn abends alle grillen.' }], interests: ['Kaffee', 'Flohmärkte', 'Lesen'] },
      messages: [
        { id: 'm1', from: 'me', text: 'Deine Antwort zur Freundschaft hat mich echt berührt.', at: hours(80) },
        { id: 'm2', from: 'them', text: 'Danke! Hast du am Wochenende Zeit für einen Kaffee?', at: hours(60) },
      ],
    },
    {
      id: 'noah', name: 'Noah', age: 32, answers: allAnswered(), afterDate: {}, ended: false,
      messages: [{ id: 'n1', from: 'them', text: 'Bis Samstag, ich freu mich!', at: hours(30) }],
      date: { place: 'Café am Kirchenplatz', when: 'Samstag, 15 Uhr', accepted: true, past: true },
    },
  ];
  let matches = initial();
  const watching = new Set<string>();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  const update = (id: string, fn: (m: Match) => Match) => {
    matches = matches.map((m) => (m.id === id ? fn(m) : m));
    emit();
  };
  // Antworten der anderen Seite sind neu, außer man schaut gerade zu.
  const fromThem = (id: string, fn: (m: Match) => Match) => update(id, (m) => ({ ...fn(m), unread: !watching.has(id) }));
  const remove = async (id: string) => {
    matches = matches.filter((m) => m.id !== id);
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
      matches = [{ ...p, answers: {}, messages: [], afterDate: {}, ended: false, readReceipts: true, unread: true }, ...matches];
      emit();
    },
    answer(id, key, text) {
      update(id, (m) => ({ ...m, answers: { ...m.answers, [key]: { ...m.answers[key], mine: text } } }));
      const [r, q] = key.split('-').map(Number);
      const theirs = key === answerKey(0, 0) && get(id)?.opener ? DEMO_OPENER_REPLY : DEMO_THEIR_ANSWERS[r][q];
      later(() => fromThem(id, (m) => ({ ...m, answers: { ...m.answers, [key]: { ...m.answers[key], theirs } } })));
    },
    send(id, text) {
      update(id, (m) => ({ ...m, messages: [...m.messages, msg('me', text)] }));
      const replied = get(id)?.messages.some((m) => m.from === 'them');
      if (!replied) later(() => fromThem(id, (m) => ({ ...m, messages: [...m.messages, msg('them', 'Haha, genau so! Erzähl mir mehr 🙂')] })));
    },
    proposeDate(id, idea, place, when, reserved = false) {
      update(id, (m) => ({ ...m, date: { idea, place, when, accepted: false, past: false, reserved, mine: true } }));
      later(() => fromThem(id, (m) => ({ ...m, date: m.date && { ...m.date, accepted: true }, messages: [...m.messages, msg('them', `${when} passt mir super. Bis dann!`)] })));
    },
    acceptDate(id) {
      update(id, (m) => ({ ...m, date: m.date && { ...m.date, accepted: true } }));
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
    refresh() {},
    watch(id) {
      watching.add(id);
      update(id, (m) => ({ ...m, unread: false }));
      return () => watching.delete(id);
    },
    report: remove,
    block: remove,
  };

  function get(id: string) {
    return matches.find((m) => m.id === id);
  }
}

interface ServerMatch {
  id: string;
  name: string;
  age: number;
  prompts: { prompt_id: string; answer: string }[];
  interests: string[];
  ended: boolean;
  answers: Record<string, { mine: string; theirs: string | null }>;
  messages: { id: number; mine: boolean; text: string; at: string }[];
  date: (Omit<DateProposal, 'idea'> & { idea: string | null }) | null;
  after_date: { mine: DateAnswer; theirs: DateAnswer | null } | null;
  unread: boolean;
  bio?: string;
  goal?: GoalId | null;
  music?: MusicLink | null;
  photos?: string[];
}

export function fromServer(m: ServerMatch, myInterests: string[]): Match {
  const prompts = m.prompts.map((p) => ({ question: promptText(p.prompt_id) ?? '', answer: p.answer }));
  return {
    id: m.id,
    name: m.name,
    age: m.age,
    opener: openerFor(prompts),
    shared: sharedInterests(myInterests, m.interests),
    answers: Object.fromEntries(Object.entries(m.answers).map(([k, a]) => [k, { mine: a.mine, theirs: a.theirs ?? undefined }])),
    messages: m.messages.map((x) => ({ id: String(x.id), from: x.mine ? 'me' : 'them', text: x.text, at: new Date(x.at) })),
    date: m.date ? { ...m.date, idea: m.date.idea ?? undefined } : undefined,
    afterDate: { mine: m.after_date?.mine, theirs: m.after_date?.theirs ?? undefined },
    ended: m.ended,
    unread: m.unread,
    photos: photoUrls(m.photos),
    profile: { bio: m.bio ?? '', goal: m.goal ?? undefined, prompts, interests: m.interests, music: m.music ?? undefined },
  };
}

/** Mit Server: Lesen über my_matches(), Schreiben über die Funktionen der Datenbank. */
export function createServerStore(db: SupabaseClient, pollMs = 4000): MatchStore {
  let matches: Match[] = [];
  let myInterests: string[] | undefined;
  const watching = new Set<string>();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  const local = (id: string, fn: (m: Match) => Match) => {
    matches = matches.map((m) => (m.id === id ? fn(m) : m));
    emit();
  };

  const refresh = async () => {
    const { data: user } = await db.auth.getUser();
    if (!user.user) return;
    if (!myInterests) {
      const { data } = await db.from('profiles').select('interests').eq('id', user.user.id).maybeSingle();
      myInterests = data?.interests ?? [];
    }
    const { data, error } = await db.rpc('my_matches');
    if (error) throw error;
    matches = (data as ServerMatch[]).map((m) => fromServer(m, myInterests!)).map((m) => (watching.has(m.id) ? { ...m, unread: false } : m));
    emit();
  };
  const sync = () => refresh().catch(() => {});
  // Erst lokal zeigen, dann speichern; danach gilt der Stand vom Server.
  const call = (fn: string, args: object) => {
    db.rpc(fn, args).then(sync, sync);
  };
  const msg = (text: string): Message => ({ id: `local-${Date.now()}`, from: 'me', text, at: new Date() });
  const markRead = (id: string) => db.rpc('mark_read', { other: id }).then(sync, sync);
  const remove = async (id: string, fn: string, args: object) => {
    const { error } = await db.rpc(fn, args);
    if (error) throw error;
    matches = matches.filter((m) => m.id !== id);
    emit();
    sync();
  };

  return {
    list: () => matches,
    get: (id) => matches.find((m) => m.id === id),
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    add() {
      sync();
    },
    answer(id, key, text) {
      local(id, (m) => ({ ...m, answers: { ...m.answers, [key]: { ...m.answers[key], mine: text } } }));
      call('answer_question', { other: id, question_key: key, answer: text });
    },
    send(id, text) {
      local(id, (m) => ({ ...m, messages: [...m.messages, msg(text)] }));
      call('send_message', { other: id, body: text });
    },
    proposeDate(id, idea, place, when, reserved = false) {
      local(id, (m) => ({ ...m, date: { idea, place, when, accepted: false, past: false, reserved, mine: true } }));
      call('propose_date', { other: id, idea, place, when_text: when, reserved });
    },
    acceptDate(id) {
      local(id, (m) => ({ ...m, date: m.date && { ...m.date, accepted: true } }));
      call('accept_date', { other: id });
    },
    markDatePast(id) {
      call('beta_finish_date', { other: id });
    },
    answerAfterDate(id, answer) {
      local(id, (m) => ({ ...m, afterDate: { ...m.afterDate, mine: answer } }));
      call('answer_after_date', { other: id, answer });
    },
    endKindly(id, text) {
      local(id, (m) => ({ ...m, ended: true, messages: [...m.messages, msg(text)] }));
      call('end_match', { other: id, goodbye: text });
    },
    reset() {
      matches = [];
      myInterests = undefined;
      emit();
    },
    refresh() {
      sync();
    },
    watch(id) {
      watching.add(id);
      local(id, (m) => ({ ...m, unread: false }));
      markRead(id);
      const timer = setInterval(() => markRead(id), pollMs);
      return () => {
        clearInterval(timer);
        watching.delete(id);
        markRead(id);
      };
    },
    report: (id, reason) => remove(id, 'report_user', { other: id, reason }),
    block: (id) => remove(id, 'block_user', { other: id }),
  };
}

export const matchStore = supabase ? createServerStore(supabase) : createDemoStore();

export function useMatches() {
  return useSyncExternalStore(matchStore.subscribe, matchStore.list);
}

/** Zahl für die Tab-Leiste; fragt den Server regelmäßig, damit Neues auch ohne Öffnen auftaucht. */
export function useUnreadCount(pollMs = 15000) {
  useEffect(() => {
    matchStore.refresh();
    const timer = setInterval(matchStore.refresh, pollMs);
    return () => clearInterval(timer);
  }, [pollMs]);
  return unreadCount(useMatches());
}

export function useMatch(id: string) {
  return useSyncExternalStore(matchStore.subscribe, () => matchStore.get(id));
}
