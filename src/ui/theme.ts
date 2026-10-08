// Hell und zurückhaltend wie eine fertige App: Weiß, dunkle Tinte, Tannengrün nur für die Hauptaktion.
export const colors = {
  bg: '#FFFFFF', // Grund
  surface: '#F4F4F1', // Karten, Eingabefelder
  raised: '#E9E9E5', // gedrückt / Hover
  line: '#E2E2DE',
  text: '#171717', // Tinte
  muted: '#66665F', // leise Tinte, AA auf bg und surface
  accent: '#1E5B43', // Tannengrün, Hauptaktion
  hint: '#1E5B43', // Hinweise und Fokus im selben Grün, damit es bei einer Akzentfarbe bleibt
  error: '#B3261E',
  onAccent: '#FFFFFF', // Text auf Grün
};

export const fontFamily = {
  regular: 'HankenGrotesk_400Regular',
  medium: 'HankenGrotesk_500Medium',
  semibold: 'HankenGrotesk_600SemiBold',
  title: 'HankenGrotesk_700Bold',
  display: 'HankenGrotesk_700Bold',
};

export const font = {
  display: { fontFamily: fontFamily.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.4, color: colors.text },
  title: { fontFamily: fontFamily.title, fontSize: 22, lineHeight: 28, letterSpacing: -0.2, color: colors.text },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24, color: colors.text },
  small: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  label: { fontFamily: fontFamily.semibold, fontSize: 14, lineHeight: 20, color: colors.muted },
};

export const motion = { fast: 160, base: 260 };
