// Melden und Blockieren. Melden blockiert immer mit; ab 3 offenen Meldungen wird jemand gesperrt
// (siehe activity.ts). Die Gründe müssen zu report_user() in der Datenbank passen.

export const REPORT_REASONS = [
  { id: 'fake', label: 'Fake-Profil oder nicht echt' },
  { id: 'harassment', label: 'Belästigung oder Drohung' },
  { id: 'inappropriate', label: 'Unangemessene Inhalte' },
  { id: 'spam', label: 'Spam oder Werbung' },
  { id: 'underage', label: 'Wirkt minderjährig' },
  { id: 'other', label: 'Etwas anderes' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['id'];

/** Zahl für die Tab-Leiste: Matches mit etwas Neuem, beendete zählen nicht. */
export const unreadCount = (matches: { unread?: boolean; ended: boolean }[]) =>
  matches.filter((m) => m.unread && !m.ended).length;
