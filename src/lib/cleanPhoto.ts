import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_WIDTH = 1440;

/**
 * Speichert ein gewähltes Foto neu als JPEG. Dabei fallen alle versteckten Zusatzdaten weg, vor allem der
 * GPS-Ort, an dem das Foto aufgenommen wurde (die Fotos sind für alle sichtbar, die das Profil sehen).
 * Große Bilder werden nebenbei auf 1440 px Breite verkleinert.
 */
export async function cleanPhoto(uri: string, width?: number): Promise<{ uri: string; mimeType: string }> {
  const context = ImageManipulator.manipulate(uri);
  if (!width || width > MAX_WIDTH) context.resize({ width: MAX_WIDTH });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return { uri: saved.uri, mimeType: 'image/jpeg' };
}
