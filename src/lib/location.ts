export interface Coords {
  lat: number;
  lng: number;
}

export type LocateResult = { ok: true; coords: Coords } | { ok: false; reason: 'denied' | 'blocked' | 'unavailable' };

export interface LocationApi {
  requestPermission: () => Promise<{ granted: boolean; canAskAgain: boolean }>;
  currentPosition: () => Promise<Coords>;
}

// Standort nur per GPS (Entscheidung 2026-10-07): keine Eingabe von Hand.
export async function locate(api: LocationApi): Promise<LocateResult> {
  const { granted, canAskAgain } = await api.requestPermission();
  if (!granted) return { ok: false, reason: canAskAgain ? 'denied' : 'blocked' };
  try {
    return { ok: true, coords: await api.currentPosition() };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}
