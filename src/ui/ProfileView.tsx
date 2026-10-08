import { useState } from 'react';
import { Text, View } from 'react-native';
import type { Gender } from '../domain/admission';
import type { MusicLink } from '../domain/music.ts';
import { GoalId, ProfileContent, PromptAnswer, promptText } from '../domain/profileContent.ts';
import type { Preferences } from '../domain/preferences.ts';
import { Button, Field, s } from './kit';
import { ProfileContentForm } from './ProfileContentForm';
import { photoUrls } from '../lib/photos';
import { PhotoEditor } from './PhotoEditor';
import { ProfileDetails } from './ProfileDetails';
import { colors, font, fontFamily, shadow } from './theme';

export const BIO_MAX = 160;

export interface MyProfile {
  displayName: string;
  age: number;
  bio: string;
  gender: Gender;
  seeking: Gender[];
  phone: string | null;
  paused: boolean;
  goal?: GoalId;
  prompts: PromptAnswer[];
  interests: string[];
  music?: MusicLink;
  preferences: Preferences;
  /** Speicherpfade, das erste ist das Hauptfoto. */
  photos: string[];
}

interface Props {
  profile: MyProfile;
  onSaveBio: (bio: string) => Promise<void>;
  onSaveContent: (content: ProfileContent) => Promise<void>;
  onUploadPhoto: (uri: string, mimeType?: string) => Promise<string>;
  onSavePhotos: (photos: string[]) => Promise<void>;
}

// Das eigene Profil: Vorschau, wie andere es sehen, und darunter alles zum Bearbeiten. Einstellungen liegen separat.
export function ProfileView({ profile, onSaveBio, onSaveContent, onUploadPhoto, onSavePhotos }: Props) {
  const [photos, setPhotos] = useState(profile.photos);
  const [saved, setSaved] = useState(profile.bio);
  const [content, setContent] = useState<ProfileContent>({ prompts: profile.prompts, goal: profile.goal, interests: profile.interests, music: profile.music });
  const [editing, setEditing] = useState(false);
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
    <View style={{ gap: 28 }}>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: profile.paused ? colors.muted : colors.accent }} />
          <Text style={[font.small, { flex: 1 }]}>{profile.paused ? 'Pausiert: du wirst gerade niemandem gezeigt.' : 'Aktiv: du wirst heute vorgeschlagen.'}</Text>
        </View>
        {photos.length === 0 && <Text style={[font.small, { color: colors.hint }]}>Noch ohne Foto. Füg unten eins hinzu, damit man dich erkennt.</Text>}
        <Text style={[font.label, { color: colors.hint }]}>So sehen dich andere</Text>
        <ProfileDetails
          name={profile.displayName}
          age={profile.age}
          bio={saved}
          eyebrow="in deiner Nähe"
          goal={content.goal}
          prompts={content.prompts.map((p) => ({ question: promptText(p.promptId) ?? '', answer: p.answer }))}
          interests={content.interests}
          music={content.music}
          photos={photoUrls(photos)}
          dimmed={profile.paused}
        />
      </View>

      <View style={[{ backgroundColor: colors.surface, borderRadius: 24, padding: 18, gap: 12 }, shadow]}>
        <Text style={font.title}>Bearbeiten</Text>
        <PhotoEditor photos={photos} onUpload={onUploadPhoto} onChange={async (p) => { await onSavePhotos(p); setPhotos(p); }} />
        <Field label="Über mich" value={bio} onChangeText={setBio} multiline maxLength={BIO_MAX} placeholder="Was sollte man über dich wissen, bevor man dich trifft?" style={{ minHeight: 96, textAlignVertical: 'top' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text style={font.small}>{`${bio.length} / ${BIO_MAX}`}</Text>
          {changed && (
            <View style={{ minWidth: 140 }}>
              <Button title="Speichern" busy={busy} onPress={() => run(async () => { await onSaveBio(bio.trim()); setSaved(bio.trim()); })} />
            </View>
          )}
        </View>
        {editing ? (
          <View style={{ gap: 16 }}>
            <Text style={[font.body, { fontFamily: fontFamily.semibold }]}>Fragen, Ziel, Interessen und Song</Text>
            <ProfileContentForm
              initial={content}
              submitLabel="Änderungen speichern"
              busy={busy}
              onSubmit={(c) => run(async () => { await onSaveContent(c); setContent(c); setEditing(false); })}
            />
            <Button title="Abbrechen" variant="ghost" onPress={() => setEditing(false)} />
          </View>
        ) : (
          <Button title="Fragen, Ziel, Interessen und Song ändern" icon="edit-3" variant="ghost" onPress={() => setEditing(true)} />
        )}
      </View>

      {error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}
