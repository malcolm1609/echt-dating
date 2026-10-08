import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { ALWAYS_FREE, PARTNER_DATE_DISCOUNT, PLUS_FEATURES, PLUS_PRICE } from '../src/domain/plus.ts';
import { plusStore, usePlus } from '../src/lib/plus';
import { Button, Screen, s } from '../src/ui/kit';
import { colors, font } from '../src/ui/theme';

export default function Plus() {
  const plus = usePlus();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/ich'));
  return (
    <Screen>
      <Pressable accessibilityRole="button" accessibilityLabel="Zurück" onPress={back} hitSlop={12}>
        <Text style={{ color: colors.accent, fontSize: 28 }}>‹</Text>
      </Pressable>
      <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 24 }}>
        <View style={{ gap: 6 }}>
          <Text style={font.display}>Plus<Text style={{ color: colors.accent }}>.</Text></Text>
          <Text style={font.title}>{PLUS_PRICE}</Text>
          <Text style={font.body}>Für alles, was aus einem Match ein echtes Treffen macht. Monatlich kündbar.</Text>
        </View>

        <View style={{ gap: 12 }}>
          {PLUS_FEATURES.map((f) => (
            <View key={f.title} style={{ flexDirection: 'row', gap: 14, backgroundColor: colors.surface, borderRadius: 18, padding: 16 }}>
              <Feather name={f.icon} size={22} color={colors.accent} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[font.body, { fontWeight: '700' }]}>{f.title}</Text>
                <Text style={font.small}>{f.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {plus.active ? (
          <View style={{ gap: 12 }}>
            <View style={[s.hint, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <View style={{ flex: 1 }}>
                <Text style={font.body}>„Gelesen“ anzeigen</Text>
                <Text style={font.small}>Sichtbar nur bei Matches, die es auch eingeschaltet haben.</Text>
              </View>
              <Switch accessibilityLabel="Gelesen anzeigen" value={plus.readReceipts} onValueChange={plusStore.setReadReceipts} trackColor={{ true: colors.accent, false: colors.line }} thumbColor={colors.text} />
            </View>
            <Button title="Demo: Plus beenden" variant="ghost" onPress={() => plusStore.setActive(false)} />
          </View>
        ) : (
          <Button title="Demo: Plus aktivieren" icon="star" onPress={() => plusStore.setActive(true)} />
        )}

        <View style={{ gap: 8 }}>
          <Text style={s.label}>Für alle immer kostenlos</Text>
          {ALWAYS_FREE.map((t) => (
            <View key={t} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Feather name="check" size={16} color={colors.hint} />
              <Text style={font.body}>{t}</Text>
            </View>
          ))}
          <Text style={font.small}>{`Und bei jedem Date in einem Partner-Café ${PARTNER_DATE_DISCOUNT} % Rabatt, auch ohne Plus. Kein Kauf von Likes oder Boosts, für niemanden.`}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
