import { createEventStore } from './events';
import { matchStore } from './matches';

describe('event store', () => {
  beforeEach(() => matchStore.reset());

  it('takes a seat on join and frees it on leave', () => {
    const store = createEventStore();
    const before = store.get().events.find((e) => e.id === 'quiz')!.joined.f;
    store.join('quiz', 'f', false);
    expect(store.get().events.find((e) => e.id === 'quiz')!.joined.f).toBe(before + 1);
    expect(store.get().mine.has('quiz')).toBe(true);
    store.leave('quiz', 'f');
    expect(store.get().events.find((e) => e.id === 'quiz')!.joined.f).toBe(before);
  });

  it('refuses a full half and Plus-first events without Plus', () => {
    const store = createEventStore();
    store.join('quiz', 'm', false);
    store.join('bouldern', 'f', false);
    expect(store.get().mine.size).toBe(0);
    store.join('bouldern', 'f', true);
    expect(store.get().mine.has('bouldern')).toBe(true);
  });

  it('lets invited people into invite events', () => {
    const store = createEventStore();
    store.join('picknick', 'f', false);
    expect(store.get().mine.has('picknick')).toBe(true);
  });

  it('puts a new event first, with the host already seated', () => {
    const store = createEventStore();
    const id = store.create({ title: ' Spieleabend ', kind: 'Spiele', place: 'Café Lindner', when: 'Freitag', seats: 8, price: 0, access: 'open' }, { name: 'Anna', gender: 'f' });
    const e = store.get().events[0];
    expect(e).toMatchObject({ id, title: 'Spieleabend', joined: { f: 1, m: 0 }, host: { name: 'Anna', events: 0 } });
    expect(store.get().mine.has(id)).toBe(true);
  });

  it('turns mutual picks after an event into matches, once', () => {
    const store = createEventStore();
    expect(store.review('spiele', 5, 'Schön', ['kai', 'ben'])).toEqual(['kai']);
    expect(matchStore.get('kai')).toMatchObject({ name: 'Kai' });
    expect(matchStore.get('ben')).toBeUndefined();
    expect(store.review('spiele', 1, '', ['tom'])).toEqual([]);
  });

  it('remembers who the host invited, only for invite events', () => {
    const store = createEventStore();
    const draft = { title: 'Picknick', kind: 'Draußen', place: 'Park', when: 'Sonntag', seats: 8, price: 0 };
    store.create({ ...draft, access: 'invite' }, { name: 'Anna', gender: 'f' }, ['Mara']);
    expect(store.get().events[0].invitees).toEqual(['Mara']);
    store.create({ ...draft, access: 'open' }, { name: 'Anna', gender: 'f' }, ['Mara']);
    expect(store.get().events[0].invitees).toBeUndefined();
  });
});
