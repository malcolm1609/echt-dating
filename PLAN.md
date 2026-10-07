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
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) | Row-Level-Security, EU-Region (DSGVO), Umkreissuche per SQL |
| Identitätsprüfung | Didit (entschieden am 2026-10-07) | 500 Prüfungen/Monat kostenlos, danach ca. 0,33 $ laut Anbieter; EU-Speicherung; nur Ergebnis per Webhook speichern |
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
3. **Anmeldung + Warteliste in der App** ✅ (`app/`, Logik in `src/domain/onboarding.ts`)
   - Willkommen → E-Mail-Code → Profil (Vorname, Geburtsdatum, Geschlecht, sucht) + Standort → Ausweisprüfung → Status/Warteliste
   - Zulassung nach Prüfung: nächstes offenes Gebiet im Umkreis, Alter laut Ausweis, sonst Warteliste (auch „kein Gebiet offen“)
   - Ohne Supabase-Zugangsdaten läuft die App im Demo-Modus mit Beispieldaten
4. **Ausweisprüfung mit Didit** ✅ (`supabase/functions`)
   - `verification-start`: legt eine Didit-Sitzung an (vendor_data = Nutzer-ID) und gibt den Prüf-Link zurück
   - `verification-webhook`: prüft die HMAC-Signatur (X-Signature-V2, Fallback X-Signature, max. 5 Min. alt), speichert nur das Ergebnis, setzt Status, Gebiet und Geburtsdatum laut Ausweis
   - Entscheidet nur einmal pro Profil, doppelte Webhooks ändern nichts
   - Noch offen: Didit-Konto + Workflow (Ausweis, Liveness, Face Match) anlegen und Secrets in Supabase setzen
5. **„Heute“-Screen** ✅ (`app/heute.tsx`, `src/ui/TodayDeck.tsx`, Funktion `todays_picks()`)
   - Ein Profil pro Screen, nur „Gefällt mir“ oder „Weiter“, Fortschritt als 6 Striche
   - Feste Reihenfolge pro Person und Tag: Neu laden bringt keine neuen Vorschläge
   - Gegenseitiges Like zeigt sofort den Match-Moment, danach ruhiges Tagesende
   - Öffnen der App zählt als Aktivität (`touch_activity`)
   - Noch offen: Profilfotos (bisher Initiale als Platzhalter)
6. Match + Fragenrunde in 3 Stufen
7. Chat, Date-Vorschlag, „Freundlich beenden“
8. Check nach dem Date

## Offene Punkte
- Monetarisierung (Werbung + werbefreies Abo 3–6 €/Monat ist nur ein erster Gedanke)
- Geschlechter jenseits von f/m und wer wen sucht: die Verhältnisregel muss das später abbilden
