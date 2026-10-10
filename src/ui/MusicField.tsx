import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MUSIC_TITLE_MAX, MusicLink, musicKindLabel, parseMusicLink, providerName } from '../domain/music.ts';
import { Field, s } from './kit';
import { colors, font } from './theme';

interface Props {
  value?: MusicLink;
  /** Nummer des Songs, damit Vorlesefunktionen die Felder unterscheiden können. */
  number?: number;
  error?: string;
  onChange: (music: MusicLink | undefined) => void;
  lookupTitle: (url: string) => Promise<string | null>;
}

export function MusicField({ value, number = 1, error, onChange, lookupTitle }: Props) {
  const [link, setLink] = useState(value?.url ?? '');
  const parsed = link.trim() ? parseMusicLink(link) : null;
  const wrong = link.trim().length > 0 && !parsed;

  // Neuer Link erkannt: Titel vorschlagen, solange die Person noch keinen eigenen eingetragen hat.
  useEffect(() => {
    if (!parsed || parsed.url === value?.url) return;
    let alive = true;
    onChange({ provider: parsed.provider, kind: parsed.kind, url: parsed.url, title: parsed.suggestedTitle ?? '' });
    lookupTitle(parsed.url).then((title) => {
      if (alive && title) onChange({ provider: parsed.provider, kind: parsed.kind, url: parsed.url, title });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed?.url]);

  return (
    <View style={{ gap: 12 }}>
      <Field
        label="Link"
        accessibilityLabel={number > 1 ? `Link zu Spotify oder Apple Music, Song ${number}` : 'Link zu Spotify oder Apple Music'}
        value={link}
        onChangeText={(v) => {
          setLink(v);
          if (!v.trim()) onChange(undefined);
        }}
        placeholder="In der App: Teilen → Link kopieren"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      {wrong && <Text style={s.error}>Das ist kein Link von Spotify oder Apple Music. Kopier ihn über „Teilen → Link kopieren“.</Text>}
      {parsed && value && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="check-circle" size={16} color={colors.hint} />
            <Text style={[font.small, { color: colors.hint }]}>{`${providerName(parsed.provider)} · ${musicKindLabel(parsed.kind)} erkannt`}</Text>
          </View>
          <Field label="Titel" value={value.title} maxLength={MUSIC_TITLE_MAX} onChangeText={(title) => onChange({ ...value, title })} placeholder="z. B. Song – Interpret" />
          <Pressable accessibilityRole="button" onPress={() => { setLink(''); onChange(undefined); }} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <Text style={[font.small, { color: colors.text }]}>Song entfernen</Text>
          </Pressable>
        </>
      )}
      {error && !wrong && <Text style={s.error}>{error}</Text>}
    </View>
  );
}
