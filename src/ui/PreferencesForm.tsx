import { useState } from 'react';
import { Text, View } from 'react-native';
import { ADULT, AGE_LIMIT, DISTANCE_MAX, DISTANCE_MIN, DISTANCE_STEP, Preferences, validatePreferences } from '../domain/preferences.ts';
import { Button, s } from './kit';
import { RangeSlider } from './RangeSlider';
import { colors, font, fontFamily } from './theme';

interface Props {
  initial: Preferences;
  busy?: boolean;
  onSubmit: (p: Preferences) => void;
}

// Der Regler endet bei 60, damit die Jahre für Studierende nicht zusammengequetscht sind; ganz rechts heißt „60+“.
const SLIDER_AGE_MAX = 60;
const ageText = (v: number) => (v >= SLIDER_AGE_MAX ? `${SLIDER_AGE_MAX}+` : `${v}`);

// Alter als Bereich mit zwei Griffen, Umkreis mit einem: einmal ziehen statt Jahr für Jahr tippen.
export function PreferencesForm({ initial, busy, onSubmit }: Props) {
  const [p, setP] = useState(initial);
  const error = validatePreferences(p);
  const shown = (v: number) => Math.min(v, SLIDER_AGE_MAX);

  return (
    <View style={{ gap: 16 }}>
      <Row label="Alter" value={`${ageText(p.ageMin)} bis ${ageText(p.ageMax)} Jahre`} />
      <RangeSlider
        min={ADULT}
        max={SLIDER_AGE_MAX}
        values={[shown(p.ageMin), shown(p.ageMax)]}
        onChange={([ageMin, ageMax]) => setP({ ...p, ageMin, ageMax: ageMax >= SLIDER_AGE_MAX ? AGE_LIMIT : ageMax })}
        labels={(v, i) => (i === 0 ? `Ab ${ageText(v)} Jahre` : `Bis ${ageText(v)} Jahre`)}
      />
      <Row label="Umkreis" value={`bis ${p.maxDistanceKm} km`} />
      <RangeSlider
        min={DISTANCE_MIN}
        max={DISTANCE_MAX}
        step={DISTANCE_STEP}
        values={[p.maxDistanceKm]}
        onChange={([maxDistanceKm]) => setP({ ...p, maxDistanceKm })}
        labels={(v) => `Umkreis bis ${v} km`}
      />
      <Text style={font.small}>Gilt in beide Richtungen: Du siehst nur Menschen, zu deren Wünschen du auch passt.</Text>
      {error && <Text style={s.error}>{error}</Text>}
      <Button title="Wünsche speichern" busy={busy} disabled={!!error} onPress={() => onSubmit(p)} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Text style={s.label}>{label}</Text>
      <Text style={[font.body, { fontFamily: fontFamily.semibold, color: colors.text }]}>{value}</Text>
    </View>
  );
}
