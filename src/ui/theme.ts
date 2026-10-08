// Hell und hochwertig: warmes Hellgrau, weiße Karten mit weichem Schatten, Glas über Fotos, Tannengrün nur für die Hauptaktion.
export const colors = {
  bg: '#F3F2EE', // Grund, ein warmes Hellgrau, damit weiße Karten und Glas Tiefe bekommen
  surface: '#FFFFFF', // Karten, Eingabefelder
  raised: '#E8E7E2', // gedrückt / Hover
  line: '#E1DFD9',
  text: '#171717', // Tinte
  muted: '#66665F', // leise Tinte, AA auf bg und surface
  accent: '#1E5B43', // Tannengrün, Hauptaktion
  hint: '#1E5B43', // Hinweise und Fokus im selben Grün, damit es bei einer Akzentfarbe bleibt
  error: '#B3261E',
  accentPressed: '#174A36', // Hover / gedrückt
  accentSoft: 'rgba(30,91,67,0.12)', // ausgewählter Tab
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

// Weicher, tiefer Schatten für Karten.
export const shadow = {
  shadowColor: '#2A2620',
  shadowOpacity: 0.08,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 10 },
  elevation: 3,
};

export const motion = { fast: 160, base: 260 };
