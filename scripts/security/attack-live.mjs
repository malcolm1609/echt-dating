// Hacker-Roboter: greift den Beta-Server von außen an, so wie es ein echter Angreifer mit der öffentlichen
// Web-App tun würde (öffentlicher Schlüssel, eigenes Konto). Jeder Angriff muss scheitern. Gelingt einer,
// endet das Skript mit Fehler, und der Workflow „Sicherheitswache“ schlägt Alarm.
// Legt eigene Wegwerf-Konten an und löscht sie am Ende wieder.
// Aufruf: SUPABASE_URL=… SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/security/attack-live.mjs [bericht.json]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { admin, anon, assert, ok, password, profileFor, recorder, runId, signIn } from '../beta-test/lib.mjs';

const URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const svc = admin();
const run = runId();
const r = recorder();
const created = [];

// Alle Tabellen aus den Migrationen und alle Funktionen, die nur Angemeldete aufrufen dürfen (aus der Wache).
const migrations = readdirSync('supabase/migrations').map((f) => readFileSync(`supabase/migrations/${f}`, 'utf8')).join('\n');
const TABLES = [...new Set([...migrations.matchAll(/create table (?:if not exists )?(?:public\.)?(\w+)/gi)].map((m) => m[1]))];
const guard = readFileSync('supabase/tests/guard.test.sql', 'utf8');
const MEMBER_RPCS = guard.match(/angemeldete Personen'[\s\S]*?'\{([^}]+)\}'/)[1].split(',')
  .filter((f) => !['beta_enabled', 'date_check_public'].includes(f));
const INTERNAL_RPCS = ['claim_date_alarms', 'release_date_alarm', 'date_check_tick', 'beta_prepare_tester', 'beta_prepare_events',
  'load_districts', 'area_for', 'blocked_between', 'match_with', 'pick_candidates'];
assert(TABLES.length > 20 && MEMBER_RPCS.length > 20, 'Tabellen- oder Funktionsliste nicht gefunden');

// Aufruf mit den richtigen Parameternamen (Werte leer), damit der Server wirklich die Rechte prüft und nicht
// nur „Funktion mit diesen Parametern gibt es nicht“ antwortet. Die letzte Fassung in den Migrationen gilt.
const ARGS = {};
for (const m of migrations.matchAll(/create (?:or replace )?function (?:public\.)?(\w+)\(([^)]*)\)/gi)) {
  ARGS[m[1]] = m[2].split(',').map((a) => a.trim().split(/\s+/)[0]).filter((a) => a && !/^(in|out)$/i.test(a));
}
const rpcBody = (f) => JSON.stringify(Object.fromEntries((ARGS[f] ?? []).map((a) => [a, null])));
// Abgelehnt heißt: keine Berechtigung (401/403), nicht bloß ein anderer Fehler.
async function noRight(res, what) {
  if (res.status === 401 || res.status === 403) return `abgelehnt (${res.status})`;
  throw new Error(`${what}: Server antwortet ${res.status} ${(await res.text()).slice(0, 120)}`);
}

const rest = (path, init = {}, token = ANON_KEY) =>
  fetch(`${URL}${path}`, { ...init, headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers } });

// Ein Angriff „scheitert“, wenn der Server ablehnt oder nichts herausgibt.
async function noData(res) {
  if (!res.ok) return `abgelehnt (${res.status})`;
  const body = await res.json().catch(() => null);
  assert(body == null || (Array.isArray(body) && body.length === 0), `liefert Daten: ${JSON.stringify(body).slice(0, 120)}`);
  return 'leer';
}
const refused = (res, what) => assert(!res.ok, `${what}: Server hat ${res.status} geantwortet statt abzulehnen`);

async function account(tag, { profile = true, gender = 'f' } = {}) {
  const email = `angriff-${run}-${tag}@example.com`;
  const pw = password();
  const user = ok(await svc.auth.admin.createUser({ email, password: pw, email_confirm: true })).user;
  created.push(user.id);
  const db = await signIn(email, pw);
  if (profile) {
    ok(await db.from('profiles').insert({ id: user.id, ...profileFor(created.length, { gender, name: `Angriff ${tag}` }) }));
    ok(await db.rpc('beta_verify'));
  }
  const token = (await db.auth.getSession()).data.session.access_token;
  return { id: user.id, db, token };
}

