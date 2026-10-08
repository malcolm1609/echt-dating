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

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
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
