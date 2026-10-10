import { Image, ImageStyle, StyleProp } from 'react-native';

// Das Echt-Siegel: Wachs in Bordeaux mit einem E. Es steht überall dort, wo Echt etwas geprüft hat.
export function Seal({ size = 56, style, label = 'Mit Ausweis geprüft' }: { size?: number; style?: StyleProp<ImageStyle>; label?: string }) {
  return <Image accessible={!!label} accessibilityLabel={label || undefined} source={require('../../assets/seal.png')} style={[{ width: size, height: size }, style]} />;
}
