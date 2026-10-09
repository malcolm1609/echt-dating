// Gemeinsame Helfer für Tiefentest und Stresstest der Beta.
// Alles läuft wie in der App über die öffentlichen Schnittstellen (Anmeldung, Datenbank-Funktionen, Speicher);
// nur das Anlegen und Aufräumen der Testkonten geht über den Dienstschlüssel.
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const env = (name) => {
  const v = process.env[name];
  if (!v) {
    console.error(`${name} fehlt.`);
    process.exit(1);
  }
  return v;
};

// Nach 30 Sekunden ohne Antwort gibt die App auf (sonst würde ein hängender Server die Messung endlos aufhalten).
const timedFetch = (url, init = {}) => fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(30000) });
const opts = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: timedFetch } };
export const admin = () => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), opts);
export const anon = () => createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), opts);

export const ok = ({ data, error }) => {
  if (error) throw Object.assign(new Error(error.message ?? String(error)), { code: error.code, status: error.status });
  return data;
};
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const password = () => randomBytes(18).toString('base64url');
export const runId = () => `${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;

// Anmeldung mit Rücksicht auf die Grenze von Supabase (150 Anmeldungen je 5 Minuten und Adresse):
// bei „zu viele Anfragen“ warten und erneut versuchen.
export async function signIn(email, pw, { tries = 8 } = {}) {
  const db = anon();
  for (let i = 0; ; i++) {
    const { error } = await db.auth.signInWithPassword({ email, password: pw });
    if (!error) return db;
    if (error.status !== 429 || i >= tries) throw new Error(`Anmeldung ${email}: ${error.message}`);
    await sleep(15000 * (i + 1));
  }
}

// Ein Testkonto, das wie nach der Registrierung im Testbetrieb aussieht.
export function profileFor(i, { gender, lat = 50.5841, lng = 8.6784, name } = {}) {
  const g = gender ?? (i % 2 ? 'm' : 'f');
  return {
    display_name: name ?? `Last${i}`,
    birthdate: `${2000 + (i % 6)}-0${1 + (i % 9)}-1${i % 9}`,
    gender: g,
    seeking: [g === 'm' ? 'f' : 'm'],
    bio: 'Automatisches Testkonto.',
    goal: 'offen',
    interests: ['Kaffee', 'Kino'],
    prompts: [
      { prompt_id: 'alltag-1', answer: 'Lange frühstücken und dann raus.' },
      { prompt_id: 'anknuepfen-1', answer: 'Die Lahnwiesen an einem warmen Abend.' },
      { prompt_id: 'werte-1', answer: 'Zusammen still sein können.' },
    ],
    lat: lat + ((i % 7) - 3) * 0.002,
    lng: lng + ((i % 5) - 2) * 0.002,
  };
}

// Prüfungen sammeln: Name, bestanden, Dauer, Fehlertext.
export function recorder() {
  const results = [];
  let section = '';
  return {
    results,
    section(name) {
      section = name;
      console.log(`\n## ${name}`);
    },
    async check(name, fn) {
      const t = performance.now();
      try {
        const detail = await fn();
        const ms = Math.round(performance.now() - t);
        results.push({ section, name, ok: true, ms, detail: detail ?? '' });
        console.log(`  ✓ ${name} (${ms} ms)${detail ? ` – ${detail}` : ''}`);
        return true;
      } catch (e) {
        const ms = Math.round(performance.now() - t);
        results.push({ section, name, ok: false, ms, detail: e.message });
        console.log(`  ✗ ${name} (${ms} ms) – ${e.message}`);
        return false;
      }
    },
  };
}

export function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Erwartet, dass ein Aufruf abgelehnt wird (Regeln der Datenbank greifen).
export async function rejects(promise, msg) {
  const { error } = await promise;
  if (!error) throw new Error(`${msg}: wurde nicht abgelehnt`);
  return `abgelehnt (${error.code ?? error.status ?? 'Fehler'})`;
}

export const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : 0);

// Viele Aufgaben mit begrenzter Gleichzeitigkeit.
export async function pool(items, limit, fn) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await fn(items[k], k);
    }
  }));
  return out;
}

