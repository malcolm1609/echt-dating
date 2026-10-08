import { activeNearbyBucket, activeNearbyLabel, ACTIVE_NEARBY_MIN } from './activeNearby.ts';

describe('activeNearbyBucket', () => {
  it('stays hidden until enough people are around', () => {
    expect(ACTIVE_NEARBY_MIN).toBe(50);
    expect(activeNearbyBucket(0)).toBeNull();
    expect(activeNearbyBucket(50)).toBeNull();
  });

  it('rounds down so nobody can count who is online', () => {
    expect(activeNearbyBucket(51)).toBe(50);
    expect(activeNearbyBucket(100)).toBe(50);
    expect(activeNearbyBucket(101)).toBe(100);
    expect(activeNearbyBucket(342)).toBe(300);
    expect(activeNearbyBucket(1000)).toBe(900);
    expect(activeNearbyBucket(2480)).toBe(2000);
  });
});

describe('activeNearbyLabel', () => {
  it('reads as one calm line', () => {
    expect(activeNearbyLabel(100)).toBe('Über 100 Menschen in deiner Nähe sind heute aktiv');
    expect(activeNearbyLabel(2000)).toBe('Über 2.000 Menschen in deiner Nähe sind heute aktiv');
  });
});
