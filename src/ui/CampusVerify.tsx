import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Field } from './kit';
import { colors, font, fontFamily, shadow } from './theme';

// Freiwillig: Wer studiert, bestätigt die Uni-Mail und kann dann bei Campus-Events mitmachen.
export function CampusVerify({ uni, onVerify }: { uni: string | null; onVerify: (email: string) => string | null }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  return (
    <View style={{ gap: 8 }}>
      <Text style={[font.label, { paddingHorizontal: 4 }]}>Studium</Text>
      <View style={[{ backgroundColor: colors.surface, borderRadius: 24, padding: 18, gap: 14 }, shadow]}>
        {uni ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Feather name="check-circle" size={18} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[font.body, { fontFamily: fontFamily.semibold }]}>{uni}</Text>
              <Text style={font.small}>Du siehst Campus-Events deiner Hochschule.</Text>
            </View>
          </View>
        ) : (
          <>
            <Text style={font.small}>Studierst du? Mit deiner Uni-Mail kannst du bei Campus-Events mitmachen. Andere sehen nur deine Hochschule, nicht die Adresse.</Text>
            <Field label="Uni-Mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="vorname.name@uni-giessen.de" error={error} />
            <Button
              title="Uni-Mail bestätigen"
              variant="ghost"
              icon="book-open"
              disabled={!email.trim()}
              onPress={() => setError(onVerify(email) ? undefined : 'Das ist keine Uni-Mail, die wir kennen. Nimm die Adresse deiner Hochschule.')}
            />
          </>
        )}
      </View>
    </View>
  );
}