// Kennzahlen je Aufruf aus gemessenen Zeiten und Fehlern ({ name: { times, errors: { text: anzahl }, expected } }).
export function summarize(stats, seconds) {
  return Object.entries(stats).map(([name, s]) => {
    const sorted = [...s.times].sort((a, b) => a - b);
    const errors = Object.values(s.errors).reduce((a, b) => a + b, 0);
    return {
      name, count: sorted.length, perSecond: +(sorted.length / seconds).toFixed(1), errors, expectedRejections: s.expected,
      p50: Math.round(pct(sorted, 50)), p95: Math.round(pct(sorted, 95)), p99: Math.round(pct(sorted, 99)), max: Math.round(sorted.at(-1) ?? 0),
      errorTypes: s.errors,
    };
  });
}

// Ein Aufruf mit Zeitmessung; Fehler werden gezählt, nicht geworfen.
export function meter() {
  const stats = {};
  const stat = (name) => (stats[name] ??= { times: [], errors: {}, expected: 0 });
  return {
    stats,
    async time(name, fn, allow = () => false) {
      const t = performance.now();
      let res;
      try {
        res = await fn();
      } catch (e) {
        res = { error: e };
      }
      const s = stat(name);
      s.times.push(Math.round(performance.now() - t));
      if (res?.error && allow(res.error)) s.expected++;
      else if (res?.error) {
        const key = `${res.error.code ?? res.error.status ?? ''} ${res.error.message ?? res.error}`.trim().slice(0, 90);
        s.errors[key] = (s.errors[key] ?? 0) + 1;
      }
      return res;
    },
    summary: (seconds) => summarize(stats, seconds),
  };
}

// Erwartete Fehler, die zur App gehören (z. B. Tageslimit erreicht, Event voll), zählen nicht als Störung.
export const expected = (e) => /daily limit|full|half|no seats|already|duplicate|not visible|row-level security|violates check|chat closed|round locked|too many messages/i.test(e?.message ?? '');

// Eine Person benutzt die App bis zum Zeitpunkt `until` wie im echten Leben: Beim Öffnen lädt die App
// Aktivität, Vorschläge und Zähler, danach wird entschieden, in Matches und Treffen geschaut und geschrieben,
// mit Pausen zum Lesen. `think` streckt die Pausen (1 = sehr eilig, 6 ≈ wie ein Mensch am Handy).
export async function useApp(u, m, eventId, until, { think = 1 } = {}) {
  const pause = (min, spread) => sleep((min + Math.random() * spread) * think);
  let picks = [];
  let opened = 0;
  while (Date.now() < until) {
    // App öffnen (zu Beginn und wieder nach einer Weile)
    if (!opened || Date.now() - opened > 60000 * think) {
      opened = Date.now();
      await m.time('App öffnen (touch_activity)', () => u.db.rpc('touch_activity'));
      const [res] = await Promise.all([
        m.time('Vorschläge (todays_picks)', () => u.db.rpc('todays_picks')),
        m.time('Zähler (my_picks_today)', () => u.db.from('my_picks_today').select('used').single()),
      ]);
      picks = [...(res?.data ?? [])];
      await pause(300, 900);
    }
    const pick = picks.shift();
    if (pick) {
      await m.time('Entscheiden (likes)', () => u.db.from('likes').insert({ from_id: u.id, to_id: pick.id, decision: Math.random() < 0.6 ? 'like' : 'pass' }), expected);
      await pause(300, 900);
    }
    const matches = await m.time('Matches (my_matches)', () => u.db.rpc('my_matches'));
    const open = matches?.data?.find((x) => !x.answers?.['0-0']);
    if (open) await m.time('Fragenrunde (answer_question)', () => u.db.rpc('answer_question', { other: open.id, question_key: '0-0', answer: 'Antwort aus dem Stresstest' }), expected);
    await pause(300, 900);
    const evs = await m.time('Treffen (my_events)', () => u.db.rpc('my_events'));
    const ev = evs?.data?.events?.find((e) => e.id === eventId);
    if (ev?.mine) await m.time('Gruppenchat (send_event_message)', () => u.db.rpc('send_event_message', { event_id: eventId, body: 'Bin dabei!' }), expected);
    await pause(500, 1500);
  }
}
