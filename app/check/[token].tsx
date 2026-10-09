import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import type { DateCheckView } from '../../src/domain/dateCheck.ts';
import { dateCheckApi } from '../../src/lib/dateCheck';
import { Screen } from '../../src/ui/kit';
import { TrustedView } from '../../src/ui/TrustedView';
import { font } from '../../src/ui/theme';

const POLL_MS = 30000;

/** Öffentliche Seite für die Vertrauensperson, ohne Anmeldung, nur mit dem privaten Link. */
export default function TrustedPage() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [view, setView] = useState<DateCheckView | null>();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let alive = true;
    const load = () =>
      dateCheckApi.view(token).then(
        (v) => { if (alive) { setView(v); setNow(new Date()); } },
        () => { if (alive) setView((old) => (old === undefined ? null : old)); },
      );
    load();
    const timer = setInterval(load, POLL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, [token]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
        <Text style={font.display}>Date-Check</Text>
        {view === undefined ? <Text style={font.small}>Lädt …</Text> : <TrustedView view={view} now={now} />}
      </ScrollView>
    </Screen>
  );
}
