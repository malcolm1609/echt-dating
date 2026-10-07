import { GoalId, sharedInterests } from './profileContent.ts';

/**
 * Reihenfolge der Tagesvorschläge: feste Regeln statt eines lernenden Modells.
 * Bewusst nicht berücksichtigt: wie oft jemand geliked wird, Aussehen, Fotos.
 * Gespiegelt in supabase/migrations/20261008000000_preferences.sql (todays_picks).
 */
export interface RankCandidate {
  id: string;
  /** 2 = gleiches Ziel, 1 = nah dran, 0 = passt kaum (goalFit). */
  goalFit: number;
  /** Anzahl gemeinsamer Interessen. */
  shared: number;
  /** In den letzten 2 Tagen in der App. */
  activeRecently: boolean;
  /** Hat mich schon geliked. Bleibt verborgen, sichert nur einen Platz. */
  likedMe: boolean;
  /** Wie oft die Person in den letzten 7 Tagen bewertet wurde, also gezeigt war. */
  shownThisWeek: number;
  shownToday: number;
}

/** Wer heute schon so oft gezeigt wurde, pausiert bis morgen, damit sich Aufmerksamkeit verteilt. */
export const DAILY_SHOW_CAP = 12;
const GOAL_POINTS = [0, 1, 3];
const SHARED_MAX = 3;

export const scorePick = (c: RankCandidate) =>
  GOAL_POINTS[c.goalFit] + Math.min(c.shared, SHARED_MAX) + (c.activeRecently ? 2 : 0);

// Gleichstand: zufällig, aber pro Person und Tag fest (wie md5 in der Datenbank).
function tiebreak(seed: string, id: string) {
  let h = 2166136261;
  for (const ch of seed + id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function rankPicks<T extends RankCandidate>(pool: T[], limit: number, seed: string): T[] {
  const byScore = (a: T, b: T) => scorePick(b) - scorePick(a) || tiebreak(seed, a.id) - tiebreak(seed, b.id);
  const open = pool.filter((c) => c.shownToday < DAILY_SHOW_CAP).sort(byScore);
  if (limit <= 0) return [];
  const fan = open.find((c) => c.likedMe);
  const rest = open.filter((c) => c !== fan);
  const quiet = [...rest].sort((a, b) => a.shownThisWeek - b.shownThisWeek || byScore(a, b))[0];
  const reserved = [fan, quiet].filter((c): c is T => !!c).slice(0, limit);
  const chosen = [...reserved, ...open.filter((c) => !reserved.includes(c))].slice(0, limit);
  return chosen.sort(byScore);
}

const GOAL_CLAUSE: Record<GoalId, string> = {
  fest: 'sucht beide eine feste Beziehung',
  ernst: 'sucht beide etwas Ernstes, ohne Eile',
  offen: 'seid beide offen für das, was entsteht,',
  freundschaft: 'sucht beide erstmal Freundschaft',
};

const listing = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}` : items[0]);

interface Side { goal?: GoalId; interests: string[] }

/** Ein Satz unter dem Vorschlag: warum gerade diese Person. */
export function pickReason(me: Side, them: Side): string | null {
  const shared = sharedInterests(me.interests, them.interests).slice(0, SHARED_MAX);
  const goal = me.goal && me.goal === them.goal ? GOAL_CLAUSE[me.goal] : null;
  if (goal && shared.length) return `Ihr ${goal} und mögt ${listing(shared)}.`;
  if (goal) return `Ihr ${goal.replace(/,$/, '')}.`;
  if (shared.length) return `Ihr mögt beide ${listing(shared)}.`;
  return null;
}
