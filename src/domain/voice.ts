// Sprachmemos im Chat (Malcolm, 2026-10-09). Grenzen wie messages.duration_ms in der Datenbank.
export const MAX_VOICE_MS = 60_000;
export const MIN_VOICE_MS = 500;

/** 0:07, 1:00 */
export function voiceClock(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
