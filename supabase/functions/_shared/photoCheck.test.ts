/** @jest-environment node */
import { judgePhoto, SightengineResult } from './photoCheck';

const clearFace = {
  x1: 0.3, y1: 0.2, x2: 0.6, y2: 0.55,
  attributes: {
    glasses: { sunglasses: 0.01, no_sunglasses: 0.99 },
    angle: { straight: 0.9, side: 0.1, back: 0 },
    filter: { true: 0.02, false: 0.98 },
    obstruction: { none: 0.95, light: 0.05, medium: 0, heavy: 0, extreme: 0, complete: 0 },
    quality: { perfect: 0.4, high: 0.5, medium: 0.1, low: 0 },
  },
};
const photo = (over: Partial<SightengineResult> = {}): SightengineResult => ({
  status: 'success',
  nudity: { sexual_activity: 0.01, sexual_display: 0.01, erotica: 0.01, very_suggestive: 0.02, suggestive: 0.05, none: 0.9 },
  type: { ai_generated: 0.02 },
  faces: [clearFace],
  artificial_faces: [],
  ...over,
});
const withAttr = (attributes: object) => ({ ...clearFace, attributes: { ...clearFace.attributes, ...attributes } });

describe('judgePhoto', () => {
  it('accepts a clear photo of one person', () => {
    expect(judgePhoto(photo())).toEqual({ ok: true, group: false });
  });

  it('marks photos with several people as group photos', () => {
    const friend = { ...clearFace, x1: 0.65, x2: 0.9 };
    expect(judgePhoto(photo({ faces: [clearFace, friend] }))).toEqual({ ok: true, group: true });
  });

  it('ignores tiny faces far in the background', () => {
    const stranger = { ...clearFace, y1: 0.1, y2: 0.13 };
    expect(judgePhoto(photo({ faces: [clearFace, stranger] }))).toEqual({ ok: true, group: false });
  });

  it('rejects nudity but allows beach photos', () => {
    expect(judgePhoto(photo({ nudity: { sexual_display: 0.9 } }))).toEqual({ ok: false, reason: 'nudity' });
    expect(judgePhoto(photo({ nudity: { very_suggestive: 0.85 } }))).toEqual({ ok: false, reason: 'nudity' });
    expect(judgePhoto(photo({ nudity: { suggestive: 0.9, very_suggestive: 0.3 } })).ok).toBe(true);
  });

  it('rejects AI images', () => {
    expect(judgePhoto(photo({ type: { ai_generated: 0.95 } }))).toEqual({ ok: false, reason: 'ai_generated' });
  });

  it('rejects photos without a face', () => {
    expect(judgePhoto(photo({ faces: [] }))).toEqual({ ok: false, reason: 'no_face' });
  });

  it('rejects faces that are not clearly visible', () => {
    const unclear = [
      { ...clearFace, y1: 0.5, y2: 0.57 },
      withAttr({ glasses: { sunglasses: 0.9, no_sunglasses: 0.1 } }),
      withAttr({ obstruction: { none: 0.1, heavy: 0.8 } }),
      withAttr({ angle: { back: 0.9 } }),
      withAttr({ quality: { low: 0.7, medium: 0.2, high: 0.1 } }),
    ];
    for (const f of unclear) expect(judgePhoto(photo({ faces: [f] }))).toEqual({ ok: false, reason: 'face_unclear' });
  });

  it('rejects strong filters', () => {
    expect(judgePhoto(photo({ faces: [withAttr({ filter: { true: 0.9, false: 0.1 } })] }))).toEqual({ ok: false, reason: 'filter' });
  });
});
