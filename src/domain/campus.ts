// Campus: Wer eine Uni-Mail bestätigt, sieht zusätzlich Events nur für die eigene Hochschule. Freiwillig, kein Muss.
const UNIS: [string, string][] = [
  ['uni-giessen.de', 'JLU Gießen'],
  ['thm.de', 'THM'],
  ['uni-marburg.de', 'Uni Marburg'],
  ['uni-frankfurt.de', 'Goethe-Uni Frankfurt'],
  ['tu-darmstadt.de', 'TU Darmstadt'],
  ['fu-berlin.de', 'FU Berlin'],
  ['hu-berlin.de', 'HU Berlin'],
  ['tu-berlin.de', 'TU Berlin'],
];

/** Hochschule zur Mailadresse, auch für Unterdomains wie students.uni-giessen.de; sonst null. */
export function uniFromEmail(email: string): string | null {
  const domain = email.trim().toLowerCase().match(/^[^@\s]+@([a-z0-9.-]+\.[a-z]{2,})$/)?.[1];
  if (!domain) return null;
  return UNIS.find(([d]) => domain === d || domain.endsWith(`.${d}`))?.[1] ?? null;
}
