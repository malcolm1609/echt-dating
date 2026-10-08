import type { SupabaseClient } from '@supabase/supabase-js';
import { createEventStore, createServerEventStore } from './events';
import { matchStore } from './matches';

describe('event store', () => {
  beforeEach(() => matchStore.reset());

  it('takes a seat on join and frees it on leave', async () => {
    const store = createEventStore();
    const before = store.get().events.find((e) => e.id === 'quiz')!.joined.f;
    await store.join('quiz', 'f', false);
    expect(store.get().events.find((e) => e.id === 'quiz')!.joined.f).toBe(before + 1);
    expect(store.get().mine.has('quiz')).toBe(true);
    await store.leave('quiz', 'f');
    expect(store.get().events.find((e) => e.id === 'quiz')!.joined.f).toBe(before);
  });

  it('refuses a full half and Plus-first events without Plus', async () => {
    const store = createEventStore();
    await store.join('quiz', 'm', false);
    await store.join('bouldern', 'f', false);
    expect(store.get().mine.size).toBe(0);
    await store.join('bouldern', 'f', true);
    expect(store.get().mine.has('bouldern')).toBe(true);
  });

  it('lets invited people into invite events', async () => {
    const store = createEventStore();
    await store.join('picknick', 'f', false);
    expect(store.get().mine.has('picknick')).toBe(true);
  });

  it('puts a new event first, with the host already seated', async () => {
    const store = createEventStore();
    const id = await store.create({ title: ' Spieleabend ', kind: 'Spiele', place: 'Café Lindner', when: 'Freitag', seats: 8, price: 0, access: 'open' }, { name: 'Anna', gender: 'f' });
    const e = store.get().events[0];
    expect(e).toMatchObject({ id, title: 'Spieleabend', joined: { f: 1, m: 0 }, host: { name: 'Anna', events: 0 } });
    expect(store.get().mine.has(id)).toBe(true);
  });

  it('turns mutual picks after an event into matches, once', async () => {
    const store = createEventStore();
    expect(await store.review('spiele', 5, 'Schön', ['kai', 'ben'])).toEqual(['kai']);
    expect(matchStore.get('kai')).toMatchObject({ name: 'Kai' });
    expect(matchStore.get('ben')).toBeUndefined();
    expect(await store.review('spiele', 1, '', ['tom'])).toEqual([]);
  });

  it('remembers who the host invited, only for invite events', async () => {
    const store = createEventStore();
    const draft = { title: 'Picknick', kind: 'Draußen', place: 'Park', when: 'Sonntag', seats: 8, price: 0 };
    await store.create({ ...draft, access: 'invite' }, { name: 'Anna', gender: 'f' }, [{ id: 'mara', name: 'Mara' }]);
    expect(store.get().events[0].invitees).toEqual(['Mara']);
    await store.create({ ...draft, access: 'open' }, { name: 'Anna', gender: 'f' }, [{ id: 'mara', name: 'Mara' }]);
    expect(store.get().events[0].invitees).toBeUndefined();
  });
});

describe('event group chat (demo)', () => {
  afterEach(() => jest.useRealTimers());

  it('shows who is coming and the chat only after joining; the host answers once', async () => {
    jest.useFakeTimers();
    const store = createEventStore(10);
    expect(store.get().events.find((e) => e.id === 'kneipentour')!.people).toBeUndefined();
    await store.join('kneipentour', 'f', false);
    const e = () => store.get().events.find((x) => x.id === 'kneipentour')!;
    expect(e().people!.length).toBeGreaterThan(0);
    store.send('kneipentour', 'Bin dabei!');
    store.send('kneipentour', 'Wo genau?');
    jest.advanceTimersByTime(10);
    expect(e().messages!.map((m) => m.mine)).toEqual([true, true, false]);
  });
});

describe('server event store', () => {
  const server = {
    events: [{
      id: '7', title: 'Kneipentour', kind: 'Feiern', when: 'Heute, 21:00 Uhr', starts_at: '2026-10-08T19:00:00Z', place: 'Seltersweg', seats: 8, price: '0.00',
      access: 'open', campus: null, tonight: true, joined: { f: 1, m: 2 }, host: { name: 'Lena', events: 2, ratings: [5], reviews: [] },
      is_host: false, mine: true, invited: false, invitees: null, people: [{ id: 'u-3', name: 'Lena', age: 22, gender: 'f' }],
      messages: [{ id: 1, mine: false, name: 'Lena', text: 'Hi!', at: '2026-10-08T18:00:00Z' }],
    }],
    past: [],
  };

  it('loads events and joins through the database', async () => {
    const rpc = jest.fn(async (fn: string) => (fn === 'my_events' ? { data: server, error: null } : { data: null, error: null }));
    const store = createServerEventStore({ rpc } as unknown as SupabaseClient);
    store.refresh();
    await new Promise((r) => setTimeout(r, 0));
    const e = store.get().events[0];
    expect(e).toMatchObject({ id: '7', price: 0, tonight: true, campus: undefined });
    expect(e.messages![0]).toMatchObject({ name: 'Lena', text: 'Hi!', mine: false });
    expect(store.get().mine.has('7')).toBe(true);
    await store.join('7', 'f', false);
    expect(rpc).toHaveBeenCalledWith('join_event', { event_id: '7' });
  });

  it('reports a failed join and still shows the server state', async () => {
    const rpc = jest.fn(async (fn: string) => (fn === 'my_events' ? { data: server, error: null } : { data: null, error: new Error('full') }));
    const store = createServerEventStore({ rpc } as unknown as SupabaseClient);
    await expect(store.join('7', 'm', false)).rejects.toThrow('full');
    expect(store.get().events).toHaveLength(1);
  });
});
