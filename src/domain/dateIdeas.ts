/** Ideen fürs erste Treffen: an einem öffentlichen Ort, kurz und ohne viel Druck. */
export const DATE_IDEAS: Record<string, string> = {
  Kochen: 'Über einen Streetfood-Markt schlendern',
  Backen: 'Die beste Zimtschnecke der Stadt suchen',
  Kaffee: 'Kaffee in einer kleinen Rösterei',
  Wein: 'Ein Glas Wein in einer Weinbar',
  Laufen: 'Eine lockere Runde zusammen laufen',
  Radfahren: 'Kurze Radtour mit Pause am Wasser',
  Wandern: 'Spaziergang durch einen Park',
  Klettern: 'Bouldern für Anfänger',
  Yoga: 'Yoga im Park, danach ein Tee',
  Schwimmen: 'Ins Freibad oder an den See',
  Fußball: 'Ein Spiel in einer Kneipe schauen',
  Tanzen: 'Eine Probestunde im Tanzkurs',
  Konzerte: 'Ein kleines Konzert',
  Theater: 'Ins Theater, danach etwas trinken',
  Kino: 'Ins Kino und danach darüber reden',
  Serien: 'Pub-Quiz zu Filmen und Serien',
  Lesen: 'Zusammen durch einen Buchladen stöbern',
  Podcasts: 'Eine Live-Podcast-Aufnahme besuchen',
  'Musik machen': 'Ein Open-Mic-Abend',
  Fotografie: 'Fotospaziergang durchs Viertel',
  'Kunst & Museen': 'Eine Ausstellung anschauen',
  Brettspiele: 'Ein Abend im Spielecafé',
  Gaming: 'Eine Retro-Arcade-Bar',
  Reisen: 'Essen aus einem Land, in das ihr beide wollt',
  Camping: 'Picknick im Grünen',
  Gärtnern: 'Durch den Botanischen Garten',
  Tiere: 'Spaziergang durch den Tierpark',
  Ehrenamt: 'Zusammen bei einer Aufräumaktion mitmachen',
  Politik: 'Ein Vortrag oder eine Lesung',
  Wissenschaft: 'Ein Abend im Planetarium',
  'Sprachen lernen': 'Ein Sprachcafé',
  Flohmärkte: 'Über den Flohmarkt schlendern',
};

export const FALLBACK_IDEAS = ['Kaffee trinken', 'Spaziergang mit Eis', 'Ein Drink nach der Arbeit'];
const MAX_IDEAS = 3;

export const dateIdeas = (shared: string[]) =>
  [...shared.map((i) => DATE_IDEAS[i]).filter(Boolean), ...FALLBACK_IDEAS].slice(0, MAX_IDEAS);
