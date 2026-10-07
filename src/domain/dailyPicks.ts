import type { ActivityStatus } from './activity';

export interface Candidate {
  id: string;
  status: ActivityStatus;
  seen: boolean;
}

export const DAILY_LIMIT = 6;
const SUGGESTABLE: ActivityStatus[] = ['active', 'reminder'];

export function dailyPicks(pool: Candidate[], usedToday: number): Candidate[] {
  const left = Math.max(0, DAILY_LIMIT - usedToday);
  return pool.filter((c) => !c.seen && SUGGESTABLE.includes(c.status)).slice(0, left);
}
