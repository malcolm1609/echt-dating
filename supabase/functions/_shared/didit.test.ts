/** @jest-environment node */
import { createHmac } from 'node:crypto';
import { canonicalJson, verifyWebhook, toVerification, decideWebhook, DiditWebhook } from './didit';
import type { Area } from '../../../src/domain/onboarding';

const secret = 'test-secret';
const now = new Date('2026-10-07T12:00:00Z');
const ts = String(now.getTime() / 1000);

const approved: DiditWebhook = {
  webhook_type: 'status.updated',
  session_id: 'sess-1',
  status: 'Approved',
  vendor_data: 'user-1',
  decision: {
    id_verifications: [{ status: 'Approved', date_of_birth: '1998-04-12' }],
    liveness_checks: [{ status: 'Approved', score: 95.4 }],
    face_matches: [{ status: 'Approved', score: 96 }],
  },
};

const sign = (data: string) => createHmac('sha256', secret).update(data).digest('hex');

describe('canonicalJson', () => {
  it('sorts keys at every level and keeps unicode', () => {
    expect(canonicalJson({ b: 1, a: { d: 'ü', c: [2, { f: 1, e: 0 }] } })).toBe('{"a":{"c":[2,{"e":0,"f":1}],"d":"ü"},"b":1}');
  });
});

describe('verifyWebhook', () => {
  const raw = JSON.stringify(approved, null, 2);

  it('accepts a valid X-Signature-V2 over canonical JSON', async () => {
    const headers = { 'x-signature-v2': sign(canonicalJson(approved)), 'x-timestamp': ts };
    await expect(verifyWebhook(raw, headers, secret, now)).resolves.toEqual(approved);
  });

  it('falls back to X-Signature over the raw body', async () => {
    const headers = { 'x-signature-v2': 'nope', 'x-signature': sign(raw), 'x-timestamp': ts };
    await expect(verifyWebhook(raw, headers, secret, now)).resolves.toEqual(approved);
  });

  it('rejects a wrong signature', async () => {
    const headers = { 'x-signature-v2': sign('{}'), 'x-timestamp': ts };
    await expect(verifyWebhook(raw, headers, secret, now)).resolves.toBeNull();
  });

  it('rejects webhooks older than 5 minutes', async () => {
    const old = String(now.getTime() / 1000 - 301);
    const headers = { 'x-signature-v2': sign(canonicalJson(approved)), 'x-timestamp': old };
    await expect(verifyWebhook(raw, headers, secret, now)).resolves.toBeNull();
  });
});

describe('toVerification', () => {
  it('maps an approved session', () => {
    expect(toVerification(approved)).toEqual({ idCheck: 'passed', selfieMatch: 'passed', birthdate: '1998-04-12' });
  });

  it('fails the selfie when liveness or face match is declined', () => {
    const w = { ...approved, status: 'Declined', decision: { ...approved.decision, face_matches: [{ status: 'Declined' }] } };
    expect(toVerification(w).selfieMatch).toBe('failed');
  });

  it('stays pending while the session is in review or running', () => {
    expect(toVerification({ ...approved, status: 'In Review' })).toEqual({ idCheck: 'pending', selfieMatch: 'pending', birthdate: '1998-04-12' });
    expect(toVerification({ ...approved, status: 'In Progress', decision: undefined })).toEqual({ idCheck: 'pending', selfieMatch: 'pending', birthdate: null });
  });
});

describe('decideWebhook', () => {
  const berlin: Area = { id: 1, capacity: 1000, counts: { f: 10, m: 10 } };
  const profile = { status: 'pending_verification', gender: 'f', lat: 52.5, lng: 13.4 } as const;

  it('admits a pending profile and stores the birthdate from the ID', () => {
    expect(decideWebhook(approved, profile, berlin, now)).toEqual({ status: 'admitted', area_id: 1, birthdate: '1998-04-12' });
  });

  it('never re-decides a profile that already has a decision', () => {
    expect(decideWebhook(approved, { ...profile, status: 'admitted' }, berlin, now)).toBeNull();
  });

  it('changes nothing while the check is still pending', () => {
    expect(decideWebhook({ ...approved, status: 'In Review' }, profile, berlin, now)).toBeNull();
  });

  it('rejects declined checks', () => {
    expect(decideWebhook({ ...approved, status: 'Declined', decision: { ...approved.decision, id_verifications: [{ status: 'Declined' }] } }, profile, berlin, now))
      .toEqual({ status: 'rejected', area_id: null, birthdate: null });
  });
});
