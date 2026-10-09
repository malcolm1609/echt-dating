// Verschickt fällige Date-Check-SMS an Vertrauenspersonen (Regeln in claim_date_alarms()). Wird jede Minute
// vom Server angestoßen, sobald etwas fällig ist. Der Server schickt dabei ein Geheimnis mit, das nur in der
// Datenbank steht (app_settings.date_alarm_secret); ohne es antwortet die Funktion nicht.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { alarmText, type AlarmKind } from '../_shared/dateAlarm.ts';
import { sameSecret } from '../_shared/http.ts';

interface Due { id: number; kind: AlarmKind; previous: string | null; contact_phone: string; user_name: string; token: string }

async function sendSms(to: string, body: string): Promise<string | null> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const auth = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM');
  if (!sid || !auth || !from) return 'Twilio nicht eingerichtet';
  const form = new URLSearchParams({ To: to, Body: body });
  form.set(from.startsWith('MG') ? 'MessagingServiceSid' : 'From', from);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${sid}:${auth}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  return res.ok ? null : `${res.status} ${await res.text()}`;
}

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: secret } = await db.from('app_settings').select('value').eq('key', 'date_alarm_secret').maybeSingle();
  if (!secret?.value || !sameSecret(req.headers.get('x-alarm-secret') ?? '', secret.value)) return new Response(null, { status: 401 });
  const { data, error } = await db.rpc('claim_date_alarms');
  if (error) {
    console.error('date-alarm', error.message);
    return new Response(null, { status: 500 });
  }
  const base = Deno.env.get('PUBLIC_APP_URL') ?? '';
  const results = await Promise.all((data as Due[]).map(async (d) => {
    const failed = await sendSms(d.contact_phone, alarmText(d.kind, d.user_name, `${base}/check/${d.token}`));
    if (failed) {
      console.error('date-alarm', d.id, d.kind, failed);
      await db.rpc('release_date_alarm', { p_id: d.id, p_previous: d.previous });
    }
    return !failed;
  }));
  console.log('date-alarm', `${results.filter(Boolean).length}/${results.length} verschickt`);
  return new Response(null, { status: 204 });
});
