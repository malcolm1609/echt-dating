import { Canvas, ColorMatrix, Image, useImage } from '@shopify/react-native-skia';
import { useState } from 'react';
import { View, ViewStyle } from 'react-native';
import { Look, lookMatrix } from '../domain/photoLook.ts';
import { colors } from './theme';

// Vorschau mit den Reglern, live auf der Grafikkarte gerechnet.
export function LookPreview({ uri, look, style }: { uri: string; look: Look; style?: ViewStyle }) {
  const image = useImage(uri);
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <View style={[{ backgroundColor: colors.line }, style]} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      {image && size.width > 0 && (
        <Canvas style={{ flex: 1 }}>
          <Image image={image} x={0} y={0} width={size.width} height={size.height} fit="cover">
            <ColorMatrix matrix={lookMatrix(look)} />
          </Image>
        </Canvas>
      )}
    </View>
  );
}
