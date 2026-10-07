import Feather from '@expo/vector-icons/Feather';
import { ReactNode, useState } from 'react';
import { Text, View } from 'react-native';
import type { Gender } from '../domain/admission';
import { maskPhone } from '../domain/phone.ts';
import { Button, Field, s } from './kit';
import { ProfileCard } from './ProfileCard';
import { colors, font } from './theme';

export const BIO_MAX = 160;

export interface MyProfile {
  displayName: string;
  age: number;
  bio: string;
  gender: Gender;
  seeking: Gender[];
  phone: string | null;
  paused: boolean;
}

const SEEKING: Record<Gender, string> = { f: 'Frauen', m: 'Männer' };

interface Props {
  profile: MyProfile;
  onSaveBio: (bio: string) => Promise<void>;
  onTogglePause: () => Promise<void>;
}

export function ProfileView({ profile, onSaveBio, onTogglePause }: Props) {
  const [saved, setSaved] = useState(profile.bio);
  const [bio, setBio] = useState(profile.bio);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const changed = bio.trim() !== saved;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch {
      setError('Das hat nicht geklappt. Bitte versuch es noch einmal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 32 }}>
      <View style={{ gap: 12 }}>
        <Text style={[font.label, { color: colors.hint }]}>So sehen dich andere</Text>
        <ProfileCard name={profile.displayName} age={profile.age} bio={saved} eyebrow="in deiner Nähe" style={{ minHeight: 360, opacity: profile.paused ? 0.5 : 1 }} />
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: profile.paused ? colors.muted : '#7BE0A6' }} />
          <Text style={[font.body, { flex: 1 }]}>{profile.paused ? 'Pausiert: du bekommst keine Vorschläge und wirst nicht gezeigt.' : 'Aktiv: du wirst heute vorgeschlagen.'}</Text>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <Field label="Über mich" value={bio} onChangeText={setBio} multiline maxLength={BIO_MAX} placeholder="Was sollte man über dich wissen, bevor man dich trifft?" style={{ minHeight: 96, textAlignVertical: 'top' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text style={font.small}>{`${bio.length} / ${BIO_MAX}`}</Text>
          {changed && (
            <View style={{ minWidth: 140 }}>
              <Button title="Speichern" busy={busy} onPress={() => run(async () => { await onSaveBio(bio.trim()); setSaved(bio.trim()); })} />
            </View>
          )}
        </View>
      </View>

      <Section title="Du suchst">
        <Text style={font.body}>{profile.seeking.map((g) => SEEKING[g]).join(' und ')} im Umkreis von 25 km</Text>
      </Section>

      <Section title="Bestätigt">
        <Check label="E-Mail" />
        <Check label={profile.phone ? maskPhone(profile.phone) : 'Handynummer'} />
        <Check label="Ausweis und Live-Selfie" />
      </Section>

      <View style={s.hint}>
        <Text style={font.small}>So bleibt Echt echt: Wer 7 Tage nicht reinschaut, wird nicht mehr vorgeschlagen. Nach 14 Tagen wird das Profil pausiert und der Platz geht an die Warteliste.</Text>
      </View>

      {error && <Text style={s.error}>{error}</Text>}
      <Button title={profile.paused ? 'Wieder aktiv werden' : 'Profil pausieren'} icon={profile.paused ? 'play' : 'pause'} variant="ghost" busy={busy} onPress={() => run(onTogglePause)} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={font.label}>{title}</Text>
      {children}
    </View>
  );
}

function Check({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Feather name="check-circle" size={18} color={colors.hint} />
      <Text style={font.body}>{label}</Text>
    </View>
  );
}
