// Klicktest der Web-Version gegen den Beta-Server: ein frisches Testkonto meldet sich an und geht durch
// alle Tabs und die wichtigsten Abläufe. Jeder Schritt wird fotografiert; Fehler im Browser und fehlgeschlagene
// Server-Anfragen werden mitgezählt.
// Aufruf: SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… SITE_URL=https://…/echt-dating node scripts/beta-test/uitest.mjs [ordner]
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { admin, env, ok, password, profileFor, recorder, runId } from './lib.mjs';

const site = env('SITE_URL').replace(/\/$/, '');
const out = process.argv[2] ?? 'ui-test';
mkdirSync(out, { recursive: true });
const svc = admin();
const run = runId();
const r = recorder();
let userId;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const pageErrors = [];
const failedCalls = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('response', (res) => {
  if (res.url().includes('supabase.co') && res.status() >= 400) failedCalls.push(`${res.status()} ${res.request().method()} ${res.url().split('?')[0].replace(/^https:\/\/[^/]+/, '')}`);
});
let shot = 0;
const snap = (name) => page.screenshot({ path: `${out}/${String(++shot).padStart(2, '0')}-${name}.png` });
const tab = (name) => page.getByRole('tab', { name: new RegExp(name) }).click();

try {
  const email = `uitest-${run}@example.com`;
  const pw = password();
  userId = ok(await svc.auth.admin.createUser({ email, password: pw, email_confirm: true })).user.id;
  const area = ok(await svc.from('areas').select('id').eq('name', 'Gießen').single());
  ok(await svc.from('profiles').insert({ id: userId, ...profileFor(0, { gender: 'm', name: 'Klicktest' }), area_id: area.id, status: 'admitted', last_active_at: new Date().toISOString() }));
  ok(await svc.rpc('beta_prepare_tester', { tester: userId }));
  ok(await svc.rpc('beta_prepare_events', { tester: userId }));

  r.section('Klicktest im Browser');
  await r.check('Seite lädt und Testzugang öffnet', async () => {
    await page.goto(`${site}/testzugang`, { waitUntil: 'networkidle' });
    await page.getByLabel('E-Mail').fill(email);
    await page.getByLabel('Passwort').fill(pw);
    await snap('testzugang');
  });
  await r.check('Anmelden führt zu „Heute“', async () => {
    await page.getByRole('button', { name: 'Anmelden' }).click();
    await page.waitForURL(/\/heute/, { timeout: 15000 });
    await page.getByText(/von 6/).first().waitFor({ timeout: 15000 });
    await snap('heute');
  });
  await r.check('Gefällt mir tippen', async () => {
    const before = await page.getByLabel(/von 6 Vorschlägen/).innerText();
    await page.getByRole('button', { name: 'Gefällt mir' }).click();
    await page.waitForTimeout(2500);
    await snap('nach-gefaellt-mir');
    const match = await page.getByText('Ihr mögt euch beide').isVisible().catch(() => false);
    if (match) await page.getByText('Später schreiben').click();
    return match ? 'Match!' : `vorher ${before}`;
  });
  await r.check('Weiter durch Ziehen nach links', async () => {
    const before = await page.getByLabel(/von 6 Vorschlägen/).innerText();
    const k = await page.getByRole('button', { name: 'Gefällt mir' }).boundingBox();
    const x = k.x + k.width / 2;
    const y = k.y + k.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) await page.mouse.move(x - i * 15, y, { steps: 2 });
    await page.mouse.up();
    await page.waitForTimeout(2500);
    const after = await page.getByLabel(/von 6 Vorschlägen/).innerText();
    if (before === after) throw new Error(`Zähler blieb bei ${after}`);
    return `${before} → ${after}`;
  });
  await r.check('Matches-Tab mit Neu-Hinweis', async () => {
    await tab('Matches');
    await page.waitForTimeout(2000);
    await snap('matches');
    return (await page.getByLabel('Neu').count()) ? 'Neu-Punkt sichtbar' : 'kein Neu-Punkt';
  });
  await r.check('Chat öffnen, schreiben, Antwort kommt', async () => {
    await page.getByText(/Antwort aus dem Test|Hast du am Wochenende/).first().click();
    await page.getByLabel('Nachricht').waitFor({ timeout: 10000 });
    await page.getByLabel('Nachricht').fill('Hallo aus dem Klicktest!');
    await page.getByLabel('Senden').click();
    await page.waitForTimeout(3000);
    await snap('chat');
    if (!(await page.getByText('Hallo aus dem Klicktest!').isVisible())) throw new Error('eigene Nachricht fehlt');
  });
  await r.check('Profil im Match ansehen', async () => {
    await page.getByLabel(/^Profil von .* ansehen$/).click();
    await page.waitForTimeout(800);
    await snap('profil-im-match');
    await page.getByLabel('Zurück').first().click();
  });
  await r.check('Treffen-Tab mit Events', async () => {
    await tab('Treffen');
    await page.waitForTimeout(2500);
    await snap('treffen');
    if (!(await page.getByText('Platz sichern').count())) throw new Error('kein buchbares Event');
  });
  await r.check('Platz sichern und Gruppenchat', async () => {
    await page.getByText('Platz sichern').first().click();
    await page.waitForTimeout(2500);
    await page.getByText(/Gruppenchat/).first().click();
    await page.getByLabel('Nachricht an die Gruppe').waitFor({ timeout: 10000 });
    await page.getByLabel('Nachricht an die Gruppe').fill('Bin dabei, bis später!');
    await page.getByLabel('Senden').click();
    await page.waitForTimeout(3000);
    await snap('event-gruppenchat');
    if (!(await page.getByText('Bin dabei, bis später!').isVisible())) throw new Error('Nachricht fehlt');
  });
  await r.check('Profil-Tab und Einstellungen', async () => {
    await page.goto(`${site}/ich`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await snap('profil');
    await page.getByLabel('Einstellungen').click();
    await page.waitForTimeout(1500);
    await snap('einstellungen');
  });
  await r.check('Keine Fehler im Browser', async () => {
    if (pageErrors.length) throw new Error(pageErrors.slice(0, 3).join(' | '));
  });
  await r.check('Keine fehlgeschlagenen Server-Anfragen', async () => {
    if (failedCalls.length) throw new Error(`${failedCalls.length}: ${[...new Set(failedCalls)].slice(0, 5).join(' | ')}`);
  });
} catch (e) {
  r.results.push({ section: 'Abbruch', name: 'Klicktest lief nicht zu Ende', ok: false, ms: 0, detail: e.message });
  console.error(e);
} finally {
  await snap('ende').catch(() => {});
  await browser.close();
  if (userId) await svc.auth.admin.deleteUser(userId).catch(() => {});
}

writeFileSync(`${out}/ergebnis.json`, JSON.stringify({ run, results: r.results, pageErrors, failedCalls }, null, 2));
process.exit(r.results.some((x) => !x.ok) ? 1 : 0);
