import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router/tabs';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useUnreadCount } from '../../src/lib/matches';
import { Glass } from '../../src/ui/Glass';
import { colors, fontFamily } from '../../src/ui/theme';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, keyof typeof Feather.glyphMap> = { heute: 'sun', matches: 'message-circle', treffen: 'users', ich: 'user' };

// Im Browser gibt es keine System-Tabs: eine schwebende Glasleiste nach dem Vorbild von iOS 26.
// Die rosa Markierung gleitet federnd zum gewählten Tab, statt hart umzuspringen.
function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const unread = useUnreadCount();
  const [frames, setFrames] = useState<Record<number, { x: number; width: number }>>({});
  const x = useRef(new Animated.Value(0)).current;
  const width = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);
  const target = frames[state.index];
  useEffect(() => {
    if (!target) return;
    if (!placed.current) {
      x.setValue(target.x);
      width.setValue(target.width);
      placed.current = true;
      return;
    }
    Animated.parallel([
      Animated.spring(x, { toValue: target.x, friction: 9, tension: 120, useNativeDriver: false }),
      Animated.spring(width, { toValue: target.width, friction: 9, tension: 120, useNativeDriver: false }),
    ]).start();
  }, [target?.x, target?.width]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 14, alignItems: 'center' }}>
      <Glass style={{ flexDirection: 'row', borderRadius: 999, padding: 5, gap: 2 }}>
        {target && <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 5, bottom: 5, left: x, width, borderRadius: 999, backgroundColor: colors.accentSoft }} />}
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const title = descriptors[route.key].options.title ?? route.name;
          const badge = route.name === 'matches' && unread > 0;
          return (
            <Pressable
              key={route.key}
              onLayout={(e) => {
                const { x: fx, width: fw } = e.nativeEvent.layout;
                setFrames((f) => (f[i]?.x === fx && f[i]?.width === fw ? f : { ...f, [i]: { x: fx, width: fw } }));
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={badge ? `${title}, ${unread} neu` : title}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={({ pressed }) => ({ minWidth: 72, alignItems: 'center', gap: 3, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: focused && !target ? colors.accentSoft : 'transparent', transform: [{ scale: pressed ? 0.94 : 1 }] })}
            >
              <View>
                <Feather name={ICONS[route.name] ?? 'circle'} size={20} color={focused ? colors.accent : colors.text} />
                {badge && (
                  <View style={{ position: 'absolute', top: -5, right: -10, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: colors.onAccent, fontFamily: fontFamily.semibold, fontSize: 10 }}>{unread}</Text>
                  </View>
                )}
              </View>
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
    <Tabs tabBar={(props) => <GlassTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg }, animation: 'shift' }}>
      <Tabs.Screen name="heute" options={{ title: 'Heute' }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches' }} />
      <Tabs.Screen name="treffen" options={{ title: 'Treffen' }} />
      <Tabs.Screen name="ich" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
