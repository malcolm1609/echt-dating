import { applyLook, Look, meanLuma } from '../domain/photoLook.ts';

export function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('photo unreadable'));
    img.src = uri;
  });
}

/** Zeichnet das Foto in der gewünschten Größe und gibt die Pixel zurück. */
export function draw(img: HTMLImageElement, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, width, height);
  return { canvas, ctx, data: ctx.getImageData(0, 0, width, height) };
}

/** Mittlere Helligkeit des Fotos (0 bis 1), gemessen an einer kleinen Kopie. */
export async function photoBrightness(uri: string): Promise<number> {
  return meanLuma(draw(await loadImage(uri), 48, 60).data.data);
}

/** Rechnet die Einstellung fest ins Foto und speichert es als neues JPEG, ohne Zusatzdaten. */
export async function applyPhotoLook(uri: string, look: Look): Promise<string> {
  const img = await loadImage(uri);
  const { canvas, ctx, data } = draw(img, img.naturalWidth, img.naturalHeight);
  applyLook(data.data, look);
  ctx.putImageData(data, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) throw new Error('photo not saved');
  return URL.createObjectURL(blob);
}
