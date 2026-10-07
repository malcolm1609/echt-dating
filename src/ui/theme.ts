// Nachts, warm, ehrlich: dunkler Grund, Koralle nur für das, was zählt, Lila für leise Hinweise.
export const colors = {
  bg: '#0E0D10', // Grund
  surface: '#1A181D', // erhöhte Flächen, Karten
  raised: '#232027', // gedrückt / Hover
  line: '#2C2930',
  text: '#F4F1F5', // Tinte
  muted: '#A49EAB', // leise Tinte, AA auf bg und surface
  accent: '#FF6F59', // Signal
  hint: '#B9A7F2', // Hinweis, Fokus
  error: '#FF8A8A',
};

export const fontFamily = {
  display: 'BricolageGrotesque_800ExtraBold',
  title: 'BricolageGrotesque_700Bold',
  medium: 'BricolageGrotesque_500Medium',
};

export const font = {
  display: { fontFamily: fontFamily.display, fontSize: 48, lineHeight: 50, letterSpacing: -1.6, color: colors.text },
  title: { fontFamily: fontFamily.title, fontSize: 30, lineHeight: 34, letterSpacing: -0.6, color: colors.text },
  body: { fontSize: 16, lineHeight: 24, color: colors.text },
  small: { fontSize: 13, lineHeight: 19, color: colors.muted },
  label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 1.4, textTransform: 'uppercase' as const, color: colors.muted },
};

export const motion = { fast: 160, base: 260 };
