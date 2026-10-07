import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ADULT, AGE_LIMIT, DISTANCE_OPTIONS, Preferences, validatePreferences } from '../domain/preferences.ts';
import { Button, Chip, s } from './kit';
import { colors, font } from './theme';

interface Props {
  initial: Preferences;
  busy?: boolean;
  onSubmit: (p: Preferences) => void;
}

export function PreferencesForm({ initial, busy, onSubmit }: Props) {
  const [p, setP] = useState(initial);
  const error = validatePreferences(p);
  const set = (key: 'ageMin' | 'ageMax', value: number) => setP({ ...p, [key]: Math.min(AGE_LIMIT, Math.max(ADULT, value)) });

  return (
    <View style={{ gap: 16 }}>
      <Text style={s.label}>Alter</Text>
      <Stepper label="Ab" value={p.ageMin} onChange={(v) => set('ageMin', v)} canDown={p.ageMin > ADULT} canUp={p.ageMin < p.ageMax} />
      <Stepper label="Bis" value={p.ageMax} onChange={(v) => set('ageMax', v)} canDown={p.ageMax > p.ageMin} canUp={p.ageMax < AGE_LIMIT} />
      <Text style={s.label}>Entfernung</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {DISTANCE_OPTIONS.map((km) => (
          <Chip key={km} role="radio" label={`${km} km`} a11y={`Bis ${km} km`} selected={p.maxDistanceKm === km} onPress={() => setP({ ...p, maxDistanceKm: km })} />
        ))}
      </View>
      <Text style={font.small}>Gilt in beide Richtungen: Du siehst nur Menschen, zu deren Wünschen du auch passt.</Text>
      {error && <Text style={s.error}>{error}</Text>}
      <Button title="Wünsche speichern" busy={busy} disabled={!!error} onPress={() => onSubmit(p)} />
    </View>
  );
}

function Stepper({ label, value, onChange, canDown, canUp }: { label: string; value: number; onChange: (v: number) => void; canDown: boolean; canUp: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={[font.body, { width: 36 }]}>{label}</Text>
      <Round symbol="−" a11y={`${label}: ein Jahr weniger`} disabled={!canDown} onPress={() => onChange(value - 1)} />
      <Text accessibilityLabel={`${label} ${value} Jahre`} style={[font.title, { minWidth: 44, textAlign: 'center' }]}>{value}</Text>
      <Round symbol="+" a11y={`${label}: ein Jahr mehr`} disabled={!canUp} onPress={() => onChange(value + 1)} />
    </View>
  );
}

function Round({ symbol, a11y, disabled, onPress }: { symbol: string; a11y: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}
    >
      <Text style={[font.title, { lineHeight: 24 }]}>{symbol}</Text>
    </Pressable>
  );
}
