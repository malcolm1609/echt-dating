import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { PRIVACY_POLICY, PRIVACY_VERSION } from '../src/domain/privacy';
import { Screen } from '../src/ui/kit';
import { colors, font, fontFamily } from '../src/ui/theme';

export default function Privacy() {
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const [y, m, d] = PRIVACY_VERSION.split('-');
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Zurück" onPress={back} hitSlop={12} style={{ width: 44, height: 44, justifyContent: 'center' }}>
            <Feather name="chevron-left" size={26} color={colors.text} />
          </Pressable>
          <Text accessibilityRole="header" style={font.title}>Datenschutz</Text>
        </View>
        <Text style={font.small}>{`Stand: ${d}.${m}.${y}`}</Text>
        {PRIVACY_POLICY.map((section) => (
          <View key={section.title} style={{ gap: 8 }}>
            <Text accessibilityRole="header" style={[font.body, { fontFamily: fontFamily.semibold, fontSize: 17 }]}>{section.title}</Text>
            {section.body.map((p) => <Text key={p} style={font.body}>{p}</Text>)}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
