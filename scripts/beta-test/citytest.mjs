// Großer Stresstest: 10.000 Testpersonen in 4 Städten, davon in Stufen bis zu 2.000 gleichzeitig in der App.
// Läuft in drei Teilen, damit sich die Last auf mehrere Rechner (und damit Adressen) verteilt:
//   setup        legt Städte, Konten, Profile und einen Verlauf aus früheren Tagen an
//   run <n>      Teil n von SHARDS meldet seine Personen an und benutzt die App, alle Teile im selben Takt
//   finish       führt die Teilergebnisse zusammen, prüft die Regeln und löscht alles wieder
// Aufruf: SUPABASE_URL=… SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/beta-test/citytest.mjs <teil> [n] [ordner]
// Gemeinsame Werte: CITY_RUN, CITY_T0 (Startzeit der ersten Stufe, ms), CITY_START (ISO-Zeit des Setups).
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { admin, env, meter, ok, pct, pool, profileFor, runId, signIn, sleep, summarize, useApp } from './lib.mjs';

const CITIES = [
  { name: 'Gießen', lat: 50.5841, lng: 8.6784, address: 'Seltersweg 1, 35390 Gießen' },
  { name: 'Marburg', lat: 50.8021, lng: 8.7667, address: 'Reitgasse 1, 35037 Marburg' },
  { name: 'Frankfurt', lat: 50.1109, lng: 8.6821, address: 'Zeil 1, 60313 Frankfurt' },
  { name: 'Mainz', lat: 49.9929, lng: 8.2473, address: 'Markt 1, 55116 Mainz' },
];
const USERS = Number(process.env.CITY_USERS ?? 10000);
const SHARDS = Number(process.env.SHARDS ?? 8);
const PHASES = (process.env.CITY_PHASES ?? '250,500,1000,2000').split(',').map(Number).filter((n) => n > 0);
const SECONDS = Number(process.env.CITY_SECONDS ?? 60);
const GAP = 30;
const HISTORY = Number(process.env.CITY_HISTORY ?? 8);
const LOGIN_MINUTES = Number(process.env.CITY_LOGIN_MINUTES ?? 11);
// Pausen wie bei Menschen am Handy: eine Person macht so etwa alle 3 bis 4 Sekunden eine Anfrage.
const THINK = Number(process.env.CITY_THINK ?? 6);

const [mode, arg, outArg] = process.argv.slice(2);
const out = (mode === 'run' ? outArg : arg) ?? 'city-results';
mkdirSync(out, { recursive: true });
const svc = admin();
const run = mode === 'setup' ? runId() : env('CITY_RUN');
const perCity = Math.floor(USERS / CITIES.length);
const cityOf = (i) => Math.min(CITIES.length - 1, Math.floor(i / perCity));
const genderOf = (i) => (i % 2 ? 'm' : 'f');
const emailOf = (i) => `city-${run}-${i}@example.com`;
// Ein Passwort je Lauf, das alle Teile aus dem Dienstschlüssel ableiten können, ohne es weiterzugeben.
const pw = createHash('sha256').update(`${env('SUPABASE_SERVICE_ROLE_KEY')}:${run}`).digest('base64url').slice(0, 24);
const areaName = (c) => `Lasttest ${CITIES[c].name} ${run}`;
const secs = (t) => +((performance.now() - t) / 1000).toFixed(1);
const output = (k, v) => process.env.GITHUB_OUTPUT && appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);

// Alle Konten dieses Laufs über die Anmeldeverwaltung finden (auch die, deren Profil nie angelegt wurde).
// Mit `all` auch Reste abgebrochener früherer Läufe.
async function runUserIds(all = false) {
  const prefix = all ? 'city-' : `city-${run}-`;
  const ids = [];
  for (let page = 1; ; page++) {
    const { users } = ok(await svc.auth.admin.listUsers({ page, perPage: 1000 }));
    ids.push(...users.filter((u) => u.email?.startsWith(prefix)).map((u) => u.id));
    if (users.length < 1000) return ids;
  }
}

