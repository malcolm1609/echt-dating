// Foto-Regler: Standard ist immer das Original. Helligkeit, Kontrast und Wärme stellt man freiwillig ein,
// die App schlägt bei zu dunklen oder zu hellen Fotos nur etwas vor. Die Bereiche bleiben bewusst
// klein, damit das Bild wie ein Foto aussieht und nicht wie ein Filter.

export interface Look {
  brightness: number;
  contrast: number;
  warmth: number;
}

/** Jeder Regler geht in ganzen Schritten von -LOOK_STEPS bis +LOOK_STEPS. */
export const LOOK_STEPS = 10;
export const ORIGINAL: Look = { brightness: 0, contrast: 0, warmth: 0 };

export const isOriginal = (l: Look) => l.brightness === 0 && l.contrast === 0 && l.warmth === 0;

const clampStep = (v: number) => Math.max(-LOOK_STEPS, Math.min(LOOK_STEPS, Math.round(v)));

/**
 * 4x5-Farbmatrix (Zeile für Zeile, Verschiebung in der 5. Spalte im Bereich 0 bis 1), wie Skia sie nimmt.
 * Erst Helligkeit (Verstärkung), dann Kontrast um die Mitte, zuletzt Wärme (Rot etwas rauf, Blau etwas runter).
 */
export function lookMatrix(l: Look): number[] {
  const b = clampStep(l.brightness);
  const gain = b >= 0 ? 1 + 0.1 * b : 1 + 0.05 * b; // wie eine Blende: bis doppelt so hell oder halb so hell
  const k = 1 + 0.04 * clampStep(l.contrast); // bis ±40 %
  const w = 0.01 * clampStep(l.warmth); // bis ±10 % zwischen Rot und Blau
  const row = (f: number, i: number) => {
    const r = [0, 0, 0, 0, f * 0.5 * (1 - k)];
    r[i] = f * k * gain;
    return r;
  };
  return [...row(1 + w, 0), ...row(1, 1), ...row(1 - w, 2), 0, 0, 0, 1, 0];
}

/** Wendet die Matrix auf RGBA-Pixel an (Browser), direkt im übergebenen Speicher. */
export function applyLook(pixels: Uint8ClampedArray, l: Look): void {
  const m = lookMatrix(l);
  const [sr, or] = [m[0], m[4] * 255];
  const [sg, og] = [m[6], m[9] * 255];
  const [sb, ob] = [m[12], m[14] * 255];
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = pixels[i] * sr + or;
    pixels[i + 1] = pixels[i + 1] * sg + og;
    pixels[i + 2] = pixels[i + 2] * sb + ob;
  }
}

/** Mittlere Helligkeit von RGBA-Pixeln, 0 = schwarz, 1 = weiß. */
export function meanLuma(pixels: ArrayLike<number>): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i + 2 < pixels.length; i += 4) {
    sum += 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
    n++;
  }
  return n ? sum / n / 255 : 0.5;
}

export interface Suggestion {
  text: string;
  action: string;
  look: Look;
}

/** Vorschlag nur, wenn das Foto deutlich zu dunkel oder zu hell ist; sonst bleibt es beim Original. */
export function suggestLook(luma: number): Suggestion | null {
  if (luma < 0.3) {
    // So weit aufhellen, dass die Mitte etwa bei 0,42 liegt, aber nie mehr als +8.
    const brightness = Math.max(2, Math.min(8, Math.round((0.42 / Math.max(luma, 0.05) - 1) / 0.1)));
    return { text: 'Etwas dunkel geworden. Soll ich es aufhellen?', action: 'Aufhellen', look: { brightness, contrast: Math.round(brightness / 3), warmth: 0 } };
  }
  if (luma > 0.75) return { text: 'Etwas hell geworden. Soll ich es abdunkeln?', action: 'Abdunkeln', look: { brightness: -3, contrast: 1, warmth: 0 } };
  return null;
}

/** Text neben dem Regler, z. B. „+3“ oder „Original“. */
export const stepLabel = (v: number) => (v === 0 ? 'Original' : v > 0 ? `+${v}` : `−${-v}`);
