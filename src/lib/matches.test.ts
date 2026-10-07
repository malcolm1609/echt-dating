import { createDemoStore } from './matches';

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
