jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Icon-Schriften laden in Tests asynchron und lösen sonst act()-Warnungen aus.
jest.mock('@expo/vector-icons/Feather', () => {
  const { Text } = require('react-native');
  const Feather = ({ name }: { name: string }) => <Text accessible={false}>{`[${name}]`}</Text>;
  Feather.glyphMap = {};
  return Feather;
});
