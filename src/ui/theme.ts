// Hell und hochwertig: zartes Rosé-Grau, weiße Karten mit weichem Schatten, Glas über Fotos, Bordeaux nur für die Hauptaktion.
export const colors = {
  bg: '#F6F1EE', // Grund, ein zartes Rosé-Grau, damit weiße Karten und Glas Tiefe bekommen
  surface: '#FFFFFF', // Karten, Eingabefelder
  raised: '#ECE4DF', // gedrückt / Hover
  line: '#E4DAD4',
  text: '#1C1416', // Tinte
  muted: '#6E6064', // leise Tinte, AA auf bg und surface
  accent: '#8C1D3B', // Bordeaux, Hauptaktion
  hint: '#8C1D3B', // Hinweise und Fokus im selben Bordeaux, damit es bei einer Akzentfarbe bleibt
  error: '#B3261E',
  accentPressed: '#721630', // Hover / gedrückt
  accentLight: '#B03358', // helleres Bordeaux für den Glasknopf, weiße Schrift bleibt gut lesbar
  accentSoft: 'rgba(140,29,59,0.12)', // ausgewählter Tab
  onAccent: '#FFFFFF', // Text auf Bordeaux
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
