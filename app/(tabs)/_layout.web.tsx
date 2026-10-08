import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router/tabs';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Glass } from '../../src/ui/Glass';
import { colors, fontFamily } from '../../src/ui/theme';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, keyof typeof Feather.glyphMap> = { heute: 'sun', matches: 'message-circle', treffen: 'users', ich: 'user' };

// Im Browser gibt es keine System-Tabs: eine schwebende Glasleiste nach dem Vorbild von iOS 26.
function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 14, alignItems: 'center' }}>
      <Glass style={{ flexDirection: 'row', borderRadius: 999, padding: 5, gap: 2 }}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const title = descriptors[route.key].options.title ?? route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={title}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={({ pressed }) => ({ minWidth: 72, alignItems: 'center', gap: 3, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: focused ? 'rgba(30,91,67,0.12)' : 'transparent', transform: [{ scale: pressed ? 0.94 : 1 }] })}
            >
              <Feather name={ICONS[route.name] ?? 'circle'} size={20} color={focused ? colors.accent : colors.text} />
              <Text style={{ fontFamily: focused ? fontFamily.semibold : fontFamily.medium, fontSize: 11, color: focused ? colors.accent : colors.text }}>{title}</Text>
            </Pressable>
          );
        })}
      </Glass>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <GlassTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="heute" options={{ title: 'Heute' }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches' }} />
      <Tabs.Screen name="ich" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
