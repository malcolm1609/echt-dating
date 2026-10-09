// Didit-Anbindung ohne Deno- oder Node-spezifische APIs, damit Jest und die Edge Functions sie teilen.
// Doku: https://docs.didit.me/integration/webhooks
import type { CheckResult, Gender } from '../../../src/domain/admission.ts';
import { processVerification, type Area } from '../../../src/domain/onboarding.ts';

type DiditStatus = 'Approved' | 'Declined' | 'In Review' | 'In Progress' | 'Not Started' | 'Abandoned' | 'Expired' | string;
interface Check { status: DiditStatus; date_of_birth?: string; score?: number }

export interface DiditWebhook {
  webhook_type: string;
  session_id: string;
  status: DiditStatus;
  vendor_data: string | null;
  decision?: { id_verifications?: Check[]; liveness_checks?: Check[]; face_matches?: Check[] };
}

const MAX_AGE_SECONDS = 300;

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Gibt den Webhook zurück, wenn Signatur und Zeitstempel stimmen, sonst null. */
export async function verifyWebhook(rawBody: string, headers: Record<string, string | undefined>, secret: string, now = new Date()): Promise<DiditWebhook | null> {
  const ts = Number(headers['x-timestamp']);
  if (!Number.isFinite(ts) || Math.abs(now.getTime() / 1000 - ts) > MAX_AGE_SECONDS) return null;

  let body: DiditWebhook;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return null;
  }
  const v2 = headers['x-signature-v2'];
  if (v2 && sameHex(v2, await hmacHex(secret, canonicalJson(body)))) return body;
  const v1 = headers['x-signature'];
  if (v1 && sameHex(v1, await hmacHex(secret, rawBody))) return body;
  return null;
}

const toCheck = (s: DiditStatus | undefined): CheckResult => (s === 'Approved' ? 'passed' : s === 'Declined' ? 'failed' : 'pending');

export function toVerification(w: DiditWebhook): { idCheck: CheckResult; selfieMatch: CheckResult; birthdate: string | null } {
  const id = w.decision?.id_verifications?.[0];
  const birthdate = id?.date_of_birth ?? null;
  if (w.status !== 'Approved' && w.status !== 'Declined') return { idCheck: 'pending', selfieMatch: 'pending', birthdate };

  const selfie = [w.decision?.liveness_checks?.[0], w.decision?.face_matches?.[0]].map((c) => toCheck(c?.status));
  return {
    idCheck: toCheck(id?.status),
    selfieMatch: selfie.includes('failed') ? 'failed' : selfie.every((c) => c === 'passed') ? 'passed' : 'pending',
    birthdate,
  };
}

export interface ProfileForDecision { status: string; gender: Gender }
export interface ProfileUpdate { status: 'admitted' | 'waitlisted' | 'rejected'; area_id: number | null; birthdate: string | null }

/** Neue Werte fürs Profil, oder null, wenn nichts zu entscheiden ist. */
export function decideWebhook(w: DiditWebhook, profile: ProfileForDecision, area: Area | null, today: Date): ProfileUpdate | null {
  if (profile.status !== 'pending_verification') return null;
  const v = toVerification(w);
  if (v.idCheck === 'pending' || v.selfieMatch === 'pending') return null;
  if (v.idCheck === 'failed' || v.selfieMatch === 'failed' || !v.birthdate) return { status: 'rejected', area_id: null, birthdate: null };

  const outcome = processVerification({ ...v, birthdate: v.birthdate, gender: profile.gender }, area, today);
  if (outcome.status === 'rejected') return { status: 'rejected', area_id: null, birthdate: v.birthdate };
  if (outcome.status === 'pending_verification') return null;
  return { status: outcome.status, area_id: outcome.areaId, birthdate: v.birthdate };
}
