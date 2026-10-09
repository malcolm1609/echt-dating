import Feather from '@expo/vector-icons/Feather';
import {
  RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MAX_VOICE_MS, MIN_VOICE_MS, voiceClock } from '../domain/voice.ts';
import type { VoiceMemo } from '../lib/matches';
import { colors, font, fontFamily } from './theme';

/** Aufnahme: antippen startet, „Senden“ schickt ab, nach einer Minute geht das Memo von selbst raus. */
export function VoiceRecorder({ onSend, onRecording }: { onSend: (uri: string, durationMs: number) => Promise<void>; onRecording?: (on: boolean) => void }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 250);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const finishing = useRef(false);

  const start = async () => {
    setError(undefined);
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) return setError('Erlaube Echt das Mikrofon in den Einstellungen deines Handys.');
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      finishing.current = false;
      setRecording(true);
    } catch {
      setError('Die Aufnahme hat nicht geklappt.');
    }
  };

  const finish = async (send: boolean) => {
    if (finishing.current) return;
    finishing.current = true;
    const ms = Math.min(state.durationMillis, MAX_VOICE_MS);
    setBusy(true);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      setRecording(false);
      if (send && recorder.uri && ms >= MIN_VOICE_MS) await onSend(recorder.uri, ms);
      else if (send) setError('Das war zu kurz.');
    } catch {
      setError('Das Sprachmemo ließ sich nicht senden. Bitte versuch es noch einmal.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => onRecording?.(recording), [recording, onRecording]);
  useEffect(() => {
    if (recording && state.durationMillis >= MAX_VOICE_MS) finish(true);
  });

  if (!recording) {
    return (
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Sprachmemo aufnehmen" onPress={start} disabled={busy}
          style={{ backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, opacity: busy ? 0.5 : 1 }}>
          <Feather name="mic" size={20} color={colors.onAccent} />
        </Pressable>
        {error && <Text style={[font.small, { color: colors.error }]}>{error}</Text>}
      </View>
    );
  }
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 14, padding: 8 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error, marginLeft: 6 }} />
      <Text style={[font.body, { flex: 1 }]} accessibilityLiveRegion="polite">{`${voiceClock(state.durationMillis)} / ${voiceClock(MAX_VOICE_MS)}`}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Aufnahme verwerfen" onPress={() => finish(false)} disabled={busy} hitSlop={8} style={{ padding: 8 }}>
        <Feather name="trash-2" size={20} color={colors.muted} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Sprachmemo senden" onPress={() => finish(true)} disabled={busy}
        style={{ backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 }}>
        <Text style={{ color: colors.onAccent, fontFamily: fontFamily.semibold }}>Senden</Text>
      </Pressable>
    </View>
  );
}

/** Sprachmemo in einer Sprechblase; die Adresse wird erst beim ersten Abspielen geholt. */
export function VoiceBubble({ memo, mine, getUrl }: { memo: VoiceMemo; mine: boolean; getUrl: (path: string) => Promise<string> }) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const tint = mine ? colors.onAccent : colors.accent;

  const toggle = async () => {
    setError(false);
    try {
      if (status.playing) return player.pause();
      if (!loaded) {
        player.replace({ uri: await getUrl(memo.path) });
        setLoaded(true);
      } else if (status.didJustFinish || (status.duration && status.currentTime >= status.duration)) {
        await player.seekTo(0);
      }
      player.play();
    } catch {
      setError(true);
    }
  };

  const shown = status.playing || status.currentTime > 0 ? status.currentTime * 1000 : memo.durationMs;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Sprachmemo, ${voiceClock(memo.durationMs)}, ${status.playing ? 'anhalten' : 'abspielen'}`} onPress={toggle}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 140 }}>
      <Feather name={status.playing ? 'pause' : 'play'} size={20} color={tint} />
      <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: mine ? 'rgba(255,255,255,0.4)' : colors.line }}>
        <View style={{ width: `${Math.min(100, ((status.currentTime * 1000) / memo.durationMs) * 100)}%`, height: 3, borderRadius: 2, backgroundColor: tint }} />
      </View>
      <Text style={[font.small, { color: mine ? colors.onAccent : colors.muted }]}>{error ? 'Fehler' : voiceClock(shown)}</Text>
    </Pressable>
  );
}
