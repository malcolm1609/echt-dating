# Echt – Startplan

Ziel: Eine Dating-App, in der nur echte und aktive Menschen sind.
Grundlage: Konzept und Canvas-Entwurf „Echt – App-Entwurf“ aus dem Originalprojekt.

## Feste Entscheidungen (aus dem bisherigen Projekt)
- Ausweis + Live-Selfie sind für alle Pflicht, deshalb kein Verifikations-Badge.
- Gespeichert wird nur das Prüfergebnis, keine Ausweisbilder.
- Zulassung pro Umkreis nach Kapazität und Geschlechterverhältnis, sonst Warteliste.
- Inaktive und Spammer fliegen aus den Vorschlägen bzw. werden pausiert/gesperrt.
- Höchstens 6 Vorschläge pro Tag, nur „Gefällt mir“ oder „Weiter“.
- Mobile zuerst mit Expo / React Native. Design: dunkel, Koralle als Akzent.

## Tech-Stack (Empfehlung)
| Bereich | Wahl | Warum |
|---|---|---|
| App | Expo (React Native, TypeScript, Expo Router) | iOS + Android aus einer Codebasis |
| Backend | Supabase (Postgres + PostGIS, Auth, Storage, Edge Functions) | Umkreissuche per PostGIS, Row-Level-Security, EU-Region (DSGVO) |
| Identitätsprüfung | Externer Anbieter mit Ausweis + Liveness (z. B. Veriff, IDnow) | Echtheit ist der Kern, nicht selbst bauen; nur Ergebnis per Webhook speichern |
| Tests | Jest (jest-expo), TDD | Regeln zuerst als reine Logik getestet |

## MVP-Umfang (Reihenfolge)
1. **Kernregeln als getestete Logik** ✅ (`src/domain`)
   - Zulassung: Verifikation, Mindestalter 18, Kapazität, Geschlechterverhältnis ≤ 60 % pro Umkreis (unter 50 Personen wird jeder zugelassen)
   - Aktivität: nach 3 Tagen Erinnerung, nach 7 Tagen aus Vorschlägen, nach 14 Tagen pausiert (Platz wird frei), ab 3 offenen Spam-Meldungen gesperrt
   - Tagesvorschläge: max. 6, nur aktive und noch nicht gesehene Profile
2. **Datenmodell mit Zugriffsregeln** ✅ (`supabase/migrations`, Tests in `supabase/tests`)
   - Andere sehen nur `public_profiles` (Alter, Entfernung in km, kein Geburtsdatum oder Standort)
   - Status (Zulassung) ist nicht selbst änderbar, Prüfergebnisse sind für Nutzer unsichtbar
   - Likes nur an sichtbare Profile, max. 6 pro Tag, gegenseitiges Like erzeugt automatisch ein Match
   - Umkreis per Haversine statt PostGIS (reicht fürs MVP, kein Extension-Zwang)
   - Noch offen: echtes Supabase-Projekt in EU-Region anlegen
3. Anmeldung + Verifikation (Anbieter-SDK, Webhook → Zulassungsentscheidung)
4. Warteliste-Screen (Platz, Wartezeit, Verhältnis im Umkreis)
5. „Heute“-Screen mit Tagesvorschlägen
6. Match + Fragenrunde in 3 Stufen
7. Chat, Date-Vorschlag, „Freundlich beenden“
8. Check nach dem Date

## Offene Punkte
- Monetarisierung (Werbung + werbefreies Abo 3–6 €/Monat ist nur ein erster Gedanke)
- Wahl des Verifikationsanbieters (Kosten pro Prüfung)
- Geschlechter jenseits von f/m und wer wen sucht: die Verhältnisregel muss das später abbilden
