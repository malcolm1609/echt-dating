// Fotoprüfung mit Sightengine (Modelle nudity-2.1, genai, face-analysis), ohne Deno- oder Node-spezifische APIs,
// damit Jest und die Edge Function sie teilen. Doku: https://sightengine.com/docs/face-analysis

export const SIGHTENGINE_MODELS = 'nudity-2.1,genai,face-analysis';

type Scores = Record<string, number>;

interface Face {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  attributes?: { glasses?: Scores; angle?: Scores; filter?: Scores; obstruction?: Scores; quality?: Scores };
}

export interface SightengineResult {
  status: string;
  nudity?: Scores;
  type?: { ai_generated?: number };
  faces?: Face[];
  artificial_faces?: Face[];
}

export type Rejection = 'nudity' | 'ai_generated' | 'no_face' | 'face_unclear' | 'filter';
export type Verdict = { ok: true; group: boolean } | { ok: false; reason: Rejection };

// Grenzwerte (0 bis 1). Bewusst eher streng; nach den ersten echten Fotos nachjustieren.
const LIMITS = {
  nudity: 0.5, // sexual_activity, sexual_display, erotica
  veryRevealing: 0.8, // very_suggestive (z. B. Unterwäsche); Badesachen am Strand bleiben erlaubt
  aiGenerated: 0.7,
  filter: 0.5,
  // Gesicht muss mindestens so hoch sein (Anteil der Bildhöhe), um als erkennbar zu gelten.
  clearFaceHeight: 0.1,
  // Kleinere Gesichter (Leute weit hinten) zählen nicht als weitere Person auf einem Gruppenfoto.
  groupFaceHeight: 0.06,
};

const score = (s: Scores | undefined, ...keys: string[]) => keys.reduce((sum, k) => sum + (s?.[k] ?? 0), 0);
const height = (f: Face) => f.y2 - f.y1;

function isClear(f: Face): boolean {
  const a = f.attributes ?? {};
  return height(f) >= LIMITS.clearFaceHeight
    && score(a.quality, 'perfect', 'high') >= 0.5
    && score(a.glasses, 'sunglasses') < 0.5
    && score(a.obstruction, 'heavy', 'extreme', 'complete') < 0.5
    && score(a.angle, 'back') < 0.5;
}

/** Entscheidet über ein Foto: erlaubt (und ob es ein Gruppenfoto ist) oder abgelehnt mit Grund. */
export function judgePhoto(r: SightengineResult): Verdict {
  const n = r.nudity ?? {};
  if (Math.max(n.sexual_activity ?? 0, n.sexual_display ?? 0, n.erotica ?? 0) >= LIMITS.nudity
      || (n.very_suggestive ?? 0) >= LIMITS.veryRevealing) {
    return { ok: false, reason: 'nudity' };
  }
  if ((r.type?.ai_generated ?? 0) >= LIMITS.aiGenerated) return { ok: false, reason: 'ai_generated' };

  const faces = r.faces ?? [];
  if (!faces.length) return { ok: false, reason: 'no_face' };
  if (faces.some((f) => score(f.attributes?.filter, 'true') >= LIMITS.filter)) return { ok: false, reason: 'filter' };
  if (!faces.some(isClear)) return { ok: false, reason: 'face_unclear' };

  const people = faces.filter((f) => height(f) >= LIMITS.groupFaceHeight).length;
  return { ok: true, group: people > 1 };
}
