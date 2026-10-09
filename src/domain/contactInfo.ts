// Keine Werbung fürs eigene Social Media im Profil (Malcolm, 2026-10-09): @-Namen, Links, Plattform plus
// Benutzername, „folgt mir“ und Handynummern sind in Name, „Über mich“ und den Antworten nicht erlaubt.
// Im Chat nach einem Match bleibt das frei. Gleiche Muster wie has_contact_info() in der Datenbank.

const PATTERNS: RegExp[] = [
  /@[\p{L}\p{N}_.]{2,}/u,
  /https?:\/\/|www\.|\b(?:t\.me|wa\.me|linktr\.ee)\b/i,
  /\b[a-z0-9-]{2,}\.(?:com|de|net|org|io|me|ly|gg|tv|app|link|bio|eu|info|co)\b/i,
  /\b(?:insta(?:gram)?|ig|snap(?:chat)?|sc|tik ?tok|tt|onlyfans|of|telegram|tg|discord|dc|twitter|twitch|fansly)\s*[:=]\s*\S/i,
  /\b(?:insta(?:gram)?|snap(?:chat)?|tik ?tok|onlyfans|telegram|discord|twitch|fansly)\s+(?:(?:ist|is)\s+)?[\p{L}\p{N}]*[._\d][\p{L}\p{N}._]*/iu,
  /\b(?:follow (?:me|mir)|folg(?:t|e)? mir|add (?:me|mich)|adde? mich)\b/i,
  /(?:\+|\b0)\d(?:[ /-]?\d){6,}/,
];

export const hasContactInfo = (text: string) => PATTERNS.some((p) => p.test(text));

export const CONTACT_INFO_ERROR = 'Bitte keine Social-Media-Namen, Links oder Handynummern im Profil. Das könnt ihr nach einem Match im Chat austauschen.';
