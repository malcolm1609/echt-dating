import { useEffect, useRef, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { clock, DateCheck, DateCheckAnswer, dateCheckErrorText, isDue, MAX_CONTACT_NAME, shareText } from '../domain/dateCheck.ts';
import { normalizePhone } from '../domain/phone.ts';
import { DateCheckApi, dateCheckApi, DateCheckDevice, dateCheckDevice, linkFor } from '../lib/dateCheck';
import { Button, Field, s } from './kit';
import { colors, font, fontFamily } from './theme';

interface Props {
  /** Konto-ID des Matches. */
  other: string;
  name: string;
  api?: DateCheckApi;
  device?: DateCheckDevice;
}

/** Date-Check für ein ausgemachtes Date: Vertrauensperson wählen, Link teilen, Standort senden, nach einer Stunde fragen. */
export function DateCheckPanel({ other, name, api = dateCheckApi, device = dateCheckDevice }: Props) {
  const [check, setCheck] = useState<DateCheck | null>();
  const [form, setForm] = useState(false);
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [ended, setEnded] = useState(false);
  const [located, setLocated] = useState<boolean>();
  const [now, setNow] = useState(() => new Date());
  const reminder = useRef<string | null>(null);

  useEffect(() => {
    api.current(other).then(setCheck, () => setCheck(null));
  }, [api, other]);

  // Uhr für die Frage „Alles okay?“, solange ein Check läuft.
  useEffect(() => {
    if (!check) return;
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, [check]);

  // Standort senden, solange der Check läuft und die App offen ist.
  const token = check?.token;
  useEffect(() => {
    if (!token) return;
    let stop = () => {};
    let gone = false;
    device.track((lat, lng) => { api.sendLocation(token, lat, lng).catch(() => {}); }).then((t) => {
      if (gone) return t.stop();
      stop = t.stop;
      setLocated(t.allowed);
    });
    return () => { gone = true; stop(); };
  }, [api, device, token]);

  // Erinnerung zur Fragezeit, auch wenn die App zu ist (nur in der App, nicht im Browser).
  const checkAt = check?.status === 'active' ? check.checkAt.getTime() : undefined;
  useEffect(() => {
    if (!checkAt) return;
    let gone = false;
    device.remind(new Date(checkAt)).then((id) => {
      if (gone && id) device.cancelReminder(id);
      else reminder.current = id;
    });
    return () => {
      gone = true;
      if (reminder.current) device.cancelReminder(reminder.current);
      reminder.current = null;
    };
  }, [device, checkAt]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
    } catch (e) {
      setError(dateCheckErrorText(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  const share = (c: DateCheck) => device.share(shareText(c.contactName, name, linkFor(c.token)));

  const start = () => run(async () => {
    const e164 = normalizePhone(phone);
    if (!e164) throw new Error('contact_phone');
    const c = await api.start(other, contact.trim(), e164);
    setCheck(c);
    setForm(false);
    setEnded(false);
    await share(c);
  });

  const answer = (a: DateCheckAnswer) => run(async () => {
    const c = await api.answer(check!.token, a);
    setCheck(c);
    setNow(new Date());
    if (!c) setEnded(true);
  });

  if (check === undefined) return null;

  if (!check) {
    return (
      <View style={{ marginTop: 10, gap: 10 }}>
        {ended && <Text style={[font.small, { color: colors.hint }]}>Date-Check beendet. Dein Standort ist gelöscht.</Text>}
        {!form ? (
          <Button title="Date-Check einschalten (kostenlos)" variant="ghost" icon="shield" onPress={() => setForm(true)} />
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={font.body}>Wähle eine Vertrauensperson. Du schickst ihr einen Link, dort sieht sie, mit wem und wo du dich triffst und wo du gerade bist.</Text>
            <Text style={font.small}>{'Nach einer Stunde fragen wir dich, ob alles okay ist. Bittest du um Hilfe oder meldest dich 15 Minuten nicht, bekommt deine Vertrauensperson eine SMS von uns. Nach dem Date löschen wir deinen Standort.'}</Text>
            <Field label="Name der Vertrauensperson" value={contact} onChangeText={setContact} maxLength={MAX_CONTACT_NAME} placeholder="z. B. Mama oder Lena" autoCapitalize="words" />
            <Field label="Handynummer der Vertrauensperson" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0151 23456789" autoComplete="tel" />
            {error && <Text style={s.error}>{error}</Text>}
            <Button title="Check starten und Link teilen" icon="shield" busy={busy} disabled={!contact.trim() || !phone.trim()} onPress={start} />
            <Button title="Abbrechen" variant="clear" disabled={busy} onPress={() => { setForm(false); setError(undefined); }} />
          </View>
        )}
      </View>
    );
  }

  const due = isDue(check, now);
  return (
    <View style={{ marginTop: 10, gap: 10, backgroundColor: colors.surface, borderRadius: 16, padding: 14 }}>
      {check.status === 'help' ? (
        <>
          <Text style={[font.body, { fontFamily: fontFamily.semibold, color: colors.error }]}>{`Hilferuf gesendet. ${check.contactName} bekommt eine SMS mit dem Link zu deinem Standort.`}</Text>
          <Text style={font.small}>Bist du in Gefahr, ruf sofort die Polizei.</Text>
          <Button title="Notruf 110 anrufen" icon="phone" onPress={() => Linking.openURL('tel:110')} />
        </>
      ) : due ? (
        <>
          <Text style={font.title}>Alles okay?</Text>
          <Text style={font.small}>{check.overdue ? `Du hast dich nicht gemeldet, deshalb haben wir ${check.contactName} eine SMS geschickt. Sag kurz Bescheid, dann bekommt ${check.contactName} eine Entwarnung.` : `Wenn du in 15 Minuten nicht antwortest, bekommt ${check.contactName} eine SMS.`}</Text>
        </>
      ) : (
        <>
          <Text style={[font.body, { fontFamily: fontFamily.semibold }]}>{`Date-Check läuft. ${check.contactName} sieht, wo du bist.`}</Text>
          <Text style={font.small}>{`Um ${clock(check.checkAt)} Uhr fragen wir dich, ob alles okay ist.`}</Text>
          {located === false && <Text style={[font.small, { color: colors.hint }]}>{`Ohne Standortfreigabe sieht ${check.contactName} nur Ort und Uhrzeit des Dates.`}</Text>}
        </>
      )}
      {error && <Text style={s.error}>{error}</Text>}
      <Button title="Alles gut, Check beenden" icon="check" busy={busy} onPress={() => answer('ok')} />
      {check.status === 'active' && <Button title="Noch eine Stunde" variant="ghost" icon="clock" busy={busy} onPress={() => answer('later')} />}
      {check.status === 'active' && <Button title="Ich brauche Hilfe" variant="ghost" icon="alert-triangle" busy={busy} onPress={() => answer('help')} />}
      <Button title={`Link nochmal an ${check.contactName} schicken`} variant="clear" icon="share" disabled={busy} onPress={() => share(check)} />
      <Text selectable style={[font.small, { fontSize: 12 }]}>{linkFor(check.token)}</Text>
    </View>
  );
}
