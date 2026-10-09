// Empfängt Didit-Ergebnisse, speichert nur das Ergebnis und entscheidet über die Zulassung.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { decideWebhook, toVerification, verifyWebhook } from '../_shared/didit.ts';
import type { Area } from '../../../src/domain/onboarding.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const raw = await req.text();
  const hook = await verifyWebhook(raw, Object.fromEntries(req.headers), Deno.env.get('DIDIT_WEBHOOK_SECRET')!);
  if (!hook) return new Response('invalid signature', { status: 401 });
  const userId = hook.vendor_data;
  if (!userId || !UUID.test(userId)) return new Response('ignored');

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const v = toVerification(hook);
  const final = v.idCheck !== 'pending' && v.selfieMatch !== 'pending';
  const saved = await db.from('verifications').upsert({
    user_id: userId,
    provider: 'didit',
    provider_ref: hook.session_id,
    id_check: v.idCheck,
    selfie_match: v.selfieMatch,
    decided_at: final ? new Date().toISOString() : null,
  });
  if (saved.error) return new Response(saved.error.message, { status: 500 });

  const { data: profile } = await db.from('profiles').select('status, gender, lat, lng').eq('id', userId).maybeSingle();
  if (!profile) return new Response('no profile');

  // Gebiet ist der Landkreis, in dem man wohnt.
  const { data: areaId } = await db.rpc('area_for', { p_lat: profile.lat, p_lng: profile.lng });
  let area: Area | null = null;
  if (areaId) {
    const [{ data: a }, { data: s }] = await Promise.all([
      db.from('areas').select('id, capacity').eq('id', areaId).single(),
      db.from('area_stats').select('f, m').eq('area_id', areaId).maybeSingle(),
    ]);
    if (a) area = { id: a.id, capacity: a.capacity, counts: { f: s?.f ?? 0, m: s?.m ?? 0 } };
  }

  const update = decideWebhook(hook, profile, area, new Date());
  if (update) {
    // Nur ändern, solange noch keine Entscheidung gefallen ist (Webhooks können doppelt kommen).
    const res = await db.from('profiles').update(update).eq('id', userId).eq('status', 'pending_verification');
    if (res.error) return new Response(res.error.message, { status: 500 });
  }
  return new Response('ok');
});
