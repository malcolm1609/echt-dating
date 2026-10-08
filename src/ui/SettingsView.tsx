import Feather from '@expo/vector-icons/Feather';
import { ReactNode, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import type { Gender } from '../domain/admission';
import { maskPhone } from '../domain/phone.ts';
import { Preferences, preferencesSummary } from '../domain/preferences.ts';
import { Button, s } from './kit';
import { PreferencesForm } from './PreferencesForm';
import type { MyProfile } from './ProfileView';
import { colors, font, fontFamily, shadow } from './theme';

const SEEKING: Record<Gender, string> = { f: 'Frauen', m: 'Männer' };

interface Props {
  profile: MyProfile;
  onSavePreferences: (p: Preferences) => Promise<void>;
  onTogglePause: () => Promise<void>;
}

// Alles, was nicht im Profil zu sehen ist: wen ich sehe, ob ich sichtbar bin, was geprüft wurde.
export function SettingsView({ profile, onSavePreferences, onTogglePause }: Props) {
  const [prefs, setPrefs] = useState(profile.preferences);
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

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
    <View style={{ gap: 24 }}>
      <Group title="Wen ich sehen möchte">
        <Text style={font.body}>{`${profile.seeking.map((g) => SEEKING[g]).join(' und ')}, ${preferencesSummary(prefs)}`}</Text>
        {editingPrefs ? (
          <>
            <PreferencesForm initial={prefs} busy={busy} onSubmit={(p) => run(async () => { await onSavePreferences(p); setPrefs(p); setEditingPrefs(false); })} />
            <Button title="Abbrechen" variant="ghost" onPress={() => setEditingPrefs(false)} />
          </>
        ) : (
          <Button title="Alter und Entfernung ändern" icon="sliders" variant="ghost" onPress={() => setEditingPrefs(true)} />
        )}
      </Group>

      <Group title="Sichtbarkeit">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[font.body, { fontFamily: fontFamily.semibold }]}>Profil pausieren</Text>
            <Text style={font.small}>{profile.paused ? 'Pausiert: du bekommst keine Vorschläge und wirst nicht gezeigt.' : 'Aktiv: du wirst heute vorgeschlagen.'}</Text>
          </View>
          <Switch
            accessibilityLabel="Profil pausieren"
            value={profile.paused}
            disabled={busy}
            onValueChange={() => run(onTogglePause)}
            trackColor={{ false: colors.raised, true: colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
        <Text style={font.small}>So bleibt Echt echt: Wer 7 Tage nicht reinschaut, wird nicht mehr vorgeschlagen. Nach 14 Tagen wird das Profil pausiert und der Platz geht an die Warteliste.</Text>
      </Group>

      <Group title="Bestätigt">
        <Check label="E-Mail" />
        <Check label={profile.phone ? maskPhone(profile.phone) : 'Handynummer'} />
        <Check label="Ausweis und Live-Selfie" />
      </Group>

      {error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={[font.label, { paddingHorizontal: 4 }]}>{title}</Text>
      <View style={[{ backgroundColor: colors.surface, borderRadius: 24, padding: 18, gap: 14 }, shadow]}>{children}</View>
    </View>
  );
}

function Check({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Feather name="check-circle" size={18} color={colors.accent} />
      <Text style={font.body}>{label}</Text>
    </View>
  );
}
