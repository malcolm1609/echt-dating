import { createEventStore } from './events';

describe('event store', () => {
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
});
