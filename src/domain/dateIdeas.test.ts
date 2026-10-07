import { DATE_IDEAS, dateIdeas, FALLBACK_IDEAS } from './dateIdeas.ts';
import { INTERESTS } from './profileContent.ts';

describe('dateIdeas', () => {
  it('has a public, low-key idea for every interest', () => {
    expect(Object.keys(DATE_IDEAS).sort()).toEqual([...INTERESTS].sort());
  });

  it('starts with ideas from shared interests and fills up with easy classics', () => {
    expect(dateIdeas(['Flohmärkte', 'Kochen'])).toEqual([DATE_IDEAS['Flohmärkte'], DATE_IDEAS['Kochen'], FALLBACK_IDEAS[0]]);
    expect(dateIdeas([])).toEqual(FALLBACK_IDEAS);
  });

  it('offers at most three ideas', () => {
    expect(dateIdeas(['Kino', 'Lesen', 'Kaffee', 'Wein'])).toHaveLength(3);
  });
});
