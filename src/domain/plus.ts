// Echt Plus: günstig, und nur Dinge, die beim echten Treffen helfen. Sicherheit kostet nie etwas.

export const PLUS_PRICE = '4,99 € im Monat';

export const PLUS_FEATURES = [
  { icon: 'map-pin', title: 'Date-Planer mit Reservierung', text: 'Orte in der Nähe, die zu euch beiden passen, mit Tischreservierung beim Partner.' },
  { icon: 'check-circle', title: 'Gelesen', text: 'Lesebestätigung, aber nur wenn ihr sie beide einschaltet.' },
  { icon: 'users', title: 'Events zuerst', text: 'Einen Tag früher anmelden und 20 % günstiger.' },
  { icon: 'sliders', title: 'Mehr Filter und Fragen', text: 'Zusätzliche Filter und weitere Profilfragen.' },
] as const;

export const ALWAYS_FREE = ['Ausweis- und Selfie-Prüfung', 'Date-Check-in für deine Sicherheit', 'Standort mit einer Vertrauensperson teilen', '6 Vorschläge pro Tag, Fragenrunde und Chat'];

/** Prozent Rabatt bei Partner-Cafés und -Bars für jedes Echt-Date, auch ohne Plus. */
export const PARTNER_DATE_DISCOUNT = 10;

export const readReceiptShown = (mine: boolean, theirs: boolean) => mine && theirs;
