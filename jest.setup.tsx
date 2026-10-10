jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Icon-Schriften laden in Tests asynchron und lösen sonst act()-Warnungen aus.
jest.mock('@expo/vector-icons/Feather', () => {
  const { Text } = require('react-native');
  const Feather = ({ name }: { name: string }) => <Text accessible={false}>{`[${name}]`}</Text>;
  Feather.glyphMap = {};
  return Feather;
});

// React Native lädt Animated, Pressable und PanResponder erst beim ersten Zugriff. Ohne Babel-Cache
// (frischer CI-Lauf) kostet das Übersetzen mehrere Sekunden und fiele in den ersten Test einer Datei,
// der dann an der 5-Sekunden-Grenze scheitert. Hier geschieht es vor dem Testlauf.
{
  const { Animated, Pressable, PanResponder } = require('react-native');
  void [Animated, Pressable, PanResponder];
}

// Audio gibt es in Tests nicht: Aufnahme und Abspielen als Attrappen.
jest.mock('expo-audio', () => {
  const recorder = { prepareToRecordAsync: jest.fn(async () => {}), record: jest.fn(), stop: jest.fn(async () => {}), uri: 'file:///memo.m4a' };
  const player = { play: jest.fn(), pause: jest.fn(), replace: jest.fn(), seekTo: jest.fn(async () => {}) };
  return {
    RecordingPresets: { HIGH_QUALITY: {} },
    useAudioRecorder: () => recorder,
    useAudioRecorderState: () => ({ isRecording: false, durationMillis: 4200 }),
    useAudioPlayer: () => player,
    useAudioPlayerStatus: () => ({ playing: false, currentTime: 0, duration: 0, didJustFinish: false }),
    requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true })),
    setAudioModeAsync: jest.fn(async () => {}),
  };
});

// Skia (Foto-Regler) braucht eine Grafikkarte: Vorschau und Umrechnen als Attrappen.
jest.mock('./src/lib/photoLook', () => ({
  photoBrightness: jest.fn(async () => 0.5),
  applyPhotoLook: jest.fn(async () => 'file:///angepasst.jpg'),
}));
jest.mock('./src/ui/LookPreview', () => {
  const { View } = require('react-native');
  return { LookPreview: () => <View testID="look-preview" /> };
});
