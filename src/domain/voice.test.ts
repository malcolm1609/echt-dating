import { voiceClock } from './voice';

it('shows memo lengths as minutes and seconds', () => {
  expect(voiceClock(0)).toBe('0:00');
  expect(voiceClock(7400)).toBe('0:07');
  expect(voiceClock(60000)).toBe('1:00');
});
