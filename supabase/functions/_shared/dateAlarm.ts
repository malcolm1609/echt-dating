// SMS-Texte für den Date-Check, ohne Deno- oder Node-spezifische APIs (geteilt mit Jest).

export type AlarmKind = 'overdue' | 'help' | 'clear';

export function alarmText(kind: AlarmKind, name: string, link: string): string {
  switch (kind) {
    case 'help':
      return `Echt-Alarm: ${name} hat beim Date um Hilfe gebeten. Ruf ${name} sofort an. Im Notfall 110. Standort: ${link}`;
    case 'overdue':
      return `Echt: ${name} hat sich beim Date nicht wie vereinbart gemeldet. Bitte ruf ${name} an. Im Notfall 110. Standort: ${link}`;
    case 'clear':
      return `Echt: Entwarnung. ${name} hat sich gemeldet, alles ist okay.`;
  }
}
