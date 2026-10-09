// Gemeinsame Antworten der Funktionen. Die Web-App ruft sie aus dem Browser auf; der fragt vorher per OPTIONS,
// ob er darf. Angemeldet wird über den Authorization-Kopf, nicht über Cookies, deshalb ist jede Herkunft erlaubt.
export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

/** Antwort auf die Vorab-Anfrage des Browsers, sonst null. */
export const preflight = (req: Request) => (req.method === 'OPTIONS' ? new Response(null, { status: 204, headers: cors }) : null);

/** Zwei geheime Werte vergleichen, ohne dass die Antwortzeit verrät, wie viel davon stimmt. */
export function sameSecret(a: string, b: string) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
