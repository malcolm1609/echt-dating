import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { cleanPhoto } from '../lib/cleanPhoto';
import { photoErrorText } from '../lib/photoErrors';
import { MAX_PHOTOS, photoUrl } from '../lib/photos';
import { s } from './kit';
import { colors, font } from './theme';

interface Props {
  photos: string[];
  onUpload: (uri: string, mimeType?: string) => Promise<string>;
  onChange: (photos: string[]) => Promise<void>;
}

// Bis zu 6 Fotos im 4:5-Format. Antippen macht ein Foto zum Hauptfoto, das Kreuz entfernt es.
export function PhotoEditor({ photos, onUpload, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
    } catch (e) {
      setError(photoErrorText(e) ?? 'Das hat nicht geklappt. Bitte versuch es noch einmal.');
    } finally {
      setBusy(false);
    }
  };
  const add = () => run(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const photo = await cleanPhoto(result.assets[0].uri, result.assets[0].width);
    const path = await onUpload(photo.uri, photo.mimeType);
    await onChange([...photos, path]);
  });
  const tile = { width: '31%', aspectRatio: 4 / 5, borderRadius: 14, overflow: 'hidden' } as const;

  return (
    <View style={{ gap: 10 }}>
      <Text style={[font.body, { fontWeight: '600' }]}>Fotos</Text>
      <Text style={font.small}>{photos.length ? 'Antippen macht ein Foto zum Hauptfoto.' : 'Zeig dich, wie du wirklich aussiehst: Auf jedem Foto muss man dein Gesicht klar erkennen, ohne starke Filter. Höchstens ein Gruppenfoto.'}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {photos.map((p, i) => (
          <View key={p} style={tile}>
            <Pressable accessibilityRole="button" accessibilityLabel={i === 0 ? 'Hauptfoto' : `Foto ${i + 1} als Hauptfoto`} disabled={busy || i === 0} onPress={() => run(() => onChange([p, ...photos.filter((x) => x !== p)]))} style={{ flex: 1 }}>
              <Image source={{ uri: photoUrl(p) }} resizeMode="cover" style={{ flex: 1, backgroundColor: colors.line }} />
            </Pressable>
            {i === 0 && <Text style={{ position: 'absolute', left: 6, bottom: 6, overflow: 'hidden', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, fontSize: 11, color: colors.onAccent, backgroundColor: colors.accent }}>Hauptfoto</Text>}
            <Pressable accessibilityRole="button" accessibilityLabel={`Foto ${i + 1} entfernen`} disabled={busy} onPress={() => run(() => onChange(photos.filter((x) => x !== p)))} hitSlop={8} style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={15} color="#FFFFFF" />
            </Pressable>
          </View>
        ))}
        {photos.length < MAX_PHOTOS && (
          <Pressable accessibilityRole="button" accessibilityLabel="Foto hinzufügen" disabled={busy} onPress={add} style={[tile, { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, alignItems: 'center', justifyContent: 'center', gap: 4 }]}>
            <Feather name={busy ? 'loader' : 'plus'} size={22} color={colors.accent} />
            <Text style={font.small}>{busy ? 'Lädt …' : 'Foto'}</Text>
          </Pressable>
        )}
      </View>
      {error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}
