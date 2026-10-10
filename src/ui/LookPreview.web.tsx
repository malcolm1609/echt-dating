import { useEffect, useRef, useState } from 'react';
import { Image, View, ViewStyle } from 'react-native';
import { applyLook, Look } from '../domain/photoLook.ts';
import { draw, loadImage } from '../lib/photoLook.web';
import { colors } from './theme';

const WIDTH = 480;

// Vorschau im Browser: eine kleine Kopie des Fotos, bei jeder Änderung neu gerechnet.
export function LookPreview({ uri, look, style }: { uri: string; look: Look; style?: ViewStyle }) {
  const base = useRef<ReturnType<typeof draw>>(null);
  const [shown, setShown] = useState<string>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    loadImage(uri).then((img) => {
      if (!alive) return;
      const width = Math.min(WIDTH, img.naturalWidth);
      base.current = draw(img, width, Math.round((img.naturalHeight / img.naturalWidth) * width));
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [uri]);

  useEffect(() => {
    const b = base.current;
    if (!ready || !b) return;
    const frame = requestAnimationFrame(() => {
      const copy = new ImageData(new Uint8ClampedArray(b.data.data), b.data.width, b.data.height);
      applyLook(copy.data, look);
      b.ctx.putImageData(copy, 0, 0);
      setShown(b.canvas.toDataURL('image/jpeg', 0.9));
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, look.brightness, look.contrast, look.warmth]);

  return (
    <View style={[{ backgroundColor: colors.line, overflow: 'hidden' }, style]}>
      {shown && <Image source={{ uri: shown }} resizeMode="cover" style={{ flex: 1 }} />}
    </View>
  );
}