// Große Abfragen in Stücken, weil der Server höchstens 1.000 Zeilen auf einmal liefert.
async function inChunks(ids, size, query) {
  const parts = await pool(Array.from({ length: Math.ceil(ids.length / size) }, (_, k) => ids.slice(k * size, (k + 1) * size)), 8, query);
  return parts.flat();
}

// ------------------------------------------------------------------------------------------------
async function setup() {
  const start = new Date().toISOString();
  // Gleich am Anfang weitergeben, damit das Aufräumen auch nach einem Abbruch weiß, was zu löschen ist.
  output('run', run);
  output('start', start);
  const report = { run, users: USERS, cities: CITIES.map((c) => c.name) };
  console.log(`Großer Stresstest ${run}: ${USERS} Personen in ${CITIES.map((c) => c.name).join(', ')}`);
  let t = performance.now();
  const areas = ok(await svc.from('areas').insert(CITIES.map((c, k) => ({ name: areaName(k), lat: c.lat, lng: c.lng, radius_km: 30, capacity: USERS })))
    .select('id, name'));
  const areaOf = (c) => areas.find((a) => a.name === areaName(c)).id;

  const ids = [];
  let failed = 0;
  await pool(Array.from({ length: USERS }, (_, i) => i), 25, async (i) => {
    if (i % 1000 === 0) console.log(`  … ${i} Konten`);
    for (let k = 0; k < 4; k++) {
      const { data, error } = await svc.auth.admin.createUser({ email: emailOf(i), password: pw, email_confirm: true });
      if (!error) return void (ids[i] = data.user.id);
      if (k === 3) failed++;
      await sleep(1000 * (k + 1));
    }
  });
  report.createSeconds = secs(t);
  report.createFailed = failed;
  console.log(`  ${USERS - failed} Konten angelegt in ${report.createSeconds} s (${failed} fehlgeschlagen)`);

  t = performance.now();
  const now = new Date().toISOString();
  const made = ids.map((id, i) => ({ id, i })).filter((x) => x.id);
  for (let k = 0; k < made.length; k += 500) {
    const part = made.slice(k, k + 500);
    ok(await svc.from('profiles').upsert(part.map(({ id, i }) => {
      const c = CITIES[cityOf(i)];
      return { id, ...profileFor(i, { gender: genderOf(i), lat: c.lat, lng: c.lng, name: `${c.name}${i}` }), area_id: areaOf(cityOf(i)),
        status: 'admitted', last_active_at: now, age_min: 18, age_max: 99, max_distance_km: 30 };
    })));
    ok(await svc.from('verifications').upsert(part.map(({ id }) => ({
      user_id: id, provider: 'beta', provider_ref: 'citytest', id_check: 'passed', selfie_match: 'passed', decided_at: now,
    }))));
  }
  report.profileSeconds = secs(t);
  console.log(`  Profile angelegt in ${report.profileSeconds} s`);

  // Verlauf: jede Person hat an früheren Tagen schon einige Entscheidungen in ihrer Stadt getroffen.
  t = performance.now();
  const byCityGender = new Map();
  made.forEach(({ id, i }) => {
    const key = `${cityOf(i)}${genderOf(i)}`;
    byCityGender.set(key, [...(byCityGender.get(key) ?? []), id]);
  });
  const likes = [];
  for (const { id, i } of made) {
    const others = byCityGender.get(`${cityOf(i)}${genderOf(i) === 'm' ? 'f' : 'm'}`) ?? [];
    const picked = new Set();
    while (picked.size < Math.min(HISTORY, others.length)) picked.add(others[Math.floor(Math.random() * others.length)]);
    for (const to of picked) {
      likes.push({ from_id: id, to_id: to, decision: Math.random() < 0.6 ? 'like' : 'pass',
        created_at: new Date(Date.now() - (1 + Math.floor(Math.random() * 14)) * 86400e3 - Math.random() * 36e5).toISOString() });
    }
  }
  await pool(Array.from({ length: Math.ceil(likes.length / 1000) }, (_, k) => likes.slice(k * 1000, (k + 1) * 1000)), 4, async (part) => {
    ok(await svc.from('likes').insert(part));
  });
  report.historyLikes = likes.length;
  report.historySeconds = secs(t);
  console.log(`  ${likes.length} frühere Entscheidungen angelegt in ${report.historySeconds} s`);

  const t0 = Date.now() + LOGIN_MINUTES * 60e3;
  output('t0', t0);
  writeFileSync(`${out}/setup.json`, JSON.stringify(report, null, 2));
}

