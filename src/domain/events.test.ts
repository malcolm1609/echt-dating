import { eventPrice, joinState, MeetupEvent, seatsLeft } from './events.ts';

const quiz: MeetupEvent = {
  id: 'quiz', title: 'Pub-Quiz', kind: 'Quiz', when: 'Donnerstag, 19:30', place: 'Kiezkneipe Lotte, Friedrichshain',
  seats: 12, joined: { f: 5, m: 6 }, price: 8, plusFirst: false,
};

describe('events', () => {
  it('keeps half of the seats for each gender', () => {
    expect(seatsLeft(quiz, 'f')).toBe(1);
    expect(seatsLeft(quiz, 'm')).toBe(0);
  });

  it('lets you join only while your half has seats', () => {
    expect(joinState(quiz, 'f', { joined: false, plus: false })).toBe('open');
    expect(joinState(quiz, 'm', { joined: false, plus: false })).toBe('full');
    expect(joinState(quiz, 'm', { joined: true, plus: false })).toBe('joined');
  });

  it('opens new events to Plus members first', () => {
    const early = { ...quiz, plusFirst: true };
    expect(joinState(early, 'f', { joined: false, plus: false })).toBe('plus_first');
    expect(joinState(early, 'f', { joined: false, plus: true })).toBe('open');
  });

  it('gives Plus members 20 % off, free events stay free', () => {
    expect(eventPrice(quiz, false)).toBe(8);
    expect(eventPrice(quiz, true)).toBe(6.4);
    expect(eventPrice({ ...quiz, price: 0 }, true)).toBe(0);
  });
});
