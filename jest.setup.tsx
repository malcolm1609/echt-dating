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
