import { Appearance, ColorValue, DynamicColorIOS, Platform } from 'react-native';

// „Siegel“: Creme wie Briefpapier, Tinte statt Grau, Bordeaux nur für die Hauptaktion und das Siegel.
// Im Dunkelmodus ein tiefes Nacht-Bordeaux; dort wird der Akzent ein helles Rosé mit dunkler Schrift darauf.
const light = {
  bg: '#F3ECE1', // Grund, warmes Creme
  surface: '#FBF7F0', // Karten, Eingabefelder
  raised: '#EAE1D4', // gedrückt / Hover
  line: '#E3D8CA',
  text: '#21161A', // Tinte
  muted: '#75676A', // leise Tinte, AA auf bg und surface
  accent: '#8C1D3B', // Bordeaux, Hauptaktion
  hint: '#8C1D3B', // Hinweise und Fokus im selben Bordeaux, damit es bei einer Akzentfarbe bleibt
  error: '#B3261E',
  accentPressed: '#721630', // Hover / gedrückt
  accentGlass: 'rgba(140,29,59,0.14)', // blasses Bordeaux-Glas für den Gefällt-mir-Knopf, Schrift darauf in Bordeaux
  accentSoft: 'rgba(140,29,59,0.10)', // ausgewählter Tab
  onAccent: '#FFFFFF', // Text auf Bordeaux
  print: '#FFFFFF', // weißer Rand um Fotos, wie bei einem Abzug
  glass: 'rgba(251,247,240,0.78)', // Milchglas, wo es kein echtes Liquid Glass gibt
};

const dark: typeof light = {
  bg: '#1F0D13',
  surface: '#2A141B',
  raised: '#36202A',
  line: '#3B232A',
  text: '#F3ECE1',
  muted: '#B5A3A2',
  accent: '#E08AA1',
  hint: '#E08AA1',
  error: '#F2867E',
  accentPressed: '#EBA3B8',
  accentGlass: 'rgba(224,138,161,0.16)',
  accentSoft: 'rgba(224,138,161,0.14)',
  onAccent: '#1F0D13',
  print: '#F3ECE1',
  glass: 'rgba(42,20,27,0.78)',
};

type Name = keyof typeof light;

// Die Farben wechseln mit der Einstellung am Handy, ohne dass die App neu zeichnen muss:
// auf dem iPhone über systemeigene dynamische Farben, im Browser über CSS-Variablen.
// Android übernimmt die Einstellung beim Start der App.
const pick = (name: Name): ColorValue => {
  if (Platform.OS === 'ios') return DynamicColorIOS({ light: light[name], dark: dark[name] });
  if (Platform.OS === 'web') return `var(--echt-${name})`;
  return (Appearance.getColorScheme() === 'dark' ? dark : light)[name];
};

// Als string typisiert, damit alle Stellen wie bisher passen. Nie mit Zeichenketten verrechnen
// (z. B. Transparenz anhängen), auf dem iPhone ist der Wert ein Objekt.
export const colors = Object.fromEntries((Object.keys(light) as Name[]).map((n) => [n, pick(n)])) as Record<Name, string>;

/** Feste Farbwerte, wo eine Bibliothek keine dynamischen Farben versteht. */
export const palette = { light, dark };

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const vars = (p: typeof light) => (Object.keys(p) as Name[]).map((n) => `--echt-${n}:${p[n]};`).join('');
  const style = document.createElement('style');
  style.textContent = `:root{${vars(light)}color-scheme:light dark}@media (prefers-color-scheme: dark){:root{${vars(dark)}}}`;
  document.head.appendChild(style);
}

export const fontFamily = {
  regular: 'HankenGrotesk_400Regular',
  medium: 'HankenGrotesk_500Medium',
  semibold: 'HankenGrotesk_600SemiBold',
  bold: 'HankenGrotesk_700Bold',
  // Weiche Serifenschrift für Namen, Überschriften und Antworten.
  title: 'Fraunces_500Soft',
  display: 'Fraunces_500Soft',
  serifStrong: 'Fraunces_600Soft',
  serifItalic: 'Fraunces_500SoftItalic',
};

export const font = {
  display: { fontFamily: fontFamily.display, fontSize: 36, lineHeight: 42, letterSpacing: -0.8, color: colors.text },
  title: { fontFamily: fontFamily.title, fontSize: 24, lineHeight: 30, letterSpacing: -0.4, color: colors.text },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24, color: colors.text },
  small: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  label: { fontFamily: fontFamily.semibold, fontSize: 14, lineHeight: 20, color: colors.muted },
  quote: { fontFamily: fontFamily.serifItalic, fontSize: 22, lineHeight: 28, letterSpacing: -0.2, color: colors.text },
};

// Kaum sichtbarer Schatten: Flächen trennen sich über Linien, nicht über Tiefe.
export const shadow = {
  shadowColor: '#2A1018',
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 1,
};

export const motion = { fast: 160, base: 260 };
