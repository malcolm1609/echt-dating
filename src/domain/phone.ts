// Handynummer als zweite Prüfung neben der E-Mail: eine Nummer gehört genau zu einem Konto.
// Ohne Ländervorwahl gehen wir von Deutschland aus. Festnetz kann keine SMS empfangen.
export function normalizePhone(input: string): string | null {
  const s = input.trim().replace(/[\s()\-/.]/g, '');
  const intl = s.startsWith('+') ? s.slice(1) : s.startsWith('00') ? s.slice(2) : s.startsWith('0') ? `49${s.slice(1)}` : `49${s}`;
  if (!/^\d+$/.test(intl)) return null;
  if (intl.startsWith('49')) return /^1[5-7]\d{8,9}$/.test(intl.slice(2)) ? `+${intl}` : null;
  return intl.length >= 8 && intl.length <= 15 ? `+${intl}` : null;
}

export function maskPhone(e164: string): string {
  const head = e164.startsWith('+49') ? `+49 ${e164.slice(3, 6)}` : e164.slice(0, 5);
  return `${head} ••• ••${e164.slice(-2)}`;
}

export function formatPhone(e164: string): string {
  return e164.startsWith('+49') ? `+49 ${e164.slice(3, 6)} ${e164.slice(6)}` : e164;
}
