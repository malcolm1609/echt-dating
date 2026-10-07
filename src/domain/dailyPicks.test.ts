import { dailyPicks, Candidate } from './dailyPicks';

const c = (id: string, status: Candidate['status'] = 'active', seen = false): Candidate => ({ id, status, seen });

describe('dailyPicks', () => {
  it('returns at most 6 suggestions per day', () => {
    const pool = Array.from({ length: 10 }, (_, i) => c(String(i)));
    expect(dailyPicks(pool, 0)).toHaveLength(6);
  });

  it('only suggests active people not seen before', () => {
    const pool = [c('a'), c('b', 'reminder'), c('c', 'hidden'), c('d', 'paused'), c('e', 'active', true)];
    expect(dailyPicks(pool, 0).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('subtracts suggestions already used today', () => {
    const pool = Array.from({ length: 10 }, (_, i) => c(String(i)));
    expect(dailyPicks(pool, 4)).toHaveLength(2);
    expect(dailyPicks(pool, 6)).toHaveLength(0);
  });
});
