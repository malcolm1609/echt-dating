import { DAILY_SHOW_CAP, pickReason, rankPicks, scorePick, RankCandidate } from './ranking.ts';

const base: RankCandidate = { id: 'x', goalFit: 0, shared: 0, activeRecently: false, likedMe: false, shownThisWeek: 5, shownToday: 0 };
const c = (id: string, extra: Partial<RankCandidate> = {}): RankCandidate => ({ ...base, id, ...extra });

describe('scorePick', () => {
  it('weighs the same goal most, then recent activity, then shared interests', () => {
    expect(scorePick(c('a', { goalFit: 2 }))).toBe(3);
    expect(scorePick(c('a', { goalFit: 1 }))).toBe(1);
    expect(scorePick(c('a', { activeRecently: true }))).toBe(2);
    expect(scorePick(c('a', { shared: 5 }))).toBe(3);
  });
});

describe('rankPicks', () => {
  it('puts the best matches first and keeps the order stable for the day', () => {
    const pool = [c('low'), c('high', { goalFit: 2, activeRecently: true }), c('mid', { goalFit: 2 })];
    expect(rankPicks(pool, 3, 'tag-1').map((p) => p.id)).toEqual(['high', 'mid', 'low']);
    expect(rankPicks(pool, 3, 'tag-1')).toEqual(rankPicks([...pool].reverse(), 3, 'tag-1'));
  });

  it('keeps one place for someone who already liked me', () => {
    const pool = [c('a', { goalFit: 2 }), c('b', { goalFit: 2 }), c('fan', { likedMe: true })];
    expect(rankPicks(pool, 2, 'tag-1').map((p) => p.id)).toContain('fan');
  });

  it('keeps one place for whoever was shown least this week', () => {
    const pool = [c('a', { goalFit: 2 }), c('b', { goalFit: 2 }), c('quiet', { shownThisWeek: 0 })];
    expect(rankPicks(pool, 2, 'tag-1').map((p) => p.id)).toContain('quiet');
  });

  it('rests people who were already shown often today', () => {
    const pool = [c('busy', { goalFit: 2, shownToday: DAILY_SHOW_CAP }), c('b')];
    expect(rankPicks(pool, 6, 'tag-1').map((p) => p.id)).toEqual(['b']);
  });

  it('returns nothing when the day is used up', () => {
    expect(rankPicks([c('a')], 0, 'tag-1')).toEqual([]);
  });
});

describe('pickReason', () => {
  it('names the shared goal and up to three shared interests', () => {
    expect(pickReason({ goal: 'fest', interests: ['Kochen', 'Lesen'] }, { goal: 'fest', interests: ['Kochen', 'Radfahren'] }))
      .toBe('Ihr sucht beide eine feste Beziehung und mögt Kochen.');
    expect(pickReason({ goal: 'offen', interests: ['A', 'B', 'C', 'D'] }, { goal: 'offen', interests: ['A', 'B', 'C', 'D'] }))
      .toBe('Ihr seid beide offen für das, was entsteht, und mögt A, B und C.');
  });

  it('works with only one of the two, and stays quiet with neither', () => {
    expect(pickReason({ goal: 'fest', interests: [] }, { goal: 'ernst', interests: [] })).toBeNull();
    expect(pickReason({ goal: 'fest', interests: ['Kino', 'Lesen'] }, { goal: 'ernst', interests: ['Lesen', 'Kino'] }))
      .toBe('Ihr mögt beide Lesen und Kino.');
    expect(pickReason({ goal: 'freundschaft', interests: [] }, { goal: 'freundschaft', interests: [] }))
      .toBe('Ihr sucht beide erstmal Freundschaft.');
  });
});
