/**
 * „Heute in deiner Nähe aktiv“: erst ab einer Mindestzahl, grob abgerundet.
 * Gespiegelt in supabase/migrations/20261008010000_active_nearby.sql (active_nearby).
 */
export const ACTIVE_NEARBY_MIN = 50;

// Abrunden auf 50, ab 100 auf Hunderter, ab 1000 auf Tausender; „über“ stimmt dadurch immer.
export function activeNearbyBucket(count: number): number | null {
  if (count <= ACTIVE_NEARBY_MIN) return null;
  const step = count <= 100 ? 50 : count <= 1000 ? 100 : 1000;
  return Math.floor((count - 1) / step) * step;
}

export const activeNearbyLabel = (bucket: number) =>
  `Über ${String(bucket).replace(/\B(?=(\d{3})+$)/g, '.')} Menschen in deiner Nähe sind heute aktiv`;
