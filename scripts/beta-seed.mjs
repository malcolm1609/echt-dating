// Richtet die Beta auf dem Server ein: Testbetrieb an, Gebiet Gießen, Beispielprofile und Testkonten.
// Läuft mehrfach ohne Schaden; die Testkonten kommen dabei zurück auf den Startzustand.
// Aufruf: SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… BETA_PASSWORD=… node scripts/beta-seed.mjs
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BETA_PASSWORD } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !BETA_PASSWORD) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY und BETA_PASSWORD müssen gesetzt sein.');
  process.exit(1);
}

const data = JSON.parse(readFileSync(new URL('../supabase/seed/beta-profiles.json', import.meta.url), 'utf8'));
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const ok = ({ data, error }) => {
  if (error) throw error;
  return data;
};

ok(await db.from('beta_settings').update({ enabled: true }).eq('id', true));

let area = ok(await db.from('areas').select('id').eq('name', data.area.name).maybeSingle());
if (!area) area = ok(await db.from('areas').insert(data.area).select('id').single());

const existing = new Map();
for (let page = 1; ; page++) {
  const { users } = ok(await db.auth.admin.listUsers({ page, perPage: 1000 }));
  users.forEach((u) => existing.set(u.email, u.id));
  if (users.length < 1000) break;
}

// Beispielprofile bekommen ein zufälliges Passwort, das niemand kennt; Testkonten das aus BETA_PASSWORD.
async function account(email, tester) {
  const password = tester ? BETA_PASSWORD : randomBytes(24).toString('base64url');
  const id = existing.get(email);
  if (id) {
    if (tester) ok(await db.auth.admin.updateUserById(id, { password }));
    return id;
  }
  return ok(await db.auth.admin.createUser({ email, password, email_confirm: true })).user.id;
}

const people = [...data.testers.map((p) => ({ ...p, tester: true })), ...data.samples.map((p) => ({ ...p, tester: false }))];
const ids = new Map();
for (const p of people) ids.set(p.email, await account(p.email, p.tester));

const now = new Date().toISOString();
ok(await db.from('profiles').upsert(people.map(({ email, tester, ...p }) => ({
  ...p, id: ids.get(email), area_id: area.id, status: 'admitted', is_sample: !tester, paused: false, last_active_at: now,
}))));
ok(await db.from('verifications').upsert(people.map((p) => ({
  user_id: ids.get(p.email), provider: 'beta', provider_ref: 'seed', id_check: 'passed', selfie_match: 'passed', decided_at: now,
}))));

for (const t of data.testers) ok(await db.rpc('beta_prepare_tester', { tester: ids.get(t.email) }));

console.log(`Beta bereit: ${data.samples.length} Beispielprofile, Testkonten ${data.testers.map((t) => t.email).join(', ')}`);
