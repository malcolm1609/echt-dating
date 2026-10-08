import { createCampusStore } from './campus';

describe('campus store', () => {
  it('remembers the university of a verified uni mail and ignores other mail', () => {
    const store = createCampusStore();
    expect(store.verify('lena@gmail.com')).toBeNull();
    expect(store.get().uni).toBeNull();
    expect(store.verify('lena@students.uni-giessen.de')).toBe('JLU Gießen');
    expect(store.get().uni).toBe('JLU Gießen');
    store.reset();
    expect(store.get().uni).toBeNull();
  });
});
