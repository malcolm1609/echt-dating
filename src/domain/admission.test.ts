import { decideAdmission, AreaStats } from './admission';

const verified = { idCheck: 'passed', selfieMatch: 'passed', age: 25, gender: 'f' } as const;
const area = (f: number, m: number, capacity = 1000): AreaStats => ({ counts: { f, m }, capacity });

describe('decideAdmission', () => {
  it('rejects when ID check or selfie did not pass', () => {
    expect(decideAdmission({ ...verified, idCheck: 'failed' }, area(10, 10))).toEqual({ status: 'rejected', reason: 'verification_failed' });
    expect(decideAdmission({ ...verified, selfieMatch: 'pending' }, area(10, 10))).toEqual({ status: 'pending_verification' });
  });

  it('rejects people under 18', () => {
    expect(decideAdmission({ ...verified, age: 17 }, area(10, 10))).toEqual({ status: 'rejected', reason: 'underage' });
  });

  it('admits everyone while an area is still small', () => {
    expect(decideAdmission(verified, area(40, 0))).toEqual({ status: 'admitted' });
  });

  it('admits when the ratio stays balanced after joining', () => {
    expect(decideAdmission(verified, area(55, 50))).toEqual({ status: 'admitted' });
  });

  it('waitlists when joining would tip the ratio past 60 %', () => {
    expect(decideAdmission(verified, area(60, 40))).toEqual({ status: 'waitlisted', reason: 'gender_ratio' });
  });

  it('waitlists when the area is at capacity', () => {
    expect(decideAdmission({ ...verified, gender: 'm' }, area(50, 50, 100))).toEqual({ status: 'waitlisted', reason: 'capacity' });
  });
});
