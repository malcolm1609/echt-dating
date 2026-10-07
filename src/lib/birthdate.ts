// Geburtsdatum wird deutsch getippt (TT.MM.JJJJ), die Punkte setzt die App selbst.
export function maskBirthdate(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('.');
}

export function toIsoDate(german: string): string {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(german);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : german;
}
