import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { ReactNode } from 'react';
import { Platform, StyleProp, View, ViewStyle } from 'react-native';
import { colors } from './theme';

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
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.line,
    backdropFilter: 'blur(28px) saturate(180%)',
    boxShadow: '0 10px 30px rgba(33,22,26,0.12)',
  } as ViewStyle,
  default: { backgroundColor: colors.surface, elevation: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
});

const dark = Platform.select<ViewStyle>({
  web: { backgroundColor: 'rgba(20,20,20,0.28)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', backdropFilter: 'blur(14px) saturate(160%)' } as ViewStyle,
  default: { backgroundColor: 'rgba(20,20,20,0.4)' },
});

// Farbiges Glas (z. B. der Bordeaux-Knopf): Ohne Liquid Glass eine deckende Fläche mit Lichtkante.
const tinted = (color: string) =>
  Platform.select<ViewStyle>({
    web: {
      // Milchiger Grund unter der Farbe, damit Text dahinter nicht durchscheint.
      backgroundColor: colors.surface,
      backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 60%), linear-gradient(${color}, ${color})`,
      backdropFilter: 'blur(20px) saturate(180%)',
      borderWidth: 1,
      borderColor: colors.line,
      boxShadow: '0 6px 18px rgba(140,29,59,0.14)',
    } as ViewStyle,
    default: { backgroundColor: color, borderWidth: 1, borderColor: colors.line },
  });

export function Glass({ children, style, tone = 'light', interactive, tint }: { children?: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'light' | 'dark'; interactive?: boolean; tint?: string }) {
  if (liquid) {
    return (
      <GlassView style={style} glassEffectStyle={tone === 'dark' ? 'clear' : 'regular'} colorScheme={tone === 'dark' ? 'dark' : 'auto'} isInteractive={interactive} tintColor={tint}>
        {children}
      </GlassView>
    );
  }
  return <View style={[tint ? tinted(tint) : tone === 'dark' ? dark : fallback, style]}>{children}</View>;
}
