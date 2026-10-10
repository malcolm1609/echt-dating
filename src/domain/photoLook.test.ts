import { applyLook, isOriginal, lookMatrix, meanLuma, ORIGINAL, stepLabel, suggestLook } from './photoLook.ts';

const identity = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

describe('photo look', () => {
  it('leaves the original untouched', () => {
    expect(isOriginal(ORIGINAL)).toBe(true);
    expect(lookMatrix(ORIGINAL).map((v) => v + 0)).toEqual(identity);
    const px = new Uint8ClampedArray([10, 120, 250, 255]);
    applyLook(px, ORIGINAL);
    expect([...px]).toEqual([10, 120, 250, 255]);
  });

  it('brightens, adds contrast and warms within set limits', () => {
    const px = new Uint8ClampedArray([100, 100, 100, 255]);
    applyLook(px, { brightness: 10, contrast: 0, warmth: 0 });
    expect(px[0]).toBe(200);
    const c = new Uint8ClampedArray([64, 128, 192, 255]);
    applyLook(c, { brightness: 0, contrast: 10, warmth: 0 });
    expect([c[0], c[1], c[2]]).toEqual([39, 128, 218]);
    const w = new Uint8ClampedArray([128, 128, 128, 255]);
    applyLook(w, { brightness: 0, contrast: 0, warmth: 10 });
    expect(w[0]).toBeGreaterThan(w[1]);
    expect(w[2]).toBeLessThan(w[1]);
    expect(w[3]).toBe(255);
  });

  it('ignores values outside the slider range', () => {
    expect(lookMatrix({ brightness: 99, contrast: 0, warmth: 0 })).toEqual(lookMatrix({ brightness: 10, contrast: 0, warmth: 0 }));
  });

  it('only suggests something for clearly dark or bright photos', () => {
    expect(meanLuma([255, 255, 255, 255, 0, 0, 0, 255])).toBeCloseTo(0.5);
    expect(suggestLook(0.5)).toBeNull();
    const dark = suggestLook(0.2)!;
    expect(dark.action).toBe('Aufhellen');
    expect(dark.look.brightness).toBeGreaterThan(0);
    expect(dark.look.brightness).toBeLessThanOrEqual(8);
    expect(suggestLook(0.85)!.look.brightness).toBeLessThan(0);
  });

  it('labels slider steps', () => {
    expect(stepLabel(0)).toBe('Original');
    expect(stepLabel(3)).toBe('+3');
    expect(stepLabel(-2)).toBe('−2');
  });
});
