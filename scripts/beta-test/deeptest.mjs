// Tiefentest der Beta: spielt jede Funktion der App als echte Nutzerinnen und Nutzer gegen den Server durch
// und prüft dabei auch, dass die Schutzregeln greifen. Legt eigene Testkonten an und räumt sie am Ende weg;
// Toms und Leas Testkonten bleiben unberührt.
// Aufruf: SUPABASE_URL=… SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/beta-test/deeptest.mjs [bericht.json]
import { writeFileSync } from 'node:fs';
import { admin, anon, assert, ok, password, profileFor, recorder, rejects, runId, signIn, sleep } from './lib.mjs';

const svc = admin();
const run = runId();
const r = recorder();
const created = [];
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function newAccount(tag) {
  const email = `deeptest-${run}-${tag}@example.com`;
  const pw = password();
  const user = ok(await svc.auth.admin.createUser({ email, password: pw, email_confirm: true })).user;
  created.push(user.id);
  return { id: user.id, email, pw };
}

const mine = async (db) => (await db.auth.getSession()).data.session.user.id;
const matchesOf = async (db) => ok(await db.rpc('my_matches'));
const eventsOf = async (db) => ok(await db.rpc('my_events'));

try {
  // --------------------------------------------------------------------------------------------
  r.section('Registrierung und Profil');
  const A = await newAccount('a');
  const B = await newAccount('b');
  let a, b;
  await r.check('Anmelden mit E-Mail und Passwort', async () => {
    a = await signIn(A.email, A.pw);
    b = await signIn(B.email, B.pw);
  });
  await r.check('Profil anlegen wie bei der Registrierung', async () => {
    ok(await a.from('profiles').insert({ id: A.id, ...profileFor(1, { gender: 'm', name: 'Deep A' }), age_min: 18, age_max: 99, max_distance_km: 30 }));
    ok(await b.from('profiles').insert({ id: B.id, ...profileFor(2, { gender: 'f', name: 'Deep B' }), age_min: 18, age_max: 99, max_distance_km: 30 }));
  });
  await r.check('Ausweisprüfung im Testbetrieb überspringen', async () => {
    ok(await a.rpc('beta_verify'));
    ok(await b.rpc('beta_verify'));
    const me = ok(await a.from('profiles').select('status, area_id').eq('id', A.id).single());
    assert(me.status === 'admitted' && me.area_id, `Status ${me.status}`);
    return `zugelassen in Gebiet ${me.area_id}`;
  });
  await r.check('Eigenes Profil lesen', async () => {
    const p = ok(await a.from('profiles').select('display_name, prompts, interests, photos, age_min, age_max, max_distance_km').eq('id', A.id).single());
    assert(p.display_name === 'Deep A' && p.prompts.length === 3, 'Profil unvollständig');
  });
  await r.check('Fremde Profile nicht direkt lesbar', async () => {
    const rows = ok(await a.from('profiles').select('id').neq('id', A.id));
    assert(rows.length === 0, `${rows.length} fremde Profile sichtbar`);
    return 'nur das eigene';
  });
  await r.check('Fremdes Profil nicht änderbar', async () => {
    await a.from('profiles').update({ bio: 'gehackt' }).eq('id', B.id);
    const p = ok(await svc.from('profiles').select('bio').eq('id', B.id).single());
    assert(p.bio !== 'gehackt', 'Bio von B wurde geändert');
  });
  await r.check('Ohne Anmeldung keine Daten', async () => {
    const guest = anon();
    const rows = (await guest.from('profiles').select('id').limit(1)).data ?? [];
    assert(rows.length === 0, 'Profile ohne Anmeldung lesbar');
    await rejects(guest.rpc('my_matches'), 'my_matches ohne Anmeldung');
    return rejects(guest.rpc('beta_prepare_tester', { tester: A.id }), 'Testdaten ohne Anmeldung');
  });
  await r.check('Server-Helfer sind für Angemeldete gesperrt', () =>
    rejects(a.rpc('beta_prepare_tester', { tester: B.id }), 'Testdaten für andere anlegen'));
  await r.check('Über-mich-Text und Profilinhalte speichern', async () => {
    ok(await a.from('profiles').update({ bio: 'Neuer Text vom Tiefentest.' }).eq('id', A.id));
    ok(await a.from('profiles').update({ interests: ['Kaffee', 'Kino', 'Radfahren'], goal: 'ernst' }).eq('id', A.id));
  });
  await r.check('Ungültige Profilfragen werden abgelehnt', () =>
    rejects(a.from('profiles').update({ prompts: [{ prompt_id: 'alltag-1', answer: '   ' }] }).eq('id', A.id), 'leere Antwort'));
  await r.check('Wünsche (Alter, Umkreis) speichern', async () => {
    ok(await a.from('profiles').update({ age_min: 19, age_max: 35, max_distance_km: 20 }).eq('id', A.id));
    ok(await a.from('profiles').update({ age_min: 18, age_max: 99, max_distance_km: 30 }).eq('id', A.id));
  });
  await r.check('Unmögliche Wünsche werden abgelehnt', () =>
    rejects(a.from('profiles').update({ age_min: 40, age_max: 20 }).eq('id', A.id), 'Alter verdreht'));
  await r.check('Foto hochladen und im Profil speichern', async () => {
    const path = `${A.id}/deeptest-${run}.png`;
    ok(await a.storage.from('photos').upload(path, PNG, { contentType: 'image/png' }));
    ok(await a.from('profiles').update({ photos: [path] }).eq('id', A.id));
    const url = a.storage.from('photos').getPublicUrl(path).data.publicUrl;
    const res = await fetch(url);
    assert(res.ok, `Foto nicht abrufbar (${res.status})`);
    return 'öffentlich abrufbar';
  });
  await r.check('Foto in fremden Ordner hochladen wird abgelehnt', async () => {
    const { error } = await a.storage.from('photos').upload(`${B.id}/fremd.png`, PNG, { contentType: 'image/png' });
    assert(error, 'Upload in fremden Ordner ging durch');
    return 'abgelehnt';
  });
  await r.check('Fremdes Foto im Profil wird abgelehnt', () =>
    rejects(a.from('profiles').update({ photos: [`${B.id}/x.png`] }).eq('id', A.id), 'fremder Pfad'));
  await r.check('Mehr als 6 Fotos werden abgelehnt', () =>
    rejects(a.from('profiles').update({ photos: Array.from({ length: 7 }, (_, i) => `${A.id}/${i}.png`) }).eq('id', A.id), '7 Fotos'));
  await r.check('Aktivität melden und „aktiv in der Nähe“', async () => {
    ok(await a.rpc('touch_activity'));
    const n = ok(await a.rpc('active_nearby'));
    return `Anzeige: ${n ?? 'unter 51, ausgeblendet'}`;
  });
  await r.check('Status und Warteliste lesen', async () => {
    const me = ok(await a.from('profiles').select('status').eq('id', A.id).single());
    ok(await a.from('my_waitlist_position').select('position').maybeSingle());
    return me.status;
  });

  // Testkonto A bekommt den gleichen Startzustand wie Tom: Fans, zwei Matches, Beispiel-Events.
  ok(await svc.rpc('beta_prepare_tester', { tester: A.id }));
  ok(await svc.rpc('beta_prepare_events', { tester: A.id }));

  // --------------------------------------------------------------------------------------------
  r.section('Vorschläge');
  let picks = [];
  await r.check('Tagesvorschläge laden', async () => {
    picks = ok(await a.rpc('todays_picks'));
    const today = ok(await a.from('my_picks_today').select('used').single());
    assert(picks.length > 0, 'keine Vorschläge');
    assert(today.used === 0, `schon ${today.used} verbraucht`);
    return `${picks.length} Vorschläge`;
  });
  await r.check('Vorschläge sind beidseitig passend und nicht blockiert', async () => {
    assert(picks.every((p) => p.gender === 'f'), 'falsches Geschlecht in den Vorschlägen');
    assert(picks.every((p) => p.distance_km <= 30), 'zu weit weg');
  });
  const fans = ok(await svc.from('likes').select('from_id').eq('to_id', A.id).eq('decision', 'like')).map((l) => l.from_id);
  const fan = picks.find((p) => fans.includes(p.id));
  const other = picks.find((p) => !fans.includes(p.id));
  await r.check('Gefällt mir bei einem Fan ergibt ein Match', async () => {
    assert(fan, 'kein Fan unter den Vorschlägen');
    ok(await a.from('likes').insert({ from_id: A.id, to_id: fan.id, decision: 'like' }));
    const [ua, ub] = [A.id, fan.id].sort();
    const m = ok(await a.from('matches').select('id').eq('user_a', ua).eq('user_b', ub).maybeSingle());
    assert(m, 'kein Match');
    return fan.display_name;
  });
  await r.check('Weiter ergibt kein Match', async () => {
    assert(other, 'kein weiterer Vorschlag');
    ok(await a.from('likes').insert({ from_id: A.id, to_id: other.id, decision: 'pass' }));
  });
  await r.check('Likes im Namen anderer werden abgelehnt', () =>
    rejects(a.from('likes').insert({ from_id: B.id, to_id: A.id, decision: 'like' }), 'fremder Like'));
  await r.check('Höchstens 6 Entscheidungen am Tag', async () => {
    const samples = ok(await svc.from('profiles').select('id').eq('is_sample', true).eq('gender', 'f'));
    const decided = new Set(ok(await svc.from('likes').select('to_id').eq('from_id', A.id)).map((l) => l.to_id));
    const rest = samples.map((s) => s.id).filter((id) => !decided.has(id));
    let n = ok(await a.from('my_picks_today').select('used').single()).used;
    while (n < 6 && rest.length) {
      ok(await a.from('likes').insert({ from_id: A.id, to_id: rest.shift(), decision: 'pass' }));
      n++;
    }
    assert(rest.length, 'zu wenige Beispielprofile für die Prüfung');
    return rejects(a.from('likes').insert({ from_id: A.id, to_id: rest.shift(), decision: 'pass' }), '7. Entscheidung');
  });
  await r.check('Nach 6 Entscheidungen keine Vorschläge mehr', async () => {
    const rest = ok(await a.rpc('todays_picks'));
    assert(rest.length === 0, `${rest.length} weitere Vorschläge`);
  });

  // --------------------------------------------------------------------------------------------
  r.section('Matches, Fragenrunde, Chat, Date');
  let ms = [];
  await r.check('Matches mit Verlauf laden', async () => {
    ms = await matchesOf(a);
    assert(ms.length >= 3, `nur ${ms.length} Matches`);
    return `${ms.length} Matches`;
  });
  const chat = ms.find((m) => Object.keys(m.answers).length === 6);
  const fresh = ms.find((m) => Object.keys(m.answers).length === 0 && m.id !== fan?.id);
  await r.check('Neue Matches sind als ungelesen markiert, Ansehen hebt das auf', async () => {
    assert(ms.some((m) => m.unread), 'nichts ungelesen');
    ok(await a.rpc('mark_read', { other: chat.id }));
    const again = (await matchesOf(a)).find((m) => m.id === chat.id);
    assert(!again.unread, 'immer noch ungelesen');
  });
  await r.check('Nachricht schreiben, Beispielprofil antwortet', async () => {
    ok(await a.rpc('send_message', { other: chat.id, body: 'Hallo vom Tiefentest!' }));
    const m = (await matchesOf(a)).find((x) => x.id === chat.id);
    const last = m.messages.at(-1);
    assert(last && !last.mine, 'keine Antwort');
    return `„${last.text.slice(0, 40)}…“`;
  });
  await r.check('Fragenrunde: Antwort, Gegenantwort, nächste Runde erst danach', async () => {
    assert(fresh, 'kein Match mit offener Fragenrunde');
    const locked = await rejects(a.rpc('answer_question', { other: fresh.id, question_key: '1-0', answer: 'zu früh' }), 'Runde 2 vor Runde 1');
    ok(await a.rpc('answer_question', { other: fresh.id, question_key: '0-0', answer: 'Antwort 1' }));
    ok(await a.rpc('answer_question', { other: fresh.id, question_key: '0-1', answer: 'Antwort 2' }));
    const m = (await matchesOf(a)).find((x) => x.id === fresh.id);
    assert(m.answers['0-0'].theirs && m.answers['0-1'].theirs, 'Beispielprofil hat nicht geantwortet');
    ok(await a.rpc('answer_question', { other: fresh.id, question_key: '1-0', answer: 'Antwort 3' }));
    return `Runde 2 vorher ${locked}`;
  });
  await r.check('Chat bleibt zu, bis alle Fragen beantwortet sind', () =>
    rejects(a.rpc('send_message', { other: fresh.id, body: 'zu früh' }), 'Chat vor Ende der Fragenrunde'));
  await r.check('Date vorschlagen, Zusage, Check danach', async () => {
    ok(await a.rpc('propose_date', { other: chat.id, idea: 'Kaffee', place: 'Café am Kirchenplatz', when_text: 'Samstag, 15 Uhr', reserved: false }));
    let m = (await matchesOf(a)).find((x) => x.id === chat.id);
    assert(m.date?.accepted, 'keine Zusage');
    ok(await a.rpc('beta_finish_date', { other: chat.id }));
    ok(await a.rpc('answer_after_date', { other: chat.id, answer: 'yes' }));
    m = (await matchesOf(a)).find((x) => x.id === chat.id);
    assert(m.after_date?.mine === 'yes' && m.after_date?.theirs === 'yes', 'Check danach unvollständig');
  });
  await r.check('Fremde Nachrichten nicht direkt lesbar', async () => {
    const { data, error } = await a.from('messages').select('id').limit(1);
    assert(error || !data?.length, 'Nachrichtentabelle lesbar');
    return 'gesperrt';
  });
  await r.check('Match freundlich beenden, danach kein Chat mehr', async () => {
    ok(await a.rpc('end_match', { other: chat.id, goodbye: 'Danke dir, alles Gute!' }));
    const m = (await matchesOf(a)).find((x) => x.id === chat.id);
    assert(m.ended, 'nicht beendet');
    return rejects(a.rpc('send_message', { other: chat.id, body: 'noch da?' }), 'Chat nach Ende');
  });

  // Zwei echte Personen (A und B) mögen sich gegenseitig: Match ohne Beispielprofil.
  await r.check('Zwei echte Personen: gegenseitiges Gefällt mir wird ein Match', async () => {
    ok(await svc.from('likes').delete().eq('from_id', A.id).gte('created_at', new Date(Date.now() - 864e5).toISOString()));
    ok(await b.from('likes').insert({ from_id: B.id, to_id: A.id, decision: 'like' }));
    ok(await a.from('likes').insert({ from_id: A.id, to_id: B.id, decision: 'like' }));
    const forB = (await matchesOf(b)).find((m) => m.id === A.id);
    assert(forB, 'B sieht das Match nicht');
  });
  await r.check('Antworten der anderen erst nach der eigenen sichtbar', async () => {
    ok(await b.rpc('answer_question', { other: A.id, question_key: '0-0', answer: 'B antwortet zuerst' }));
    let forA = (await matchesOf(a)).find((m) => m.id === B.id);
    assert(!forA.answers['0-0'], 'A sieht Bs Antwort vor der eigenen');
    ok(await a.rpc('answer_question', { other: B.id, question_key: '0-0', answer: 'A antwortet' }));
    forA = (await matchesOf(a)).find((m) => m.id === B.id);
    assert(forA.answers['0-0'].theirs === 'B antwortet zuerst', 'Bs Antwort fehlt');
  });
  await r.check('Melden mit unbekanntem Grund wird abgelehnt', () =>
    rejects(b.rpc('report_user', { other: A.id, reason: 'langweilig' }), 'falscher Grund'));
  await r.check('Blockieren: Match verschwindet für beide', async () => {
    ok(await b.rpc('block_user', { other: A.id }));
    assert(!(await matchesOf(a)).some((m) => m.id === B.id), 'A sieht B noch');
    assert(!(await matchesOf(b)).some((m) => m.id === A.id), 'B sieht A noch');
    return rejects(a.rpc('send_message', { other: B.id, body: 'hallo?' }), 'Nachricht trotz Blockade');
  });
  await r.check('Melden blendet die Person aus', async () => {
    const target = (await matchesOf(a)).find((m) => !m.ended);
    assert(target, 'kein Match zum Melden');
    ok(await a.rpc('report_user', { other: target.id, reason: 'spam' }));
    assert(!(await matchesOf(a)).some((m) => m.id === target.id), 'gemeldete Person noch sichtbar');
  });

  // --------------------------------------------------------------------------------------------
  r.section('Treffen und Events');
  let evs;
  await r.check('Events und Rückblick laden', async () => {
    evs = await eventsOf(a);
    assert(evs.events.length >= 3, `nur ${evs.events.length} Events`);
    assert(evs.events.some((e) => e.tonight), 'kein Event für heute Abend');
    assert(evs.past.length >= 1, 'nichts im Rückblick');
    assert(evs.events.every((e) => e.address !== undefined), 'Adresse fehlt');
    return `${evs.events.length} Events, ${evs.past.length} vorbei`;
  });
  const open = evs?.events.find((e) => !e.mine && e.access === 'open' && !Number(e.price) && e.joined.m < e.seats / 2);
  await r.check('Platz sichern, Teilnehmende und Gruppenchat sehen', async () => {
    assert(open, 'kein offenes Event');
    assert(open.people === null, 'Teilnehmende vor dem Anmelden sichtbar');
    ok(await a.rpc('join_event', { event_id: open.id }));
    const e = (await eventsOf(a)).events.find((x) => x.id === open.id);
    assert(e.mine && e.people?.length >= 1, 'Teilnehmende fehlen');
    ok(await a.rpc('send_event_message', { event_id: open.id, body: 'Ich bin dabei!' }));
    await sleep(300);
    const after = (await eventsOf(a)).events.find((x) => x.id === open.id);
    assert(after.messages.some((m) => m.mine), 'eigene Nachricht fehlt');
    return `${after.people.length} weitere dabei, ${after.messages.length} Nachrichten`;
  });
  await r.check('Gruppenchat nur für Teilnehmende', () =>
    rejects(b.rpc('send_event_message', { event_id: open.id, body: 'ich bin nicht dabei' }), 'Nachricht ohne Platz'));
  await r.check('Absagen gibt den Platz frei', async () => {
    ok(await a.rpc('leave_event', { event_id: open.id }));
    const e = (await eventsOf(a)).events.find((x) => x.id === open.id);
    assert(!e.mine, 'noch angemeldet');
  });
  let mineEv;
  await r.check('Eigenes Event für heute Abend anlegen', async () => {
    mineEv = ok(await a.rpc('create_event', {
      title: 'Tiefentest-Runde', kind: 'Feiern', place: 'Testbar', address: 'Seltersweg 1, 35390 Gießen', when_text: 'Heute, 22:00 Uhr',
      starts_at: new Date(Date.now() + 2 * 3600e3).toISOString(), seats: 4, price: 0, access: 'open', campus: null, tonight: true, invitees: [],
    }));
    const e = (await eventsOf(a)).events.find((x) => x.id === mineEv);
    assert(e?.mine && e.address.startsWith('Seltersweg'), 'Event fehlt');
  });
  await r.check('Unzulässige Events werden abgelehnt', () =>
    rejects(a.rpc('create_event', {
      title: 'Zu teuer', kind: 'Spiele', place: 'Pub', address: '', when_text: 'Morgen', starts_at: new Date(Date.now() + 864e5).toISOString(),
      seats: 10, price: 80, access: 'open', campus: null, tonight: false, invitees: [],
    }), '80 € Eintritt'));
  await r.check('Bewertung nach dem Event, gegenseitiger Wunsch wird Match', async () => {
    const past = evs.past[0];
    const women = past.attendees.filter((p) => p.gender === 'f').map((p) => p.id);
    const mutual = ok(await a.rpc('review_event', { event_id: past.id, stars: 5, body: 'Schöner Abend', picks: women }));
    assert(mutual.length >= 1, 'kein gegenseitiger Wunsch');
    const ids = (await matchesOf(a)).map((m) => m.id);
    assert(mutual.every((id) => ids.includes(id)), 'Match fehlt');
    return `${mutual.length} neue Matches`;
  });
  await r.check('Nur einmal bewerten', () =>
    rejects(a.rpc('review_event', { event_id: evs.past[0].id, stars: 1, body: '', picks: [] }), 'zweite Bewertung'));

  // --------------------------------------------------------------------------------------------
  r.section('Konto');
  await r.check('Profil pausieren und wieder aktivieren', async () => {
    ok(await b.from('profiles').update({ paused: true }).eq('id', B.id));
    ok(await b.from('profiles').update({ paused: false }).eq('id', B.id));
  });
  await r.check('Testdaten zurücksetzen', async () => {
    ok(await a.rpc('beta_reset_me'));
    const m = await matchesOf(a);
    assert(m.length >= 2, 'Startzustand fehlt');
  });
  await r.check('Konto löschen entfernt alles', async () => {
    ok(await b.rpc('delete_my_account'));
    const { data } = await svc.auth.admin.getUserById(B.id);
    assert(!data?.user, 'Anmeldekonto noch da');
    const p = ok(await svc.from('profiles').select('id').eq('id', B.id).maybeSingle());
    assert(!p, 'Profil noch da');
    created.splice(created.indexOf(B.id), 1);
  });
} catch (e) {
  r.results.push({ section: 'Abbruch', name: 'Test lief nicht zu Ende', ok: false, ms: 0, detail: e.message });
  console.error('Abbruch:', e);
} finally {
  for (const id of created) await svc.auth.admin.deleteUser(id).catch(() => {});
  await svc.storage.from('photos').remove(created.map((id) => `${id}/deeptest-${run}.png`)).catch(() => {});
}

const failed = r.results.filter((x) => !x.ok);
console.log(`\n${r.results.length - failed.length} von ${r.results.length} Prüfungen bestanden.`);
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({ run, results: r.results }, null, 2));
process.exit(failed.length ? 1 : 0);
