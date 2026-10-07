// Profilinhalt nach der Recherche vom 2026-10-07 (recherche/reports/Profilelemente für Echt.md):
// drei Fragen aus je einer Kategorie, ein Beziehungsziel, bis zu fünf Interessen.
// Fragen zielen auf Konkretes (Ort, Erlebnis, Empfehlung), nicht auf Witz.

export type PromptCategory = 'alltag' | 'anknuepfen' | 'werte';
export type GoalId = 'fest' | 'ernst' | 'offen' | 'freundschaft';

export const PROMPT_MIN = 15;
export const PROMPT_MAX = 160;
export const INTEREST_MAX = 5;

export const PROMPT_CATEGORIES: { id: PromptCategory; title: string }[] = [
  { id: 'alltag', title: 'Dein Alltag' },
  { id: 'anknuepfen', title: 'Etwas zum Anknüpfen' },
  { id: 'werte', title: 'Was dir wichtig ist' },
];

const pool: Record<PromptCategory, string[]> = {
  alltag: [
    'Ein ganz normaler Sonntag bei mir sieht so aus …',
    'Nach einem langen Tag hilft mir …',
    'Mein Lieblingsort in meiner Stadt ist …',
    'Was bei mir gerade oft auf dem Herd steht …',
    'Ich vergesse die Zeit, wenn ich …',
    'Ein kleines Ritual, das ich nicht aufgebe …',
    'Am Wochenende findet man mich oft …',
    'Darüber kann ich stundenlang reden …',
    'Zuletzt richtig gelacht habe ich über …',
    'Mein Morgen beginnt mit …',
  ],
  anknuepfen: [
    'Ein Ort in meiner Stadt, den ich dir zeigen würde …',
    'Das Buch, die Serie oder der Podcast, den ich gerade empfehle …',
    'Das beste Essen, das ich dieses Jahr hatte …',
    'Etwas, das ich gerade lerne …',
    'Eine Reise, die mich verändert hat …',
    'Ein Abend, den ich nicht vergesse …',
    'Frag mich gern nach …',
    'Der Song, den ich gerade in Dauerschleife höre …',
    'Mit dir würde ich gern einmal …',
    'Das Letzte, was mich richtig begeistert hat …',
  ],
  werte: [
    'Woran ich merke, dass ich mich bei jemandem wohlfühle …',
    'In einer Beziehung ist mir wichtig, dass …',
    'Was ich von meinen Freunden gelernt habe …',
    'Ich bin gerade dankbar für …',
    'Dabei mache ich keine Kompromisse …',
    'So zeige ich, dass mir jemand wichtig ist …',
    'Was ich mir für die nächsten Jahre vornehme …',
    'Meine Meinung geändert habe ich über …',
    'Ein guter Streit ist für mich …',
    'Zu Hause fühle ich mich, wenn …',
  ],
};

export const PROMPTS: { id: string; category: PromptCategory; text: string }[] = (Object.keys(pool) as PromptCategory[]).flatMap((category) =>
  pool[category].map((text, i) => ({ id: `${category}-${i + 1}`, category, text })),
);

export const promptText = (id: string) => PROMPTS.find((p) => p.id === id)?.text;

export const GOALS: { id: GoalId; label: string }[] = [
  { id: 'fest', label: 'Feste Beziehung' },
  { id: 'ernst', label: 'Etwas Ernstes, ohne Eile' },
  { id: 'offen', label: 'Offen, schauen, was entsteht' },
  { id: 'freundschaft', label: 'Erstmal Freundschaft' },
];

export const goalLabel = (id?: GoalId) => GOALS.find((g) => g.id === id)?.label;

export const INTERESTS = [
  'Kochen', 'Backen', 'Kaffee', 'Wein', 'Laufen', 'Radfahren', 'Wandern', 'Klettern', 'Yoga', 'Schwimmen',
  'Fußball', 'Tanzen', 'Konzerte', 'Theater', 'Kino', 'Serien', 'Lesen', 'Podcasts', 'Musik machen', 'Fotografie',
  'Kunst & Museen', 'Brettspiele', 'Gaming', 'Reisen', 'Camping', 'Gärtnern', 'Tiere', 'Ehrenamt', 'Politik', 'Wissenschaft',
  'Sprachen lernen', 'Flohmärkte',
];

export interface PromptAnswer {
  promptId: string;
  answer: string;
}

export interface ProfileContent {
  prompts: PromptAnswer[];
  goal?: GoalId;
  interests: string[];
}

export type ProfileContentErrors = Partial<Record<PromptCategory | 'goal' | 'interests', string>>;

export function validateProfileContent(c: ProfileContent): ProfileContentErrors {
  const errors: ProfileContentErrors = {};
  for (const { id } of PROMPT_CATEGORIES) {
    const answers = c.prompts.filter((p) => PROMPTS.find((x) => x.id === p.promptId)?.category === id);
    const answer = answers[0]?.answer.trim() ?? '';
    if (answers.length !== 1 || !answer) errors[id] = 'Bitte wähle eine Frage und beantworte sie.';
    else if (answer.length < PROMPT_MIN) errors[id] = 'Ein paar Worte mehr, damit man anknüpfen kann.';
    else if (answer.length > PROMPT_MAX) errors[id] = `Höchstens ${PROMPT_MAX} Zeichen.`;
  }
  if (!c.goal || !goalLabel(c.goal)) errors.goal = 'Bitte wähle, was du suchst.';
  if (c.interests.length > INTEREST_MAX) errors.interests = `Höchstens ${INTEREST_MAX} Interessen.`;
  else if (c.interests.some((i) => !INTERESTS.includes(i))) errors.interests = 'Bitte nur Interessen aus der Liste.';
  return errors;
}

const EMPTY_PHRASES = ['ehrlich', 'authentisch', 'spontan', 'humor', 'reisen', 'glücklich sein', 'offen für alles', 'das leben genießen', 'abenteuer'];

/** Leiser Hinweis bei Floskeln. Schreibt nichts um, die Antwort bleibt die eigene. */
export function answerHint(answer: string): string | null {
  const a = answer.trim().toLowerCase();
  if (!a) return null;
  const phrases = EMPTY_PHRASES.filter((p) => a.includes(p)).length;
  return phrases > 0 && a.length < 60 ? 'Magst du ein konkretes Beispiel nennen?' : null;
}

const GOAL_ORDER: GoalId[] = ['fest', 'ernst', 'offen', 'freundschaft'];

/** 2 = gleiches Ziel, 1 = nah dran, 0 = passt kaum. Bestimmt die Reihenfolge der Tagesvorschläge. */
export function goalFit(a?: GoalId, b?: GoalId): number {
  if (!a || !b) return 0;
  return Math.max(0, 2 - Math.abs(GOAL_ORDER.indexOf(a) - GOAL_ORDER.indexOf(b)));
}

export const sharedInterests = (mine: string[], theirs: string[]) => theirs.filter((i) => mine.includes(i));
