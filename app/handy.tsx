import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { backend } from '../src/lib/backend';
import { Screen, StepHeader, s } from '../src/ui/kit';
import { PhoneVerify } from '../src/ui/PhoneVerify';
import { font } from '../src/ui/theme';

export default function Handy() {
  return (
    <Screen>
      <StepHeader step={2} total={5} name="Handynummer" />
      {backend.demo && (
        <View style={s.hint}>
          <Text style={font.small}>Demo: Es wird keine SMS verschickt, jeder 6-stellige Code passt.</Text>
        </View>
      )}
      <PhoneVerify onSend={backend.sendPhoneCode} onVerify={backend.verifyPhoneCode} onDone={() => router.replace('/profil')} />
    </Screen>
  );
}
