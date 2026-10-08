import { readReceiptShown } from './plus.ts';

describe('readReceiptShown', () => {
  it('shows "Gelesen" only when both people turned it on', () => {
    expect(readReceiptShown(true, true)).toBe(true);
    expect(readReceiptShown(true, false)).toBe(false);
    expect(readReceiptShown(false, true)).toBe(false);
  });
});
