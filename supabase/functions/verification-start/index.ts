// Startet eine Didit-Prüfung für die angemeldete Person und gibt den Prüf-Link zurück.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { json, preflight } from '../_shared/http.ts';

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'unauthorized' }, 401);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  });
  const { data } = await db.auth.getUser();
  if (!data.user) return json({ error: 'unauthorized' }, 401);

  const res = await fetch('https://verification.didit.me/v3/session/', {
    method: 'POST',
    headers: { 'x-api-key': Deno.env.get('DIDIT_API_KEY')!, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflow_id: Deno.env.get('DIDIT_WORKFLOW_ID'),
      vendor_data: data.user.id,
      language: 'de',
      callback: Deno.env.get('DIDIT_CALLBACK_URL') || undefined,
    }),
  });
  if (!res.ok) {
    console.error('didit', res.status, await res.text());
    return json({ error: 'didit_failed' }, 502);
  }
  const { url } = await res.json();
  return json({ url });
});
