import Feather from '@expo/vector-icons/Feather';
import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router/tabs';
import { colors, fontFamily } from '../../src/ui/theme';

const icon = (name: keyof typeof Feather.glyphMap) => ({ color, size }: { color: ColorValue; size: number }) => <Feather name={name} color={color} size={size} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.line, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: fontFamily.medium, fontSize: 12 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="heute" options={{ title: 'Heute', tabBarIcon: icon('sun') }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches', tabBarIcon: icon('message-circle') }} />
      <Tabs.Screen name="treffen" options={{ title: 'Treffen', tabBarIcon: icon('users') }} />
      <Tabs.Screen name="ich" options={{ title: 'Profil', tabBarIcon: icon('user') }} />
    </Tabs>
  );
}
