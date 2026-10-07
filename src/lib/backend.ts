import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { ageOn } from '../domain/onboarding.ts';
import type { CompleteProfile } from '../ui/ProfileForm';
import type { MyProfile } from '../ui/ProfileView';
import type { Decision, Pick } from '../ui/TodayDeck';

export type MyStatus =
  | { status: 'pending_verification' | 'admitted' | 'rejected' }
  | { status: 'waitlisted'; position: number | null; ratio: { f: number; m: number } | null };

export interface Location { lat: number; lng: number }

export interface Backend {
  demo: boolean;
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  /** Zweite Prüfung: SMS-Code an die Handynummer (E.164). Eine Nummer gehört genau zu einem Konto. */
  sendPhoneCode(phone: string): Promise<void>;
  verifyPhoneCode(phone: string, code: string): Promise<void>;
  myProfile(): Promise<MyProfile>;
  saveBio(bio: string): Promise<void>;
  saveProfile(profile: CompleteProfile, location: Location): Promise<void>;
  /** Liefert die Adresse der Ausweis- und Selfie-Prüfung beim Anbieter. */
  startVerification(): Promise<{ url: string | null }>;
  myStatus(): Promise<MyStatus>;
  /** Hält das Profil sichtbar; nach 7 Tagen ohne Aufruf verschwindet es aus den Vorschlägen. */
  touchActivity(): Promise<void>;
  todaysPicks(): Promise<{ picks: Pick[]; used: number }>;
  decide(id: string, decision: Decision): Promise<{ matched: boolean }>;
  /** Pausiert: keine Vorschläge, und man wird niemandem gezeigt. */
  isPaused(): Promise<boolean>;
  setPaused(paused: boolean): Promise<void>;
  /** Nur Demo: alles auf Anfang. */
  reset?(): void;
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function supabaseBackend(url: string, key: string): Backend {
  const db = createClient(url, key, { auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  const ok = <T>({ data, error }: { data: T; error: unknown }) => {
    if (error) throw error;
    return data;
  };
  const uid = async () => {
    const { data } = await db.auth.getUser();
    if (!data.user) throw new Error('Nicht angemeldet');
    return data.user.id;
  };

  return {
    demo: false,
    async sendCode(email) {
      ok(await db.auth.signInWithOtp({ email }));
    },
    async verifyCode(email, token) {
      ok(await db.auth.verifyOtp({ email, token, type: 'email' }));
    },
    async sendPhoneCode(phone) {
      const { error } = await db.auth.updateUser({ phone });
      if (error) throw error;
    },
    async verifyPhoneCode(phone, token) {
      ok(await db.auth.verifyOtp({ phone, token, type: 'phone_change' }));
    },
    async myProfile() {
      const { data } = await db.auth.getUser();
      if (!data.user) throw new Error('Nicht angemeldet');
      const p = ok(await db.from('profiles').select('display_name, birthdate, bio, gender, seeking, paused').eq('id', data.user.id).single())!;
      const phone = data.user.phone ? `+${data.user.phone.replace(/^\+/, '')}` : null;
      return { displayName: p.display_name, age: ageOn(p.birthdate, new Date()), bio: p.bio, gender: p.gender, seeking: p.seeking, phone, paused: p.paused };
    },
    async saveBio(bio) {
      ok(await db.from('profiles').update({ bio }).eq('id', await uid()));
    },
    async saveProfile(p, { lat, lng }) {
      const id = await uid();
      const editable = { display_name: p.displayName, seeking: p.seeking, lat, lng };
      const { error } = await db.from('profiles').insert({ id, ...editable, birthdate: p.birthdate, gender: p.gender });
      // Profil existiert schon: Geburtsdatum und Geschlecht sind nach dem Anlegen gesperrt.
      if (error?.code === '23505') ok(await db.from('profiles').update(editable).eq('id', id));
      else if (error) throw error;
    },
    async startVerification() {
      return ok(await db.functions.invoke<{ url: string }>('verification-start')) ?? { url: null };
    },
    async myStatus() {
      const me = ok(await db.from('profiles').select('status, area_id').eq('id', await uid()).single())!;
      if (me.status !== 'waitlisted') return { status: me.status };
      const pos = ok(await db.from('my_waitlist_position').select('position').maybeSingle());
      const area = me.area_id ? ok(await db.from('area_stats').select('f, m').eq('area_id', me.area_id).maybeSingle()) : null;
      return { status: 'waitlisted', position: pos?.position ?? null, ratio: area };
    },
    async touchActivity() {
      ok(await db.rpc('touch_activity'));
    },
    async todaysPicks() {
      const [rows, today] = await Promise.all([db.rpc('todays_picks'), db.from('my_picks_today').select('used').single()]);
      const picks = (ok(rows) ?? []).map((r: any) => ({ id: r.id, displayName: r.display_name, age: r.age, bio: r.bio, distanceKm: r.distance_km }));
      return { picks, used: ok(today)?.used ?? 0 };
    },
    async isPaused() {
      return ok(await db.from('profiles').select('paused').eq('id', await uid()).single())!.paused;
    },
    async setPaused(paused) {
      ok(await db.from('profiles').update({ paused }).eq('id', await uid()));
    },
    async decide(to_id, decision) {
      const me = await uid();
      ok(await db.from('likes').insert({ from_id: me, to_id, decision }));
      if (decision === 'pass') return { matched: false };
      const [user_a, user_b] = [me, to_id].sort();
      const match = ok(await db.from('matches').select('id').eq('user_a', user_a).eq('user_b', user_b).maybeSingle());
      return { matched: !!match };
    },
  };
}

const DEMO_PICKS: Pick[] = [
  { id: 'demo-1', displayName: 'Jonas', age: 31, bio: 'Baut Fahrräder, kocht lieber als er bestellt.', distanceKm: 4 },
  { id: 'demo-2', displayName: 'Elif', age: 28, bio: 'Sonntags auf dem Flohmarkt, unter der Woche im Labor.', distanceKm: 7 },
  { id: 'demo-3', displayName: 'Sam', age: 33, bio: 'Sucht jemanden für lange Spaziergänge und kurze Nachrichten.', distanceKm: 2 },
];

/** Ohne Supabase-Zugangsdaten: klickbarer Ablauf mit Beispieldaten. */
export function demoBackend(delayMs = 300): Backend {
  let verified = false;
  let paused = false;
  let decided: string[] = [];
  let phone: string | null = null;
  let profile: CompleteProfile = { displayName: 'Anna', birthdate: '1998-04-12', gender: 'f', seeking: ['m'] };
  let bio = 'Läuft gern am Kanal, liest lieber Papier als Bildschirm.';
  const wait = () => new Promise<void>((r) => setTimeout(r, delayMs));
  return {
    demo: true,
    sendCode: wait,
    verifyCode: wait,
    sendPhoneCode: wait,
    async verifyPhoneCode(p) {
      await wait();
      phone = p;
    },
    async saveProfile(p) {
      await wait();
      profile = p;
    },
    async myProfile() {
      await wait();
      return { displayName: profile.displayName, age: ageOn(profile.birthdate, new Date()), bio, gender: profile.gender, seeking: profile.seeking, phone, paused };
    },
    async saveBio(b) {
      await wait();
      bio = b;
    },
    async startVerification() {
      await wait();
      verified = true;
      return { url: null };
    },
    async myStatus() {
      return verified ? { status: 'waitlisted', position: 37, ratio: { f: 412, m: 498 } } : { status: 'pending_verification' };
    },
    touchActivity: wait,
    async todaysPicks() {
      await wait();
      if (paused) return { picks: [], used: decided.length };
      return { picks: DEMO_PICKS.filter((p) => !decided.includes(p.id)), used: decided.length };
    },
    async decide(id, decision) {
      await wait();
      if (!decided.includes(id)) decided = [...decided, id];
      return { matched: decision === 'like' && id === 'demo-2' };
    },
    async isPaused() {
      return paused;
    },
    async setPaused(p) {
      paused = p;
    },
    reset() {
      verified = false;
      paused = false;
      decided = [];
      phone = null;
    },
  };
}

export const backend: Backend = url && key ? supabaseBackend(url, key) : demoBackend();