// ------------------------------------------------------------------------------------------------
async function shard(n) {
  const t0 = Number(env('CITY_T0'));
  const maxPerShard = Math.ceil(Math.max(...PHASES) / SHARDS);
  // Teil n bekommt einen Block Personen aus einer Stadt (zwei Teile je Stadt bei 8 Teilen), abwechselnd Frauen und Männer.
  const c = n % CITIES.length;
  const slot = Math.floor(n / CITIES.length);
  const mine = Array.from({ length: maxPerShard }, (_, k) => c * perCity + slot * maxPerShard + k).filter((i) => cityOf(i) === c);
  const report = { shard: n, city: CITIES[c].name, wanted: mine.length, phases: [] };
  console.log(`Teil ${n}: ${mine.length} Personen in ${CITIES[c].name}, erste Stufe um ${new Date(t0).toISOString()}`);

  // Anmelden bis kurz vor dem Start; wer bis dahin nicht drin ist, fehlt in den Stufen.
  let t = performance.now();
  const users = [];
  let failed = 0;
  await pool(mine, 4, async (i) => {
    if (Date.now() > t0 - 5000) return;
    try {
      const db = await signIn(emailOf(i), pw, { tries: 5 });
      const { data } = await db.auth.getSession();
      users.push({ i, id: data.session.user.id, db });
    } catch {
      failed++;
    }
  });
  report.loggedIn = users.length;
  report.loginFailed = failed;
  report.loginSeconds = secs(t);
  console.log(`  ${users.length} angemeldet in ${report.loginSeconds} s (${failed} fehlgeschlagen)`);
  if (!users.length) throw new Error('niemand angemeldet');

  // Ein Event je Teil; alle aus dem Teil versuchen, einen der 8 Plätze zu bekommen.
  const host = users.find((u) => genderOf(u.i) === 'f') ?? users[0];
  const eventId = ok(await host.db.rpc('create_event', {
    title: 'Stresstest-Abend', kind: 'Feiern', place: 'Testbar', address: CITIES[c].address, when_text: 'Heute, 23:00 Uhr',
    starts_at: new Date(Date.now() + 3 * 3600e3).toISOString(), seats: 8, price: 0, access: 'open', campus: null, tonight: true, invitees: [],
  }));
  report.eventId = eventId;
  // Wettlauf um die Plätze noch vor den Stufen, damit er die Messung nicht verschiebt.
  const joins = await Promise.all(users.filter((u) => u !== host).map((u) => u.db.rpc('join_event', { event_id: eventId })));
  report.joins = { ok: joins.filter((x) => !x.error).length, rejected: joins.filter((x) => x.error).length };
  await sleep(Math.max(0, t0 - Date.now()));

  for (const [k, total] of PHASES.entries()) {
    // Läuft eine Stufe über (z. B. weil der Server hängt), beginnt die nächste sofort danach.
    await sleep(Math.max(0, t0 + k * (SECONDS + GAP) * 1000 - Date.now()));
    const began = Date.now();
    const until = began + SECONDS * 1000;
    const m = meter();
    const active = users.slice(0, Math.ceil(total / SHARDS));
    console.log(`  Stufe ${total} gleichzeitig (hier ${active.length}) …`);
    await Promise.all(active.map(async (u) => {
      // Nicht alle öffnen die App in derselben Sekunde.
      await sleep(Math.random() * 10000);
      await useApp(u, m, eventId, until, { think: THINK });
    }));
    report.phases.push({ concurrent: total, here: active.length, seconds: (Date.now() - began) / 1000, stats: m.stats });
    const all = Object.values(m.stats).flatMap((s) => s.times).sort((a, b) => a - b);
    const errors = Object.values(m.stats).reduce((a, s) => a + Object.values(s.errors).reduce((x, y) => x + y, 0), 0);
    console.log(`    ${all.length} Anfragen, ${errors} Fehler, Median ${pct(all, 50)} ms, 95 % unter ${pct(all, 95)} ms, Dauer ${((Date.now() - began) / 1000).toFixed(0)} s`);
    for (const [name, x] of Object.entries(m.stats)) if (Object.keys(x.errors).length) console.log(`      ${name}: ${JSON.stringify(x.errors)}`);
  }
  writeFileSync(`${out}/shard-${n}.json`, JSON.stringify(report));
}

