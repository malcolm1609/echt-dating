import { useState } from 'react';
import { Text, View } from 'react-native';
import { REPORT_REASONS, ReportReason } from '../domain/safety.ts';
import { Button, Chip, s } from './kit';
import { colors, font } from './theme';

interface Props {
  name: string;
  onReport: (reason: ReportReason) => Promise<void>;
  /** Ohne: nur Melden anbieten (z. B. in den Vorschlägen, wo Weiter schon reicht). */
  onBlock?: () => Promise<void>;
  onCancel: () => void;
}

export function ReportPanel({ name, onReport, onBlock, onCancel }: Props) {
  const [reason, setReason] = useState<ReportReason>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
    } catch {
      setError('Das hat nicht geklappt. Bitte versuch es noch einmal.');
      setBusy(false);
    }
  };

  return (
    <View style={[s.hint, { gap: 12 }]}>
      <Text style={font.title}>{`${name} melden`}</Text>
      <Text style={font.small}>{`Was ist passiert? ${name} erfährt nicht, wer gemeldet hat. Ihr seht euch danach nicht mehr.`}</Text>
      <View style={{ flexWrap: 'wrap', flexDirection: 'row', gap: 8 }}>
        {REPORT_REASONS.map((r) => <Chip key={r.id} role="radio" label={r.label} a11y={r.label} selected={reason === r.id} onPress={() => setReason(r.id)} />)}
      </View>
      {error && <Text style={s.error}>{error}</Text>}
      <Button title="Melden und blockieren" icon="flag" busy={busy} disabled={!reason} onPress={() => run(() => onReport(reason!))} />
      {onBlock && (
        <>
          <Text style={[font.small, { color: colors.hint }]}>{`Nichts Schlimmes, du willst ${name} nur nicht mehr sehen?`}</Text>
          <Button title="Nur blockieren" variant="ghost" icon="slash" busy={busy} onPress={() => run(onBlock)} />
        </>
      )}
      <Button title="Abbrechen" variant="clear" disabled={busy} onPress={onCancel} />
    </View>
  );
}
