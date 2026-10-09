// Stresstest der Beta: viele Testkonten benutzen die App gleichzeitig, in Stufen mit wachsender Zahl.
// Gemessen wird, wie schnell der Server antwortet und wie oft etwas schiefgeht. Dazu drei Wettläufe, in denen
// alle im selben Moment dasselbe tun (gegenseitiges Gefällt mir, Tageslimit, letzter Platz beim Event).
// Aufruf: SUPABASE_URL=… SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… [LOAD_USERS=100] [LOAD_PHASES=10,25,50,100]
//         [LOAD_SECONDS=60] node scripts/beta-test/loadtest.mjs [bericht.json]
import { writeFileSync } from 'node:fs';
import { admin, meter, ok, password, pct, pool, profileFor, runId, signIn, sleep, useApp } from './lib.mjs';

const USERS = Number(process.env.LOAD_USERS ?? 100);
const PHASES = (process.env.LOAD_PHASES ?? '10,25,50,100').split(',').map(Number).filter((n) => n > 0 && n <= USERS);
const SECONDS = Number(process.env.LOAD_SECONDS ?? 60);
const svc = admin();
const run = runId();
const report = { run, users: USERS, setup: {}, races: [], phases: [], invariants: [] };
const users = [];
let t = performance.now();

try {
  // ------------------------------------------------------------------------------------------
  console.log(`Stresstest ${run}: ${USERS} Testkonten, Stufen ${PHASES.join(' → ')} gleichzeitig, je ${SECONDS} s`);
  const area = ok(await svc.from('areas').select('id').eq('name', 'Gießen').single());
  t = performance.now();
  await pool(Array.from({ length: USERS }, (_, i) => i), 10, async (i) => {
    const email = `load-${run}-${i}@example.com`;
    const pw = password();
    const { user } = ok(await svc.auth.admin.createUser({ email, password: pw, email_confirm: true }));
    users[i] = { i, id: user.id, email, pw, gender: i % 2 ? 'm' : 'f' };
  });
  const now = new Date().toISOString();
  ok(await svc.from('profiles').upsert(users.map((u) => ({
    id: u.id, ...profileFor(u.i, { gender: u.gender }), area_id: area.id, status: 'admitted', last_active_at: now,
    age_min: 18, age_max: 99, max_distance_km: 30,
  }))));
  ok(await svc.from('verifications').upsert(users.map((u) => ({
    user_id: u.id, provider: 'beta', provider_ref: 'loadtest', id_check: 'passed', selfie_match: 'passed', decided_at: now,
  }))));
  report.setup.createSeconds = +((performance.now() - t) / 1000).toFixed(1);
  console.log(`  ${USERS} Konten angelegt in ${report.setup.createSeconds} s`);

  // Anmelden: Supabase erlaubt 150 Anmeldungen je 5 Minuten von einer Adresse. Echte Nutzer kommen von
  // vielen Adressen; hier wird deshalb gebremst, die Zeit zählt nicht zum Test.
  t = performance.now();
  let throttled = 0;
  await pool(users, 4, async (u) => {
    const s = performance.now();
    u.db = await signIn(u.email, u.pw);
    if (performance.now() - s > 10000) throttled++;
  });
  report.setup.loginSeconds = +((performance.now() - t) / 1000).toFixed(1);
  report.setup.loginsThrottled = throttled;
  console.log(`  alle angemeldet in ${report.setup.loginSeconds} s (${throttled} mussten auf die Anmeldegrenze warten)`);

  const men = users.filter((u) => u.gender === 'm');
  const women = users.filter((u) => u.gender === 'f');

  // ------------------------------------------------------------------------------------------
  // Wettlauf 1: Paare drücken im selben Moment gegenseitig „Gefällt mir“.
  {
    const pairs = Array.from({ length: Math.min(10, men.length, women.length) }, (_, k) => [men[k], women[k]]);
    await Promise.all(pairs.flatMap(([m, w]) => [
      m.db.from('likes').insert({ from_id: m.id, to_id: w.id, decision: 'like' }),
      w.db.from('likes').insert({ from_id: w.id, to_id: m.id, decision: 'like' }),
    ]));
    const got = await pool(pairs, 5, async ([m, w]) => {
      const [a, b] = [m.id, w.id].sort();
      return !!ok(await svc.from('matches').select('id').eq('user_a', a).eq('user_b', b).maybeSingle());
    });
    const n = got.filter(Boolean).length;
    report.races.push({ name: 'Gleichzeitiges gegenseitiges Gefällt mir', expected: pairs.length, actual: n, ok: n === pairs.length,
      detail: `${n} von ${pairs.length} Paaren haben ein Match` });
  }

  // Wettlauf 2: Eine Person schickt 10 Entscheidungen auf einmal (erlaubt sind 6 am Tag).
  {
    const u = men[men.length - 1];
    const targets = women.slice(-10);
    const res = await Promise.all(targets.map((w) => u.db.from('likes').insert({ from_id: u.id, to_id: w.id, decision: 'pass' })));
    const n = ok(await svc.from('likes').select('to_id', { count: 'exact', head: false }).eq('from_id', u.id)).length;
    report.races.push({ name: 'Tageslimit bei 10 gleichzeitigen Entscheidungen', expected: '≤ 6', actual: n, ok: n <= 6,
      detail: `${n} gespeichert, ${res.filter((x) => x.error).length} abgelehnt` });
  }

  // Wettlauf 3: Alle wollen gleichzeitig einen der 8 Plätze (4 Frauen, 4 Männer) beim selben Event.
  let eventId;
  {
    const host = women[0];
    eventId = ok(await host.db.rpc('create_event', {
      title: 'Stresstest-Abend', kind: 'Feiern', place: 'Testbar', address: 'Seltersweg 1, 35390 Gießen', when_text: 'Heute, 23:00 Uhr',
      starts_at: new Date(Date.now() + 3 * 3600e3).toISOString(), seats: 8, price: 0, access: 'open', campus: null, tonight: true, invitees: [],
    }));
    const res = await Promise.all(users.slice(1).map((u) => u.db.rpc('join_event', { event_id: eventId })));
    const rows = ok(await svc.from('event_attendees').select('gender').eq('event_id', eventId));
    const f = rows.filter((x) => x.gender === 'f').length;
    const m = rows.filter((x) => x.gender === 'm').length;
    report.races.push({ name: `${users.length - 1} wollen gleichzeitig einen von 8 Plätzen`, expected: '4 Frauen, 4 Männer', actual: `${f} Frauen, ${m} Männer`,
      ok: f === 4 && m === 4, detail: `${res.filter((x) => !x.error).length} angenommen, ${res.filter((x) => x.error).length} abgewiesen` });
  }
  report.races.forEach((x) => console.log(`  ${x.ok ? '✓' : '✗'} ${x.name}: ${x.detail}`));

  // ------------------------------------------------------------------------------------------
  // Stufen: so viele Personen gleichzeitig, die die App wie echte Nutzer benutzen (mit kurzen Pausen).
  for (const n of PHASES) {
    const m = meter();
    const until = Date.now() + SECONDS * 1000;
    const active = users.slice(0, n);
    console.log(`\n  Stufe: ${n} gleichzeitig …`);
    await Promise.all(active.map(async (u) => {
      await sleep(Math.random() * 2000);
      await useApp(u, m, eventId, until);
    }));
    const ops = m.summary(SECONDS);
    const total = ops.reduce((a, o) => a + o.count, 0);
    const errors = ops.reduce((a, o) => a + o.errors, 0);
    const all = Object.values(m.stats).flatMap((s) => s.times).sort((a, b) => a - b);
    const phase = { concurrent: n, requests: total, perSecond: +(total / SECONDS).toFixed(1), errors, errorRate: +((100 * errors) / (total || 1)).toFixed(2),
      p50: Math.round(pct(all, 50)), p95: Math.round(pct(all, 95)), p99: Math.round(pct(all, 99)), ops };
    report.phases.push(phase);
    console.log(`    ${phase.requests} Anfragen (${phase.perSecond}/s), Fehler ${phase.errorRate} %, Antwortzeit Median ${phase.p50} ms, 95 % unter ${phase.p95} ms`);
    for (const o of ops) console.log(`      ${o.name}: ${o.count}×, Median ${o.p50} ms, p95 ${o.p95} ms${o.errors ? `, ${o.errors} Fehler ${JSON.stringify(o.errorTypes)}` : ''}`);
  }

  // ------------------------------------------------------------------------------------------
  // Am Ende nachzählen, ob die Regeln auch unter Last gehalten haben.
  const ids = users.map((u) => u.id);
  const likes = ok(await svc.from('likes').select('from_id, to_id, decision, created_at').in('from_id', ids));
  const perUser = new Map();
  likes.forEach((l) => perUser.set(l.from_id, (perUser.get(l.from_id) ?? 0) + 1));
  const overLimit = [...perUser.values()].filter((c) => c > 6).length;
  report.invariants.push({ name: 'Niemand hat mehr als 6 Entscheidungen', ok: overLimit === 0, detail: `${overLimit} Konten darüber` });
  const matches = ok(await svc.from('matches').select('user_a, user_b').in('user_a', ids));
  const likeSet = new Set(likes.filter((l) => l.decision === 'like').map((l) => `${l.from_id}>${l.to_id}`));
  const notMutual = matches.filter((m) => ids.includes(m.user_b) && !(likeSet.has(`${m.user_a}>${m.user_b}`) && likeSet.has(`${m.user_b}>${m.user_a}`))).length;
  report.invariants.push({ name: 'Jedes Match beruht auf gegenseitigem Gefällt mir', ok: notMutual === 0, detail: `${matches.length} Matches, ${notMutual} ohne Gegenseitigkeit` });
  const mutualPairs = [...likeSet].filter((k) => {
    const [a, b] = k.split('>');
    return a < b && likeSet.has(`${b}>${a}`);
  });
  const matchSet = new Set(matches.map((m) => `${m.user_a}>${m.user_b}`));
  const missing = mutualPairs.filter((k) => !matchSet.has(k)).length;
  report.invariants.push({ name: 'Jedes gegenseitige Gefällt mir hat ein Match', ok: missing === 0, detail: `${mutualPairs.length} gegenseitig, ${missing} ohne Match` });
  const seats = ok(await svc.from('event_attendees').select('gender').eq('event_id', eventId));
  const overbooked = seats.filter((s) => s.gender === 'f').length > 4 || seats.filter((s) => s.gender === 'm').length > 4;
  report.invariants.push({ name: 'Event nicht überbucht', ok: !overbooked, detail: `${seats.length} von 8 Plätzen belegt` });
  console.log('');
  report.invariants.forEach((x) => console.log(`  ${x.ok ? '✓' : '✗'} ${x.name}: ${x.detail}`));
} catch (e) {
  report.aborted = e.message;
  console.error('Abbruch:', e);
} finally {
  t = performance.now();
  await pool(users.filter(Boolean), 10, (u) => svc.auth.admin.deleteUser(u.id).catch(() => {}));
  console.log(`\nAufgeräumt: ${users.filter(Boolean).length} Testkonten gelöscht (${((performance.now() - t) / 1000).toFixed(1)} s)`);
}

if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2));
const bad = report.aborted || report.races.some((x) => !x.ok) || report.invariants.some((x) => !x.ok) || report.phases.some((p) => p.errorRate > 1);
process.exit(bad ? 1 : 0);
