export type CheckResult = 'passed' | 'failed' | 'pending';
export type Gender = 'f' | 'm';

export interface Applicant {
  idCheck: CheckResult;
  selfieMatch: CheckResult;
  age: number;
  gender: Gender;
}

export interface AreaStats {
  counts: Record<Gender, number>;
  capacity: number;
}

export type Admission =
  | { status: 'admitted' }
  | { status: 'pending_verification' }
  | { status: 'rejected'; reason: 'verification_failed' | 'underage' }
  | { status: 'waitlisted'; reason: 'gender_ratio' | 'capacity' };

const MIN_AGE = 18;
const BOOTSTRAP_POPULATION = 50;
const MAX_GENDER_SHARE = 0.6;

export function decideAdmission(a: Applicant, area: AreaStats): Admission {
  if (a.idCheck === 'failed' || a.selfieMatch === 'failed') return { status: 'rejected', reason: 'verification_failed' };
  if (a.idCheck === 'pending' || a.selfieMatch === 'pending') return { status: 'pending_verification' };
  if (a.age < MIN_AGE) return { status: 'rejected', reason: 'underage' };

  const total = area.counts.f + area.counts.m;
  if (total >= area.capacity) return { status: 'waitlisted', reason: 'capacity' };
  if (total < BOOTSTRAP_POPULATION) return { status: 'admitted' };

  const share = (area.counts[a.gender] + 1) / (total + 1);
  return share > MAX_GENDER_SHARE ? { status: 'waitlisted', reason: 'gender_ratio' } : { status: 'admitted' };
}
