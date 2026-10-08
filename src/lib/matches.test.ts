import type { SupabaseClient } from '@supabase/supabase-js';
import { createDemoStore, createServerStore, fromServer } from './matches';

describe('demo match store', () => {
  it('reset brings back the starting matches', () => {
    const store = createDemoStore(0);
    store.endKindly('mara', 'Tschüss');
    store.add({ id: 'elif', name: 'Elif', age: 28 });
    store.reset();
    expect(store.list().map((m) => m.id)).toEqual(['mara', 'noah']);
    expect(store.get('mara')?.ended).toBe(false);
  });

  it('remembers which profile answer the question round starts with', () => {
    const store = createDemoStore(0);
    const opener = { question: 'Ein Ort in meiner Stadt, den ich dir zeigen würde …', answer: 'Der Flohmarkt am Mauerpark.' };
    store.add({ id: 'elif', name: 'Elif', age: 28, opener });
    expect(store.get('elif')?.opener).toEqual(opener);
  });
});

const serverMatch = {
  id: 'u-2', name: 'Lena', age: 23, interests: ['Kaffee', 'Kino'], ended: false,
  prompts: [
    { prompt_id: 'alltag-1', answer: 'Lange frühstücken.' },
    { prompt_id: 'anknuepfen-1', answer: 'Die Lahnwiesen im Sommer.' },
  ],
  answers: { '0-0': { mine: 'Meine', theirs: null } },
  messages: [{ id: 7, mine: false, text: 'Hallo!', at: '2026-10-08T10:00:00Z' }],
  date: { idea: null, place: 'Café', when: 'Samstag', reserved: false, accepted: true, past: false, mine: true },
  after_date: null,
};

describe('server match store', () => {
  it('maps the server view to what the screens show', () => {
    const m = fromServer(serverMatch, ['Kino']);
    expect(m.opener).toEqual({ question: 'Ein Ort in meiner Stadt, den ich dir zeigen würde …', answer: 'Die Lahnwiesen im Sommer.' });
    expect(m.shared).toEqual(['Kino']);
    expect(m.answers['0-0']).toEqual({ mine: 'Meine', theirs: undefined });
    expect(m.messages[0]).toMatchObject({ id: '7', from: 'them', text: 'Hallo!' });
    expect(m.date).toMatchObject({ idea: undefined, accepted: true, mine: true });
    expect(m.afterDate).toEqual({ mine: undefined, theirs: undefined });
  });

  it('shows an answer right away, saves it on the server and then loads the server state', async () => {
    const rpc = jest.fn(async (fn: string) => (fn === 'my_matches' ? { data: [serverMatch], error: null } : { data: null, error: null }));
    const profiles = { select: () => profiles, eq: () => profiles, maybeSingle: async () => ({ data: { interests: [] } }) };
    const db = { rpc, auth: { getUser: async () => ({ data: { user: { id: 'u-1' } } }) }, from: () => profiles } as unknown as SupabaseClient;
    const store = createServerStore(db);
    store.refresh();
    await new Promise((r) => setTimeout(r, 0));
    store.answer('u-2', '0-1', 'Gestern');
    expect(store.get('u-2')?.answers['0-1']?.mine).toBe('Gestern');
    expect(rpc).toHaveBeenCalledWith('answer_question', { other: 'u-2', question_key: '0-1', answer: 'Gestern' });
    await new Promise((r) => setTimeout(r, 0));
    expect(rpc.mock.calls.filter(([fn]) => fn === 'my_matches')).toHaveLength(2);
  });
});