try {
  r.section('Vorbereitung');
  let victim, hacker, ghost, voicePath;
  await r.check('Opfer, Angreifer und Konto ohne Profil anlegen', async () => {
    victim = await account('opfer', { gender: 'f' });
    hacker = await account('hacker', { gender: 'm' });
    ghost = await account('geist', { profile: false });
    voicePath = `${victim.id}/angriff-${run}.webm`;
    ok(await victim.db.storage.from('voice').upload(voicePath, new Blob([new Uint8Array(64)]), { contentType: 'audio/webm' }));
  });

  // ---------------------------------------------------------------------------------------------
  r.section('Ohne Anmeldung (nur der öffentliche Schlüssel aus der Web-App)');
  for (const t of TABLES) await r.check(`Tabelle ${t} lesen`, async () => noData(await rest(`/rest/v1/${t}?select=*&limit=5`)));
  for (const t of ['profiles', 'reports', 'messages', 'likes']) {
    await r.check(`In ${t} schreiben`, async () => refused(await rest(`/rest/v1/${t}`, { method: 'POST', body: '{}' }), t));
  }
  for (const f of [...MEMBER_RPCS, ...INTERNAL_RPCS]) {
    await r.check(`Funktion ${f} aufrufen`, async () => noRight(await rest(`/rest/v1/rpc/${f}`, { method: 'POST', body: rpcBody(f) }), f));
  }
  await r.check('Fremdes Sprachmemo über öffentliche Adresse', async () =>
    refused(await fetch(`${URL}/storage/v1/object/public/voice/${voicePath}`), 'voice öffentlich'));
  await r.check('Ungeprüfte Fotos über öffentliche Adresse', async () =>
    refused(await fetch(`${URL}/storage/v1/object/public/photo-uploads/${victim.id}/x.jpg`), 'photo-uploads öffentlich'));
  await r.check('SMS-Alarm ohne Geheimnis auslösen', async () =>
    refused(await rest('/functions/v1/date-alarm', { method: 'POST', body: '{}' }), 'date-alarm'));
  await r.check('Fotoprüfung ohne Anmeldung', async () =>
    refused(await fetch(`${URL}/functions/v1/photo-check`, { method: 'POST', body: '{}' }), 'photo-check'));
  await r.check('Gefälschte Ausweis-Bestätigung schicken', async () =>
    refused(await fetch(`${URL}/functions/v1/verification-webhook`, { method: 'POST', body: JSON.stringify({ vendor_data: hacker.id, status: 'Approved' }) }), 'verification-webhook'));

  // ---------------------------------------------------------------------------------------------
  r.section('Mit eigenem Konto (angemeldeter Angreifer)');
  const t = hacker.token;
  await r.check('Fremde Profile direkt lesen', async () => {
    const rows = await (await rest('/rest/v1/profiles?select=id,lat,lng,birthdate,status', {}, t)).json();
    assert(Array.isArray(rows) && rows.every((p) => p.id === hacker.id), `sieht ${rows.length} Profile`);
  });
  for (const tab of ['reports', 'date_checks', 'app_settings', 'beta_settings', 'messages', 'verifications', 'blocks', 'daily_picks', 'consents', 'approved_photos']) {
    await r.check(`Fremde Zeilen in ${tab}`, async () => {
      const res = await rest(`/rest/v1/${tab}?select=*&limit=50`, {}, t);
      if (!res.ok) return `abgelehnt (${res.status})`;
      const rows = await res.json();
      const foreign = rows.filter((x) => ![x.user_id, x.id, x.reporter_id, x.blocker_id].includes(hacker.id));
      assert(foreign.length === 0, `${foreign.length} fremde Zeilen`);
      return `${rows.length} eigene`;
    });
  }
  for (const [col, val] of [['status', 'admitted'], ['area_id', 1], ['is_sample', true], ['last_active_at', '2099-01-01'], ['birthdate', '1990-01-01'], ['gender', 'f']]) {
    await r.check(`Eigenes Feld ${col} umschreiben`, async () =>
      refused(await rest(`/rest/v1/profiles?id=eq.${hacker.id}`, { method: 'PATCH', body: JSON.stringify({ [col]: val }), headers: { Prefer: 'return=representation' } }, t), col));
  }
  await r.check('Fremdes Profil ändern', async () => {
    await rest(`/rest/v1/profiles?id=eq.${victim.id}`, { method: 'PATCH', body: JSON.stringify({ bio: 'gehackt' }) }, t);
    const v = ok(await svc.from('profiles').select('bio').eq('id', victim.id).single());
    assert(v.bio !== 'gehackt', 'Profil des Opfers wurde geändert');
  });
  await r.check('Meldung direkt in die Tabelle schreiben', async () =>
    refused(await rest('/rest/v1/reports', { method: 'POST', body: JSON.stringify({ reporter_id: hacker.id, reported_id: victim.id, reason: 'fake' }) }, t), 'reports'));
  await r.check('Melden mit Wegwerf-Konto ohne Profil', async () =>
    refused(await rest('/rest/v1/rpc/report_user', { method: 'POST', body: JSON.stringify({ other: victim.id, reason: 'fake' }) }, ghost.token), 'report_user'));
  for (const f of INTERNAL_RPCS) {
    await r.check(`Interne Funktion ${f}`, async () => noRight(await rest(`/rest/v1/rpc/${f}`, { method: 'POST', body: rpcBody(f) }, t), f));
  }
  await r.check('Nachricht ohne Match schicken', async () =>
    refused(await rest('/rest/v1/rpc/send_message', { method: 'POST', body: JSON.stringify({ other: victim.id, body: 'Hallo' }) }, t), 'send_message'));
  await r.check('Fremdes Sprachmemo herunterladen', async () => {
    const { data } = await hacker.db.storage.from('voice').download(voicePath);
    assert(!data, 'Datei bekommen');
  });
  await r.check('Fremden Sprachmemo-Ordner auflisten', async () => {
    const { data } = await hacker.db.storage.from('voice').list(victim.id);
    assert(!data?.length, `${data.length} Dateien sichtbar`);
  });
  await r.check('In fremden Ordner hochladen', async () => {
    const { error } = await hacker.db.storage.from('voice').upload(`${victim.id}/boese.webm`, new Blob([new Uint8Array(8)]), { contentType: 'audio/webm' });
    assert(error, 'Upload in fremden Ordner ging durch');
  });
  await r.check('Fremdes Foto durch die Prüfung schleusen', async () => {
    const res = await fetch(`${URL}/functions/v1/photo-check`, {
      method: 'POST', headers: { Authorization: `Bearer ${t}`, apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: `${victim.id}/abc.jpg` }),
    });
    refused(res, 'photo-check mit fremdem Pfad');
  });
  await r.check('Date-Check-Seite mit geratenem Link', async () => {
    const res = await rest('/rest/v1/rpc/date_check_public', { method: 'POST', body: JSON.stringify({ p_token: '0'.repeat(64) }) });
    const body = await res.json();
    assert(body == null, 'liefert Daten für einen erfundenen Link');
  });
} catch (e) {
  r.results.push({ section: 'Abbruch', name: 'Angriffstest lief nicht zu Ende', ok: false, ms: 0, detail: e.message });
  console.error('Abbruch:', e);
} finally {
  await svc.storage.from('voice').remove(created.map((id) => `${id}/angriff-${run}.webm`)).catch(() => {});
  for (const id of created) await svc.auth.admin.deleteUser(id).catch(() => {});
}

const failed = r.results.filter((x) => !x.ok);
console.log(`\n${r.results.length - failed.length} von ${r.results.length} Angriffen abgewehrt.`);
if (failed.length) console.log(`\nGELUNGEN:\n${failed.map((f) => `- ${f.section}: ${f.name} – ${f.detail}`).join('\n')}`);
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({ run, results: r.results }, null, 2));
process.exit(failed.length ? 1 : 0);
