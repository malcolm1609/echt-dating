import type { SupabaseClient } from '@supabase/supabase-js';
import { ageOn } from '../domain/onboarding.ts';
import { activeNearbyBucket } from '../domain/activeNearby.ts';
import { DAILY_LIMIT } from '../domain/dailyPicks.ts';
import { defaultPreferences, fitsEachOther, Preferences } from '../domain/preferences.ts';
import { goalFit, ProfileContent, promptText, sharedInterests } from '../domain/profileContent.ts';
import type { ConsentKind } from '../domain/privacy.ts';
import { rankPicks } from '../domain/ranking.ts';
import type { CompleteProfile } from '../ui/ProfileForm';
import type { MyProfile } from '../ui/ProfileView';
import type { Decision, Pick } from '../ui/TodayDeck';
import { photoUrls, placeholderPhoto } from './photos';
import { beta, supabase } from './supabase';
import { PhotoRejected } from './photoErrors';

export type MyStatus =
  | { status: 'pending_verification' | 'admitted' | 'rejected' }
  | { status: 'waitlisted'; position: number | null; ratio: { f: number; m: number } | null };

export interface Location { lat: number; lng: number }

export interface Backend {
  demo: boolean;
  /** Testbetrieb mit Server: SMS und Ausweisprüfung werden übersprungen, Beispielprofile antworten selbst. */
  beta: boolean;
  /** Nur für Testkonten mit Passwort. */
  signInWithPassword(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Löscht das Konto mit allen Daten endgültig und meldet ab. */
  deleteAccount(): Promise<void>;
  /** Testkonto zurück auf den Startzustand mit Beispiel-Matches. */
  resetTestData(): Promise<void>;
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  /** Speichert die Einwilligungen aus der Registrierung mit der Fassung der Datenschutzerklärung. */
  recordConsent(kinds: ConsentKind[], version: string): Promise<void>;
  /** Zweite Prüfung: SMS-Code an die Handynummer (E.164). Eine Nummer gehört genau zu einem Konto. */
  sendPhoneCode(phone: string): Promise<void>;
  verifyPhoneCode(phone: string, code: string): Promise<void>;
  myProfile(): Promise<MyProfile>;
  saveBio(bio: string): Promise<void>;
  /** Lädt ein Bild hoch und gibt den Pfad zurück; sichtbar wird es erst mit savePhotos. */
  uploadPhoto(uri: string, mimeType?: string): Promise<string>;
  /** Reihenfolge der Fotos, das erste ist das Hauptfoto. */
  savePhotos(paths: string[]): Promise<void>;
  /** Fragen mit Antworten, Beziehungsziel und Interessen. */
  saveContent(content: ProfileContent): Promise<void>;
  /** Alter und Entfernung: gelten beidseitig. */
  savePreferences(p: Preferences): Promise<void>;
  saveProfile(profile: CompleteProfile, location: Location, content: ProfileContent): Promise<void>;
  /** Liefert die Adresse der Ausweis- und Selfie-Prüfung beim Anbieter. */
  startVerification(): Promise<{ url: string | null }>;
  myStatus(): Promise<MyStatus>;
  /** Hält das Profil sichtbar; nach 7 Tagen ohne Aufruf verschwindet es aus den Vorschlägen. */
  touchActivity(): Promise<void>;
  todaysPicks(): Promise<{ picks: Pick[]; used: number }>;
  /** Heute aktiv im Umkreis, schon abgerundet; null unter der Mindestzahl. */
  activeNearby(): Promise<number | null>;
  decide(id: string, decision: Decision): Promise<{ matched: boolean }>;
  /** Pausiert: keine Vorschläge, und man wird niemandem gezeigt. */
  isPaused(): Promise<boolean>;
  setPaused(paused: boolean): Promise<void>;
  /** Nur Demo: alles auf Anfang. */
  reset?(): void;
}

function supabaseBackend(db: SupabaseClient, beta: boolean): Backend {
  const ok = <T>({ data, error }: { data: T; error: unknown }) => {
    if (error) throw error;
    return data;
  };
  // Die Kennung kommt aus der gespeicherten Sitzung, ohne Anfrage an den Server: Supabase begrenzt
  // Anfragen an /user je Adresse, und im Uni-WLAN teilen sich viele eine Adresse.
  const uid = async () => {
    const { data } = await db.auth.getSession();
    if (!data.session) throw new Error('Nicht angemeldet');
    return data.session.user.id;
  };

  return {
    demo: false,
    beta,
    async signInWithPassword(email, password) {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signOut() {
      const { error } = await db.auth.signOut();
      if (error) throw error;
    },
    async deleteAccount() {
      // Fotos zuerst: Sie liegen im Speicher, nicht in der Datenbank, und würden sonst öffentlich bleiben.
      const id = await uid();
      const files = ok(await db.storage.from('photos').list(id, { limit: 100 })) ?? [];
      if (files.length) ok(await db.storage.from('photos').remove(files.map((f) => `${id}/${f.name}`)));
      ok(await db.rpc('delete_my_account'));
      await db.auth.signOut({ scope: 'local' });
    },
    async resetTestData() {
      ok(await db.rpc('beta_reset_me'));
    },
    async sendCode(email) {
      ok(await db.auth.signInWithOtp({ email }));
    },
    async verifyCode(email, token) {
      ok(await db.auth.verifyOtp({ email, token, type: 'email' }));
    },
    async recordConsent(kinds, version) {
      ok(await db.rpc('record_consent', { kinds, version }));
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
      const p = ok(await db.from('profiles').select('display_name, birthdate, bio, gender, seeking, paused, goal, prompts, interests, music, photos, age_min, age_max, max_distance_km').eq('id', data.user.id).single())!;
      const phone = data.user.phone ? `+${data.user.phone.replace(/^\+/, '')}` : null;
      return {
        displayName: p.display_name, age: ageOn(p.birthdate, new Date()), bio: p.bio, gender: p.gender, seeking: p.seeking, phone, paused: p.paused,
        goal: p.goal ?? undefined, interests: p.interests, music: p.music ?? undefined, prompts: p.prompts.map((x: any) => ({ promptId: x.prompt_id, answer: x.answer })),
        preferences: { ageMin: p.age_min, ageMax: p.age_max, maxDistanceKm: p.max_distance_km }, photos: p.photos ?? [],
      };
    },
    async saveBio(bio) {
      ok(await db.from('profiles').update({ bio }).eq('id', await uid()));
    },
    async uploadPhoto(uri, mimeType = 'image/jpeg') {
      const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
      const path = `${await uid()}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
      const body = await (await fetch(uri)).arrayBuffer();
      // Erst in den privaten Prüfordner; öffentlich wird das Foto nur, wenn die Prüfung es freigibt.
      ok(await db.storage.from('photo-uploads').upload(path, body, { contentType: mimeType }));
      const { data, error } = await db.functions.invoke('photo-check', { body: { path } });
      if (error || !data?.ok) throw new PhotoRejected(data?.reason ?? 'unavailable');
      return path;
    },
    async savePhotos(photos) {
      const id = await uid();
      const before: string[] = ok(await db.from('profiles').select('photos').eq('id', id).single())?.photos ?? [];
      ok(await db.from('profiles').update({ photos }).eq('id', id));
      // Entfernte Fotos auch aus dem Speicher löschen, damit sie nicht über ihre Adresse erreichbar bleiben.
      const removed = before.filter((p) => !photos.includes(p) && p.startsWith(`${id}/`));
      if (removed.length) await db.storage.from('photos').remove(removed);
    },
    async saveContent(c) {
      ok(await db.from('profiles').update(contentColumns(c)).eq('id', await uid()));
    },
    async savePreferences(p) {
      ok(await db.from('profiles').update(preferenceColumns(p)).eq('id', await uid()));
    },
    async saveProfile(p, { lat, lng }, content) {
      const id = await uid();
      const editable = { display_name: p.displayName, seeking: p.seeking, lat, lng, ...contentColumns(content) };
      const prefs = preferenceColumns(defaultPreferences(ageOn(p.birthdate, new Date())));
      const { error } = await db.from('profiles').insert({ id, ...editable, ...prefs, birthdate: p.birthdate, gender: p.gender });
      // Profil existiert schon: Geburtsdatum und Geschlecht sind nach dem Anlegen gesperrt.
      if (error?.code === '23505') ok(await db.from('profiles').update(editable).eq('id', id));
      else if (error) throw error;
    },
    async startVerification() {
      if (beta) {
        ok(await db.rpc('beta_verify'));
        return { url: null };
      }
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
      const picks = (ok(rows) ?? []).map((r: any) => ({
        id: r.id, displayName: r.display_name, age: r.age, bio: r.bio, distanceKm: r.distance_km, goal: r.goal ?? undefined, interests: r.interests, music: r.music ?? undefined, photos: photoUrls(r.photos),
        prompts: r.prompts.map((x: any) => ({ question: promptText(x.prompt_id) ?? '', answer: x.answer })),
      }));
      return { picks, used: ok(today)?.used ?? 0 };
    },
    async activeNearby() {
      return ok(await db.rpc('active_nearby')) ?? null;
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

const contentColumns = (c: ProfileContent) => ({
  goal: c.goal ?? null,
  interests: c.interests,
  music: c.music ?? null,
  prompts: c.prompts.map((p) => ({ prompt_id: p.promptId, answer: p.answer })),
});

const preferenceColumns = (p: Preferences) => ({ age_min: p.ageMin, age_max: p.ageMax, max_distance_km: p.maxDistanceKm });

const shown = (...pairs: [string, string][]) => pairs.map(([id, answer]) => ({ question: promptText(id)!, answer }));

const DEMO_PICKS: Pick[] = [
  {
    id: 'demo-1', displayName: 'Jonas', age: 31, photos: [placeholderPhoto('Jonas'), placeholderPhoto('Jonas-2')], bio: 'Baut Fahrräder, kocht lieber als er bestellt.', distanceKm: 4, goal: 'fest',
    interests: ['Radfahren', 'Kochen', 'Brettspiele'],
    music: { provider: 'spotify', kind: 'track', url: 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv', title: 'Bohemian Rhapsody – Queen' },
    prompts: shown(
      ['alltag-4', 'Gerade Shakshuka, seit ich in Tel Aviv war. Mit viel zu viel Koriander.'],
      ['anknuepfen-4', 'Laufräder einspeichen. Mein drittes Rad ist fast fertig.'],
      ['werte-6', 'Ich repariere Dinge. Dein Fahrrad zum Beispiel.'],
    ),
  },
  {
    id: 'demo-2', displayName: 'Elif', age: 28, photos: [placeholderPhoto('Elif'), placeholderPhoto('Elif-2')], bio: 'Sonntags auf dem Flohmarkt, unter der Woche im Labor.', distanceKm: 7, goal: 'ernst',
    interests: ['Flohmärkte', 'Wissenschaft', 'Kochen', 'Konzerte'],
    prompts: shown(
      ['anknuepfen-1', 'Der Flohmarkt auf dem Brandplatz, samstags um neun, bevor alle kommen.'],
      ['alltag-8', 'Warum Hefe beim Backen eigentlich tut, was sie tut.'],
      ['werte-1', 'Wenn wir zusammen schweigen können und es nicht komisch ist.'],
    ),
  },
  {
    id: 'demo-3', displayName: 'Sam', age: 33, photos: [placeholderPhoto('Sam')], bio: 'Sucht jemanden für lange Spaziergänge und kurze Nachrichten.', distanceKm: 2, goal: 'offen',
    interests: ['Wandern', 'Podcasts', 'Fotografie'],
    prompts: shown(
      ['alltag-1', 'Bäcker um die Ecke, dann raus an die Lahn, egal bei welchem Wetter.'],
      ['anknuepfen-2', 'Der Podcast „Hotel Matze“. Die Folge mit der Hebamme.'],
      ['werte-8', 'Über Ordnung. Früher fand ich sie spießig, heute beruhigt sie mich.'],
    ),
  },
];

const DEMO_FAN = 'demo-2';

/** Ohne Supabase-Zugangsdaten: klickbarer Ablauf mit Beispieldaten. */
export function demoBackend(delayMs = 300): Backend {
  let verified = false;
  let paused = false;
  let decided: string[] = [];
  let phone: string | null = null;
  let profile: CompleteProfile = { displayName: 'Anna', birthdate: '1998-04-12', gender: 'f', seeking: ['m'] };
  let bio = 'Läuft gern an der Lahn, liest lieber Papier als Bildschirm.';
  let photos: string[] = [];
  let content: ProfileContent = {
    prompts: [
      { promptId: 'alltag-1', answer: 'Lange frühstücken, dann mit dem Rad raus an den Dutenhofener See.' },
      { promptId: 'anknuepfen-2', answer: '„Normal People“ von Sally Rooney. Danach brauchte ich einen Spaziergang.' },
      { promptId: 'werte-2', answer: 'Wir uns Dinge sagen, bevor sie groß werden.' },
    ],
    goal: 'fest',
    interests: ['Kochen', 'Lesen', 'Radfahren'],
  };
  let preferences = defaultPreferences(ageOn(profile.birthdate, new Date()));
  const wait = () => new Promise<void>((r) => setTimeout(r, delayMs));
  // Wie todays_picks(): beidseitige Filter, dann Punkte. Elif hat Anna im Demo schon geliked.
  const ranked = () => {
    const me = { age: ageOn(profile.birthdate, new Date()), prefs: preferences };
    const open = DEMO_PICKS.filter((p) => !decided.includes(p.id) && fitsEachOther(me, { age: p.age, prefs: defaultPreferences(p.age) }, p.distanceKm));
    const candidates = open.map((p, i) => ({
      ...p, goalFit: goalFit(content.goal, p.goal), shared: sharedInterests(content.interests, p.interests ?? []).length,
      activeRecently: true, likedMe: p.id === DEMO_FAN, shownThisWeek: i, shownToday: 0,
    }));
    return rankPicks(candidates, DAILY_LIMIT - decided.length, new Date().toDateString());
  };
  return {
    demo: true,
    beta: false,
    signInWithPassword: wait,
    signOut: wait,
    deleteAccount: wait,
    resetTestData: wait,
    sendCode: wait,
    verifyCode: wait,
    recordConsent: wait,
    sendPhoneCode: wait,
    async verifyPhoneCode(p) {
      await wait();
      phone = p;
    },
    async saveProfile(p, _location, c) {
      await wait();
      profile = p;
      content = c;
      preferences = defaultPreferences(ageOn(p.birthdate, new Date()));
    },
    async saveContent(c) {
      await wait();
      content = c;
    },
    async savePreferences(p) {
      await wait();
      preferences = p;
    },
    async myProfile() {
      await wait();
      return { displayName: profile.displayName, age: ageOn(profile.birthdate, new Date()), bio, gender: profile.gender, seeking: profile.seeking, phone, paused, preferences, photos, ...content };
    },
    async saveBio(b) {
      await wait();
      bio = b;
    },
    async uploadPhoto(uri) {
      await wait();
      return uri;
    },
    async savePhotos(p) {
      await wait();
      photos = p;
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
      return { picks: ranked(), used: decided.length };
    },
    async activeNearby() {
      return activeNearbyBucket(143);
    },
    async decide(id, decision) {
      await wait();
      if (!decided.includes(id)) decided = [...decided, id];
      return { matched: decision === 'like' && id === DEMO_FAN };
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

export const backend: Backend = supabase ? supabaseBackend(supabase, beta) : demoBackend();
