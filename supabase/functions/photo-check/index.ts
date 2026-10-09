// Prüft ein hochgeladenes Profilfoto (Regeln in _shared/photoCheck.ts). Die App lädt das Bild in den privaten
// Ordner „photo-uploads“; nur bei Erfolg landet es im öffentlichen Ordner „photos“ und darf ins Profil.
// Das Original wird danach immer gelöscht.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { json, preflight } from '../_shared/http.ts';
import { judgePhoto, SIGHTENGINE_MODELS, type SightengineResult, type Verdict } from '../_shared/photoCheck.ts';

// Fehlertext von Sightengine (ohne Zugangsdaten) landet nur im Protokoll, nicht in der Antwort.
type Checked = { result: SightengineResult } | { error: string };

async function sightengine(file: Blob, user: string, secret: string): Promise<Checked> {
  const form = new FormData();
  form.append('media', file, 'photo.jpg');
  form.append('models', SIGHTENGINE_MODELS);
  form.append('api_user', user);
  form.append('api_secret', secret);
  const res = await fetch('https://api.sightengine.com/1.0/check.json', { method: 'POST', body: form });
  const body = await res.json().catch(() => null);
  if (body?.status === 'success') return { result: body as SightengineResult };
  const error = `${res.status} ${body?.error?.type ?? ''} ${body?.error?.message ?? ''}`.trim();
  console.error('sightengine', error);
  return { error };
}

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'unauthorized' }, 401);
  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data } = await asUser.auth.getUser();
  if (!data.user) return json({ error: 'unauthorized' }, 401);
  const userId = data.user.id;

  const { path } = await req.json().catch(() => ({}));
  if (typeof path !== 'string' || !new RegExp(`^${userId}/[a-z0-9-]+\\.(jpg|jpeg|png|webp)$`).test(path)) {
    return json({ error: 'bad_path' }, 400);
  }

  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: file } = await db.storage.from('photo-uploads').download(path);
  if (!file) return json({ error: 'not_found' }, 404);

  try {
    const apiUser = Deno.env.get('SIGHTENGINE_API_USER');
    const apiSecret = Deno.env.get('SIGHTENGINE_API_SECRET');
    let verdict: Verdict;
    let checkedBy = 'sightengine';
    if (apiUser && apiSecret) {
      const checked = await sightengine(file, apiUser, apiSecret);
      if ('error' in checked) return json({ ok: false, reason: 'unavailable' });
      verdict = judgePhoto(checked.result);
    } else {
      // Ohne Zugang zur Prüfung nur im Testbetrieb durchlassen, sonst lieber gar nichts.
      const { data: beta } = await db.rpc('beta_enabled');
      if (!beta) return json({ ok: false, reason: 'unavailable' });
      verdict = { ok: true, group: false };
      checkedBy = 'ungeprueft-testbetrieb';
    }
    if (!verdict.ok) return json(verdict);
    if (verdict.group) {
      const { data: me } = await db.from('profiles').select('photos').eq('id', userId).maybeSingle();
      const { count } = await db.from('approved_photos').select('path', { count: 'exact', head: true })
        .eq('user_id', userId).eq('group_photo', true).in('path', me?.photos ?? []);
      if (count) return json({ ok: false, reason: 'too_many_groups' });
    }

    const saved = await db.storage.from('photos').upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true });
    if (saved.error) {
      console.error('photo-check speichern', saved.error.message);
      return json({ ok: false, reason: 'unavailable' });
    }
    const noted = await db.from('approved_photos')
      .upsert({ path, user_id: userId, group_photo: verdict.group, checked_by: checkedBy });
    if (noted.error) {
      console.error('photo-check eintragen', noted.error.message);
      return json({ ok: false, reason: 'unavailable' });
    }
    return json({ ok: true, path, group: verdict.group });
  } finally {
    await db.storage.from('photo-uploads').remove([path]);
  }
});
