import { answerHint, GOALS, goalFit, INTERESTS, PROMPTS, PROMPT_CATEGORIES, sharedInterests, validateProfileContent, ProfileContent } from './profileContent.ts';

const byCategory = (c: string) => PROMPTS.find((p) => p.category === c)!.id;
const complete: ProfileContent = {
  prompts: PROMPT_CATEGORIES.map((c) => ({ promptId: byCategory(c.id), answer: 'Auf dem Markt am Maybachufer, danach Kaffee am Kanal.' })),
  goal: 'fest',
  interests: ['Kochen', 'Laufen'],
};

describe('prompt pool', () => {
  it('offers a small, curated choice in three categories', () => {
    expect(PROMPT_CATEGORIES.map((c) => c.id)).toEqual(['alltag', 'anknuepfen', 'werte']);
    expect(PROMPTS.length).toBeGreaterThanOrEqual(30);
    expect(PROMPTS.length).toBeLessThanOrEqual(40);
    expect(new Set(PROMPTS.map((p) => p.id)).size).toBe(PROMPTS.length);
  });

  it('has four clear relationship goals and a fixed interest list', () => {
    expect(GOALS.map((g) => g.label)).toEqual(['Feste Beziehung', 'Etwas Ernstes, ohne Eile', 'Offen, schauen, was entsteht', 'Erstmal Freundschaft']);
    expect(INTERESTS.length).toBeGreaterThanOrEqual(25);
  });
});

describe('validateProfileContent', () => {
  it('accepts one answer per category, a goal and up to five interests', () => {
    expect(validateProfileContent(complete)).toEqual({});
  });

  it('asks for a question in every category and a goal', () => {
    const errors = validateProfileContent({ prompts: [], interests: [] });
    expect(errors.alltag).toBe('Bitte wähle eine Frage und beantworte sie.');
    expect(errors.werte).toBe('Bitte wähle eine Frage und beantworte sie.');
    expect(errors.goal).toBe('Bitte wähle, was du suchst.');
  });

  it('wants a few words more than a one-liner and at most 160 characters', () => {
    const short = { ...complete, prompts: complete.prompts.map((p, i) => (i === 0 ? { ...p, answer: 'Kaffee.' } : p)) };
    expect(validateProfileContent(short).alltag).toBe('Ein paar Worte mehr, damit man anknüpfen kann.');
    const long = { ...complete, prompts: complete.prompts.map((p, i) => (i === 1 ? { ...p, answer: 'x'.repeat(161) } : p)) };
    expect(validateProfileContent(long).anknuepfen).toBe('Höchstens 160 Zeichen.');
  });

  it('rejects two questions from the same category or unknown questions', () => {
    const twice = { ...complete, prompts: [complete.prompts[0], { ...complete.prompts[0] }, complete.prompts[2]] };
    expect(validateProfileContent(twice).anknuepfen).toBeDefined();
    const unknown = { ...complete, prompts: [{ promptId: 'gibt-es-nicht', answer: 'Eine lange genug Antwort.' }, ...complete.prompts.slice(1)] };
    expect(validateProfileContent(unknown).alltag).toBeDefined();
  });

  it('checks an optional favourite song', () => {
    const music = { provider: 'spotify' as const, kind: 'track' as const, url: 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv', title: 'Bohemian Rhapsody' };
    expect(validateProfileContent({ ...complete, music })).toEqual({});
    expect(validateProfileContent({ ...complete, music: { ...music, title: '' } }).music).toBe('Wie heißt der Song oder die Playlist?');
  });

  it('limits interests to five from the list', () => {
    expect(validateProfileContent({ ...complete, interests: INTERESTS.slice(0, 6) }).interests).toBe('Höchstens 5 Interessen.');
    expect(validateProfileContent({ ...complete, interests: ['Raketenbau'] }).interests).toBeDefined();
  });
});

describe('answerHint', () => {
  it('nudges towards something concrete for empty phrases', () => {
    expect(answerHint('Ehrlich und authentisch sein.')).toBe('Magst du ein konkretes Beispiel nennen?');
    expect(answerHint('Spontan sein, reisen.')).toBe('Magst du ein konkretes Beispiel nennen?');
  });

  it('stays quiet for concrete answers', () => {
    expect(answerHint('Der Kiosk an der Admiralbrücke, um 7 Uhr ist es dort ganz still.')).toBeNull();
    expect(answerHint('')).toBeNull();
  });
});

describe('goalFit', () => {
  it('prefers people who want the same or something close', () => {
    expect(goalFit('fest', 'fest')).toBe(2);
    expect(goalFit('fest', 'ernst')).toBe(1);
    expect(goalFit('fest', 'freundschaft')).toBe(0);
    expect(goalFit(undefined, 'fest')).toBe(0);
  });
});

describe('sharedInterests', () => {
  it('lists what both like, in the other person’s order', () => {
    expect(sharedInterests(['Laufen', 'Kochen'], ['Kochen', 'Kino', 'Laufen'])).toEqual(['Kochen', 'Laufen']);
  });
});
