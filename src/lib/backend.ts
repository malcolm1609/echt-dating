import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { CompleteProfile } from '../ui/ProfileForm';
import type { Decision, Pick } from '../ui/TodayDeck';

export type MyStatus =
  | { status: 'pending_verification' | 'admitted' | 'rejected' }
  | { status: 'waitlisted'; position: number | null; ratio: { f: number; m: number } | null };

export interface Location { lat: number; lng: number }

export interface Backend {
  demo: boolean;
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  saveProfile(profile: CompleteProfile, location: Location): Promise<void>;
  /** Liefert die Adresse der Ausweis- und Selfie-Prüfung beim Anbieter. */
  startVerification(): Promise<{ url: string | null }>;
  myStatus(): Promise<MyStatus>;
  /** Hält das Profil sichtbar; nach 7 Tagen ohne Aufruf verschwindet es aus den Vorschlägen. */
  touchActivity(): Promise<void>;
  todaysPicks(): Promise<{ picks: Pick[]; used: number }>;
  decide(id: string, decision: Decision): Promise<{ matched: boolean }>;
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
function demoBackend(): Backend {
  let verified = false;
  const wait = () => new Promise<void>((r) => setTimeout(r, 300));
  return {
    demo: true,
    sendCode: wait,
    verifyCode: wait,
    saveProfile: wait,
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
      return { picks: DEMO_PICKS, used: 0 };
    },
    async decide(id, decision) {
      await wait();
      return { matched: decision === 'like' && id === 'demo-2' };
    },
  };
}

export const backend: Backend = url && key ? supabaseBackend(url, key) : demoBackend();
