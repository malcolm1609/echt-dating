import { locate, LocationApi } from './location';

const api = (over: Partial<LocationApi> = {}): LocationApi => ({
  requestPermission: jest.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
  currentPosition: jest.fn().mockResolvedValue({ lat: 52.52, lng: 13.4 }),
  ...over,
});

describe('locate', () => {
  it('returns the position when access is granted', async () => {
    expect(await locate(api())).toEqual({ ok: true, coords: { lat: 52.52, lng: 13.4 } });
  });

  it('can ask again after a first refusal', async () => {
    const result = await locate(api({ requestPermission: jest.fn().mockResolvedValue({ granted: false, canAskAgain: true }) }));
    expect(result).toEqual({ ok: false, reason: 'denied' });
  });

  it('points to the settings when the system will not ask again', async () => {
    const result = await locate(api({ requestPermission: jest.fn().mockResolvedValue({ granted: false, canAskAgain: false }) }));
    expect(result).toEqual({ ok: false, reason: 'blocked' });
  });

  it('reports a missing GPS signal instead of crashing', async () => {
    const result = await locate(api({ currentPosition: jest.fn().mockRejectedValue(new Error('Location services are disabled')) }));
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });
});