// ------------------------------------------------------------------------------------------------
async function finish() {
  const report = { run, setup: existsSync(`${out}/setup.json`) ? JSON.parse(readFileSync(`${out}/setup.json`, 'utf8')) : null, shards: [], phases: [], invariants: [] };
  const shards = readdirSync(out).filter((f) => /^shard-\d+\.json$/.test(f)).map((f) => JSON.parse(readFileSync(`${out}/${f}`, 'utf8')));
  report.shards = shards.map(({ phases, ...s }) => s);
  report.missingShards = SHARDS - shards.length;
  try {
    // Teilergebnisse je Stufe zusammenführen.
    for (const [k, total] of PHASES.entries()) {
      const stats = {};
      let here = 0;
      let seconds = SECONDS;
      for (const s of shards) {
        const p = s.phases[k];
        if (!p) continue;
        here += p.here;
        seconds = Math.max(seconds, p.seconds ?? SECONDS);
        for (const [name, x] of Object.entries(p.stats)) {
          const into = (stats[name] ??= { times: [], errors: {}, expected: 0 });
          into.times.push(...x.times);
          into.expected += x.expected;
          for (const [e, cnt] of Object.entries(x.errors)) into.errors[e] = (into.errors[e] ?? 0) + cnt;
        }
      }
      const ops = summarize(stats, seconds);
      const all = Object.values(stats).flatMap((s) => s.times).sort((a, b) => a - b);
      const errors = ops.reduce((a, o) => a + o.errors, 0);
      report.phases.push({ concurrent: total, active: here, seconds: Math.round(seconds), requests: all.length, perSecond: +(all.length / seconds).toFixed(1), errors,
        errorRate: +((100 * errors) / (all.length || 1)).toFixed(2), p50: pct(all, 50), p95: pct(all, 95), p99: pct(all, 99), ops });
    }

    // Regeln nachzählen.
    const start = env('CITY_START');
    const ids = await runUserIds();
    const ours = new Set(ids);
    report.accounts = ids.length;
    const likes = await inChunks(ids, 50, async (part) => ok(await svc.from('likes').select('from_id, to_id, decision, created_at').in('from_id', part).range(0, 999)));
    const today = new Map();
    likes.filter((l) => l.created_at >= start).forEach((l) => today.set(l.from_id, (today.get(l.from_id) ?? 0) + 1));
    const overLimit = [...today.values()].filter((x) => x > 6).length;
    report.likesToday = [...today.values()].reduce((a, b) => a + b, 0);
    report.invariants.push({ name: 'Niemand hat heute mehr als 6 Entscheidungen', ok: overLimit === 0, detail: `${today.size} haben heute entschieden, ${overLimit} darüber` });
    // Nur Matches unter Testpersonen; Beispielprofile der Beta antworten selbst und sind hier nicht erfasst.
    const matches = (await inChunks(ids, 100, async (part) => ok(await svc.from('matches').select('user_a, user_b').in('user_a', part).range(0, 999))))
      .filter((m) => ours.has(m.user_b));
    const likeSet = new Set(likes.filter((l) => l.decision === 'like').map((l) => `${l.from_id}>${l.to_id}`));
    const notMutual = matches.filter((m) => !(likeSet.has(`${m.user_a}>${m.user_b}`) && likeSet.has(`${m.user_b}>${m.user_a}`))).length;
    report.invariants.push({ name: 'Jedes Match beruht auf gegenseitigem Gefällt mir', ok: notMutual === 0, detail: `${matches.length} Matches, ${notMutual} ohne Gegenseitigkeit` });
    const matchSet = new Set(matches.map((m) => `${m.user_a}>${m.user_b}`));
    const mutual = [...likeSet].filter((x) => {
      const [a, b] = x.split('>');
      return a < b && likeSet.has(`${b}>${a}`);
    });
    const missing = mutual.filter((x) => !matchSet.has(x)).length;
    report.invariants.push({ name: 'Jedes gegenseitige Gefällt mir hat ein Match', ok: missing === 0, detail: `${mutual.length} gegenseitig, ${missing} ohne Match` });
    const events = shards.map((s) => s.eventId).filter(Boolean);
    const seats = events.length ? ok(await svc.from('event_attendees').select('event_id, gender').in('event_id', events)) : [];
    const over = events.filter((e) => ['f', 'm'].some((g) => seats.filter((s) => s.event_id === e && s.gender === g).length > 4)).length;
    report.invariants.push({ name: 'Kein Event überbucht', ok: over === 0, detail: `${events.length} Events, ${seats.length} Plätze belegt, ${over} überbucht` });
  } catch (e) {
    report.aborted = e.message;
    console.error('Abbruch:', e);
  }
  writeFileSync(`${out}/stadttest.json`, JSON.stringify(report, null, 2));
  report.invariants.forEach((x) => console.log(`${x.ok ? '✓' : '✗'} ${x.name}: ${x.detail}`));
  report.phases.forEach((p) => console.log(`${p.concurrent} gleichzeitig: ${p.perSecond}/s, Fehler ${p.errorRate} %, Median ${p.p50} ms, 95 % unter ${p.p95} ms`));
  const bad = report.aborted || report.missingShards || report.invariants.some((x) => !x.ok) || report.phases.some((p) => p.errorRate > 1);
  return bad ? 1 : 0;
}

// Alles dieses und früherer abgebrochener Läufe löschen: Konten (mit Profilen, Likes, Matches, Events) und die Test-Städte.
async function cleanup() {
  const t = performance.now();
  const ids = await runUserIds(true);
  let failed = 0;
  await pool(ids, 20, async (id) => {
    for (let k = 0; k < 3; k++) {
      const { error } = await svc.auth.admin.deleteUser(id);
      if (!error) return;
      await sleep(1000 * (k + 1));
    }
    failed++;
  });
  const areas = ok(await svc.from('areas').select('id').like('name', 'Lasttest %')).map((a) => a.id);
  if (areas.length) await svc.from('areas').delete().in('id', areas);
  console.log(`Aufgeräumt: ${ids.length - failed} Konten und ${areas.length} Test-Städte gelöscht in ${secs(t)} s${failed ? `, ${failed} Konten blieben übrig` : ''}`);
  return failed ? 1 : 0;
}

if (mode === 'setup') await setup();
else if (mode === 'run') await shard(Number(arg));
else if (mode === 'finish') process.exitCode = await finish();
else if (mode === 'cleanup') process.exitCode = await cleanup();
else {
  console.error('Teil fehlt: setup, run <n>, finish oder cleanup');
  process.exit(1);
}
