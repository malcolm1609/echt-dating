export const colors = {
  bg: '#0E0D10',
  surface: '#1A181D',
  line: '#2C2930',
  text: '#F4F1F5',
  muted: '#9C96A3',
  accent: '#FF6F59',
  hint: '#B9A7F2',
  error: '#FF8A8A',
};

export const font = {
  display: { fontSize: 40, fontWeight: '800' as const, letterSpacing: -1.2, color: colors.text },
  title: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.5, color: colors.text },
  body: { fontSize: 16, lineHeight: 23, color: colors.text },
  small: { fontSize: 13, lineHeight: 18, color: colors.muted },
};
