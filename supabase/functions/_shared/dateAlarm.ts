// SMS-Texte für den Date-Check, ohne Deno- oder Node-spezifische APIs (geteilt mit Jest).

export type AlarmKind = 'overdue' | 'help' | 'clear';

/** Nur Buchstaben, Leerzeichen, Bindestrich und Apostroph, damit niemand über den eigenen Namen fremden Text in die SMS schmuggelt. */
export const smsName = (name: string) => name.replace(/[^\p{L}\p{M} '-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 30) || 'Deine Begleitung';

export function alarmText(kind: AlarmKind, rawName: string, link: string): string {
  const name = smsName(rawName);
  switch (kind) {
    case 'help':
      return `Echt-Alarm: ${name} hat beim Date um Hilfe gebeten. Ruf ${name} sofort an. Im Notfall 110. Standort: ${link}`;
    case 'overdue':
      return `Echt: ${name} hat sich beim Date nicht wie vereinbart gemeldet. Bitte ruf ${name} an. Im Notfall 110. Standort: ${link}`;
    case 'clear':
      return `Echt: Entwarnung. ${name} hat sich gemeldet, alles ist okay.`;
  }
}
