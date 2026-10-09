// Gründe, aus denen die Fotoprüfung (supabase/functions/photo-check) oder das Profil ein Foto ablehnt.
const TEXT: Record<string, string> = {
  nudity: 'Nacktfotos und sehr freizügige Fotos sind nicht erlaubt.',
  ai_generated: 'Das Foto sieht nach KI aus. Bitte nimm ein echtes Foto von dir.',
  no_face: 'Auf dem Foto ist kein Gesicht zu sehen. Auf jedem Foto muss man dich erkennen.',
  face_unclear: 'Dein Gesicht ist nicht klar zu erkennen. Bitte ohne Sonnenbrille, nicht verdeckt, scharf und nicht zu klein.',
  filter: 'Bitte ohne starken Filter. Man soll dich so sehen, wie du wirklich aussiehst.',
  too_many_groups: 'Du hast schon ein Gruppenfoto. Mehr als eins geht nicht.',
  group_main: 'Ein Gruppenfoto kann nicht dein Hauptfoto sein.',
  unavailable: 'Die Fotoprüfung ist gerade nicht erreichbar. Bitte versuch es später noch einmal.',
};

export class PhotoRejected extends Error {
  constructor(readonly reason: string) {
    super(reason);
  }
}

/** Verständlicher Hinweis für ein abgelehntes Foto, sonst null. */
export function photoErrorText(e: unknown): string | null {
  if (e instanceof PhotoRejected) return TEXT[e.reason] ?? TEXT.unavailable;
  const message = (e as { message?: string } | null)?.message ?? '';
  if (message.includes('too many group photos')) return TEXT.too_many_groups;
  if (message.includes('main photo is a group photo')) return TEXT.group_main;
  return null;
}
