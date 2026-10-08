import { averageRating, EventDraft, eventPrice, joinState, MeetupEvent, mutualPicks, seatsLeft, validateEvent } from './events.ts';

const host = { name: 'Jonas', events: 6, ratings: [5, 4, 5], reviews: ['Lockere Runde.'] };
const quiz: MeetupEvent = {
  id: 'quiz', title: 'Pub-Quiz', kind: 'Spiele', when: 'Donnerstag, 19:30', place: 'Kiezkneipe Lotte, Friedrichshain',
  seats: 12, joined: { f: 5, m: 6 }, price: 8, plusFirst: false, access: 'open', host,
};
const me = { joined: false, plus: false };

describe('events', () => {
  it('keeps half of the seats for each gender', () => {
    expect(seatsLeft(quiz, 'f')).toBe(1);
    expect(seatsLeft(quiz, 'm')).toBe(0);
  });

  it('lets you join only while your half has seats', () => {
    expect(joinState(quiz, 'f', me)).toBe('open');
    expect(joinState(quiz, 'm', me)).toBe('full');
    expect(joinState(quiz, 'm', { ...me, joined: true })).toBe('joined');
  });

  it('opens new events to Plus members first', () => {
    const early = { ...quiz, plusFirst: true };
    expect(joinState(early, 'f', me)).toBe('plus_first');
    expect(joinState(early, 'f', { ...me, plus: true })).toBe('open');
  });

  it('lets only invited people into invite events', () => {
    const invite = { ...quiz, access: 'invite' as const };
    expect(joinState(invite, 'f', me)).toBe('invite_only');
    expect(joinState(invite, 'f', { ...me, invited: true })).toBe('open');
  });

  it('pauses booking after two no-shows', () => {
    expect(joinState(quiz, 'f', { ...me, noShows: 1 })).toBe('open');
    expect(joinState(quiz, 'f', { ...me, noShows: 2 })).toBe('blocked');
  });

  it('gives Plus members 20 % off, free events stay free', () => {
    expect(eventPrice(quiz, false)).toBe(8);
    expect(eventPrice(quiz, true)).toBe(6.4);
    expect(eventPrice({ ...quiz, price: 0 }, true)).toBe(0);
  });

  it('averages host ratings, none for new hosts', () => {
    expect(averageRating(host)).toBe(4.7);
    expect(averageRating({ ...host, ratings: [] })).toBeNull();
  });

  it('checks a new event before it goes live', () => {
    const ok: EventDraft = { title: 'Bouldern', kind: 'Sport', place: 'Boulderhalle Kegel', when: 'Samstag, 14 Uhr', seats: 8, price: 15, access: 'open' };
    expect(validateEvent(ok)).toEqual({});
    expect(Object.keys(validateEvent({ ...ok, title: 'x', place: ' ', seats: 9, price: 80 })).sort()).toEqual(['place', 'price', 'seats', 'title']);
  });

  it('only matches people who picked each other', () => {
    expect(mutualPicks(['lena', 'kai'], ['lena', 'tom'])).toEqual(['lena']);
  });

  it('keeps campus events for verified students of that university', () => {
    const mensa: MeetupEvent = { ...quiz, campus: 'JLU Gießen' };
    expect(joinState(mensa, 'f', me)).toBe('campus_only');
    expect(joinState(mensa, 'f', { ...me, campus: 'THM' })).toBe('campus_only');
    expect(joinState(mensa, 'f', { ...me, campus: 'JLU Gießen' })).toBe('open');
  });

  it('lets small groups go out tonight', () => {
    const tonight: EventDraft = { title: 'Zur Semesterparty', kind: 'Feiern', place: 'Marktplatz', when: 'Heute, 22 Uhr', seats: 6, price: 0, access: 'open', tonight: true };
    expect(validateEvent(tonight)).toEqual({});
    expect(validateEvent({ ...tonight, seats: 12 }).seats).toBe('Wähle 4, 6 oder 8 Plätze.');
  });
});
