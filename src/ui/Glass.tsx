import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { ReactNode } from 'react';
import { Platform, StyleProp, View, ViewStyle } from 'react-native';

// Echtes Liquid Glass gibt es nur ab iOS 26. Manche Betas haben die API nicht und stürzen sonst ab.
const liquid = (() => {
  if (Platform.OS !== 'ios') return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
})();

// Im Web ein Milchglas per backdrop-filter, auf Android eine fast deckende helle Fläche mit Schatten.
const fallback = Platform.select<ViewStyle>({
  web: {
    backgroundColor: 'rgba(255,255,255,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    backdropFilter: 'blur(28px) saturate(180%)',
    boxShadow: '0 10px 30px rgba(23,23,23,0.14), inset 0 1px 0 rgba(255,255,255,0.9)',
  } as ViewStyle,
  default: { backgroundColor: 'rgba(255,255,255,0.94)', elevation: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
});

const dark = Platform.select<ViewStyle>({
  web: { backgroundColor: 'rgba(20,20,20,0.28)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', backdropFilter: 'blur(14px) saturate(160%)' } as ViewStyle,
  default: { backgroundColor: 'rgba(20,20,20,0.4)' },
});

export function Glass({ children, style, tone = 'light', interactive }: { children?: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'light' | 'dark'; interactive?: boolean }) {
  if (liquid) {
    return (
      <GlassView style={style} glassEffectStyle={tone === 'dark' ? 'clear' : 'regular'} colorScheme={tone === 'dark' ? 'dark' : 'light'} isInteractive={interactive}>
        {children}
      </GlassView>
    );
  }
  return <View style={[tone === 'dark' ? dark : fallback, style]}>{children}</View>;
}
