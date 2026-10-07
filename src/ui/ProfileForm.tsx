import { useState } from 'react';
import { Text, View } from 'react-native';
import type { Gender } from '../domain/admission';
import { ProfileDraft, ProfileErrors, validateProfileDraft } from '../domain/onboarding';
import { Button, Chip, Field, s } from './kit';

export type CompleteProfile = Required<ProfileDraft> & { seeking: Gender[] };

const GENDERS: { value: Gender; me: string; them: string }[] = [
  { value: 'f', me: 'Frau', them: 'Frauen' },
  { value: 'm', me: 'Mann', them: 'Männer' },
];

export function ProfileForm({ today = new Date(), onSubmit }: { today?: Date; onSubmit: (p: CompleteProfile) => void }) {
  const [displayName, setDisplayName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState<Gender>();
  const [seeking, setSeeking] = useState<Gender[]>([]);
  const [errors, setErrors] = useState<ProfileErrors>({});

  const edited = (field: keyof ProfileErrors) => setErrors(({ [field]: _, ...rest }) => rest);
  const toggleSeeking = (g: Gender) => {
    edited('seeking');
    setSeeking((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g].sort()));
  };

  const submit = () => {
    const draft = { displayName: displayName.trim(), birthdate, gender, seeking };
    const found = validateProfileDraft(draft, today);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(draft as CompleteProfile);
  };

  return (
    <View style={{ gap: 20 }}>
      <Field label="Vorname" value={displayName} onChangeText={(v) => { edited('displayName'); setDisplayName(v); }} error={errors.displayName} autoComplete="given-name" />
      <Field label="Geburtsdatum" value={birthdate} onChangeText={(v) => { edited('birthdate'); setBirthdate(v); }} error={errors.birthdate} placeholder="JJJJ-MM-TT" keyboardType="numbers-and-punctuation" />
      <Group label="Ich bin" error={errors.gender}>
        {GENDERS.map((g) => (
          <Chip key={g.value} label={g.me} a11y={`Ich bin ${g.me}`} selected={gender === g.value} onPress={() => { edited('gender'); setGender(g.value); }} />
        ))}
      </Group>
      <Group label="Ich suche" error={errors.seeking}>
        {GENDERS.map((g) => (
          <Chip key={g.value} label={g.them} a11y={`Ich suche ${g.them}`} selected={seeking.includes(g.value)} onPress={() => toggleSeeking(g.value)} />
        ))}
      </Group>
      <Button title="Weiter" onPress={submit} />
    </View>
  );
}

function Group({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>
      {error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}
