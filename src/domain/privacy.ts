// Datenschutzerklärung und Einwilligungen bei der Registrierung.
// Bei jeder inhaltlichen Änderung PRIVACY_VERSION auf das neue Datum setzen: Die Zustimmung wird je Fassung gespeichert.
// Der Text ist ein Entwurf und muss vor dem echten Start rechtlich geprüft werden.

export const PRIVACY_VERSION = '2026-10-09';

/** Verantwortlicher nach Art. 4 Nr. 7 DSGVO. Anschrift und Kontakt vor dem Start eintragen. */
export const CONTROLLER = {
  name: 'Malcolm Böhm',
  address: '[Anschrift wird vor dem Start ergänzt]',
  email: '[E-Mail für Datenschutz wird vor dem Start ergänzt]',
};

export type ConsentKind = 'privacy' | 'sensitive_data';

/** Was man bei der Registrierung ankreuzt. Beide Häkchen sind Pflicht, ohne sie funktioniert Echt nicht. */
export const CONSENTS: { kind: ConsentKind; text: string }[] = [
  { kind: 'privacy', text: 'Ich habe die Datenschutzerklärung gelesen und bin mindestens 18 Jahre alt.' },
  {
    kind: 'sensitive_data',
    text:
      'Ich willige ausdrücklich ein, dass Echt Angaben zu meinem Liebesleben und meiner sexuellen Orientierung (wen ich suche) ' +
      'sowie mein Ausweis- und Selfie-Abgleich verarbeitet, um mich zu prüfen und mir passende Menschen vorzuschlagen. ' +
      'Ich kann das jederzeit widerrufen, indem ich mein Konto lösche.',
  },
];

export interface PrivacySection { title: string; body: string[] }

export const PRIVACY_POLICY: PrivacySection[] = [
  {
    title: 'Wer verantwortlich ist',
    body: [
      `${CONTROLLER.name}, ${CONTROLLER.address}. Kontakt für alle Fragen zum Datenschutz: ${CONTROLLER.email}.`,
      'Echt ist eine Dating-App für Menschen ab 18 Jahren. Wir verkaufen keine Daten und zeigen keine Werbung.',
    ],
  },
  {
    title: 'Welche Daten wir verarbeiten',
    body: [
      'Konto: E-Mail-Adresse und Handynummer, damit du dich anmelden kannst und jede Person nur ein Konto hat.',
      'Profil: Vorname, Geburtsdatum, Geschlecht, wen du suchst, Fotos, Antworten auf Profilfragen, Beziehungsziel, Interessen und auf Wunsch ein Lieblingssong.',
      'Standort: dein ungefährer Standort per GPS, damit wir dir Menschen in deiner Nähe vorschlagen. Andere sehen nur die Entfernung, nie deinen genauen Ort.',
      'Prüfung: Bei der Ausweis- und Selfie-Prüfung gleicht unser Anbieter dein Ausweisfoto mit einem Live-Selfie ab. Wir erhalten nur das Ergebnis (bestanden oder nicht), keine Kopie deines Ausweises.',
      'Nutzung: deine Entscheidungen bei den Vorschlägen, Matches, Antworten in der Fragenrunde, Nachrichten, Verabredungen, Treffen und Events, Meldungen und Blockierungen sowie wann du zuletzt aktiv warst.',
    ],
  },
  {
    title: 'Besonders geschützte Daten',
    body: [
      'Aus deinem Geschlecht und wen du suchst lässt sich deine sexuelle Orientierung ablesen. Der Ausweis- und Selfie-Abgleich nutzt biometrische Merkmale. Beides sind besondere Kategorien nach Art. 9 DSGVO.',
      'Wir verarbeiten sie nur mit deiner ausdrücklichen Einwilligung (Art. 9 Abs. 2 lit. a DSGVO), die du bei der Registrierung gibst. Du kannst sie jederzeit widerrufen, indem du dein Konto löschst. Die Verarbeitung bis dahin bleibt rechtmäßig.',
    ],
  },
  {
    title: 'Wofür und auf welcher Grundlage',
    body: [
      'Damit Echt funktioniert, also für Anmeldung, Prüfung, Vorschläge, Matches, Chat und Treffen: Vertrag (Art. 6 Abs. 1 lit. b DSGVO) und deine Einwilligung (Art. 6 Abs. 1 lit. a, Art. 9 Abs. 2 lit. a DSGVO).',
      'Für Sicherheit, also gegen Fake-Profile, Spam und Belästigung, und um Meldungen zu bearbeiten: berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO).',
      'Vorschläge entstehen nach festen Regeln (Entfernung, Alter, gemeinsame Interessen, Aktivität). Es gibt kein Bewertungssystem für Attraktivität und keine automatisierte Entscheidung, die dich rechtlich betrifft.',
    ],
  },
  {
    title: 'Wer Daten von uns bekommt',
    body: [
      'Supabase (Datenbank, Anmeldung, Fotospeicher): Die Server stehen in Frankfurt am Main. Supabase ist ein US-Unternehmen; der Vertrag zur Auftragsverarbeitung enthält die EU-Standardvertragsklauseln.',
      'Didit (Ausweis- und Selfie-Prüfung): verarbeitet Ausweis und Selfie in unserem Auftrag und meldet uns nur das Ergebnis.',
      'Ein SMS-Anbieter verschickt den Bestätigungscode an deine Handynummer.',
      'Die Web-Version liegt bei GitHub Pages (GitHub, USA). Beim Aufruf verarbeitet GitHub deine IP-Adresse, um die Seite auszuliefern.',
      'Andere Mitglieder sehen dein Profil mit Vorname, Alter, Entfernung, Fotos und Profilinhalten, aber nie E-Mail, Handynummer oder genauen Standort.',
    ],
  },
  {
    title: 'Links zu anderen Diensten',
    body: [
      'Trägst du einen Spotify-Link ein, fragen wir bei Spotify den Songtitel ab. Tippst du auf einen Song oder auf „Route“ zu einem Treffpunkt, öffnet sich Spotify, Apple Music, Google Maps, Apple Karten oder Waze. Ab dann gelten deren Datenschutzbestimmungen.',
    ],
  },
  {
    title: 'Cookies und Speicher auf deinem Gerät',
    body: [
      'Echt setzt keine Cookies für Werbung oder Statistik und nutzt keine Analyse- oder Tracking-Dienste.',
      'Auf deinem Gerät speichern wir nur deine Anmeldung (in der Web-Version im Speicher des Browsers), damit du angemeldet bleibst. Das ist technisch notwendig (§ 25 Abs. 2 Nr. 2 TDDDG) und braucht keine Einwilligung. Beim Abmelden wird es gelöscht.',
    ],
  },
  {
    title: 'Wie lange wir Daten speichern',
    body: [
      'Solange du ein Konto hast. Wer 14 Tage nicht aktiv war, wird pausiert, die Daten bleiben aber erhalten, bis du dein Konto löschst.',
      'Löschst du dein Konto in den Einstellungen, löschen wir sofort alle Daten dazu: Profil, Fotos, Matches, Nachrichten und deine Einwilligungen. Sicherungskopien beim Hosting-Anbieter werden nach Ablauf ihrer Aufbewahrungsfrist überschrieben.',
    ],
  },
  {
    title: 'Deine Rechte',
    body: [
      'Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15 bis 21 DSGVO) sowie auf Widerruf deiner Einwilligung. Schreib uns dazu an die oben genannte Adresse.',
      'Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel bei der deines Wohnorts.',
    ],
  },
];
