import { AlphaType, ColorType, ImageFormat, Skia, SkImage } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import { Look, lookMatrix, meanLuma } from '../domain/photoLook.ts';

async function load(uri: string): Promise<SkImage> {
  const image = Skia.Image.MakeImageFromEncoded(await Skia.Data.fromURI(uri));
  if (!image) throw new Error('photo unreadable');
  return image;
}

/** Mittlere Helligkeit des Fotos (0 bis 1), gemessen an einer kleinen Kopie. */
export async function photoBrightness(uri: string): Promise<number> {
  const image = await load(uri);
  const [w, h] = [48, 60];
  const surface = Skia.Surface.Make(w, h);
  if (!surface) return 0.5;
  surface.getCanvas().drawImageRect(image, Skia.XYWHRect(0, 0, image.width(), image.height()), Skia.XYWHRect(0, 0, w, h), Skia.Paint());
  surface.flush();
  const pixels = surface.makeImageSnapshot().readPixels(0, 0, { width: w, height: h, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul });
  return pixels ? meanLuma(pixels) : 0.5;
}

/** Rechnet die Einstellung fest ins Foto und speichert es als neues JPEG, ohne Zusatzdaten. */
export async function applyPhotoLook(uri: string, look: Look): Promise<string> {
  const image = await load(uri);
  const surface = Skia.Surface.Make(image.width(), image.height());
  if (!surface) throw new Error('photo too large');
  const paint = Skia.Paint();
  paint.setColorFilter(Skia.ColorFilter.MakeMatrix(lookMatrix(look)));
  surface.getCanvas().drawImage(image, 0, 0, paint);
  surface.flush();
  const file = new File(Paths.cache, `echt-${Date.now().toString(36)}.jpg`);
  file.write(surface.makeImageSnapshot().encodeToBytes(ImageFormat.JPEG, 90));
  return file.uri;
}
