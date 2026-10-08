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
   - Willkommen → E-Mail-Code → Handynummer per SMS (eine Nummer pro Konto) → Profil (Vorname, Geburtsdatum, Geschlecht, sucht) → Dein Profil (3 Fragen aus je einer Kategorie, Beziehungsziel, bis 5 Interessen) → Standort (nur GPS) → Ausweisprüfung → Status/Warteliste
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
6. **Match + Fragenrunde in 3 Stufen** ✅ Prototyp (`src/ui/QuestionRound.tsx`, Regeln in `src/domain/conversation.ts`)
   - Runde 1 Leicht, 2 Persönlich, 3 Tief; nächste Runde erst, wenn beide fertig sind
   - Antwort der anderen Person erst sichtbar, wenn man selbst geantwortet hat; danach öffnet sich der Chat
7. **Chat, Date-Vorschlag, „Freundlich beenden“** ✅ Prototyp (`src/ui/Chat.tsx`)
   - Hinweis, wenn die andere Person seit 2+ Tagen auf Antwort wartet
   - Date-Vorschlag mit Partner-Café und Uhrzeit, „Freundlich beenden“ mit fertiger, ehrlicher Nachricht
8. **Check nach dem Date** ✅ Prototyp: Wiedersehen nur bei beidseitigem Ja sichtbar, ein einseitiges Nein bleibt verborgen
9. **Vorschläge und Filter** ✅ (`src/domain/preferences.ts`, `src/domain/ranking.ts`, Migration `20261008000000_preferences.sql`)
   - Harte Filter nur Alter (Start: eigenes Alter ± 8) und Entfernung (5/10/20/30 km), beidseitig; einstellbar im Profil unter „Wen ich sehen möchte“
   - Reihenfolge nach festen Punkten: gleiches Ziel, gemeinsame Interessen, in den letzten 2 Tagen aktiv; kein lernendes Modell, keine Like-Zahlen
   - Ein Platz für jemanden, der mich schon geliked hat (bleibt verborgen), einer für die diese Woche am seltensten Gezeigten; wer heute 12-mal bewertet wurde, pausiert bis morgen
   - Unter jedem Vorschlag ein Satz, warum er passt; Date-Ideen aus gemeinsamen Interessen (`src/domain/dateIdeas.ts`)
   - Grundlage: Recherche „Algorithmus und Filter für Echt“ (Projektdateien)
10. **„In deiner Nähe sind heute aktiv“** ✅ (`src/domain/activeNearby.ts`, Funktion `active_nearby()`): auf Heute und der Warteliste, erst ab 51 Personen, von der Datenbank schon abgerundet (50er, 100er, 1000er), kein Live-Zähler
11. **Navigation**: Tabs Heute, Matches, Treffen, Profil (Profil pausieren)
12. **Treffen, Date-Planer und Echt Plus** ✅ Prototyp (`src/domain/events.ts`, `src/domain/plus.ts`, Demo-Speicher in `src/lib/events.ts` und `src/lib/plus.ts`)
   - Treffen: kleine Events (8–12 Leute) für verifizierte Mitglieder, Plätze je zur Hälfte für Frauen und Männer, volle Hälfte = Nachrücken
   - Date-Planer im Chat: Partner-Cafés mit Entfernung und 10 % Rabatt für jedes Echt-Date, Tischreservierung nur mit Plus
   - Echt Plus für 4,99 €/Monat: Reservierung, „Gelesen“ (nur wenn beide es einschalten), Events einen Tag früher und 20 % günstiger, mehr Filter und Fragen
   - Immer kostenlos: Verifikation, Date-Check-in, Standort mit Vertrauensperson teilen; keine kaufbaren Likes oder Boosts
   - Gastgeber: jedes Mitglied kann ein Event anlegen (`app/event-neu.tsx`), nur öffentliche Orte, 8/10/12 Plätze, 0–50 €, „Offen“ oder „Auf Einladung“ (freie Plätze später in die offene Liste)
   - Kein Feed: Gastgeber-Karte mit Sternen, Anzahl Events und Bewertungen von Leuten, die wirklich da waren
   - Nach dem Event (`app/rueckblick/[id].tsx`): Sterne, ein Satz, „Wen möchtest du wiedersehen?“; nur gegenseitige Wünsche werden zu Matches
   - Wer 2-mal ohne Absage fehlt, kann eine Zeit lang nicht buchen
   - Noch offen: echte Zahlung (In-App-Kauf), Partner-Verträge, Event-Tabellen in Supabase, Benachrichtigungen bei passenden Interessen

13. **Beta mit Server** ✅ (Migration `20261008100000_conversations.sql`, `src/lib/matches.ts`, `scripts/beta-seed.mjs`, Workflow `beta.yml`)
   - Matches, Fragenrunde, Chat, Date, Check danach und „Freundlich beenden“ liegen in Supabase; die App liest über `my_matches()` und schreibt nur über Funktionen, die die Regeln prüfen
   - Testbetrieb (`beta_settings.enabled`): SMS- und Ausweisprüfung überspringbar, Teststandort Gießen, Beispielprofile (`is_sample`) antworten selbst und bleiben aktiv
   - 20 Beispielprofile aus Gießen und 2 Testkonten mit Passwort (`supabase/seed/beta-profiles.json`), „Testdaten zurücksetzen“ in den Einstellungen
   - Web-Version auf GitHub Pages, am Handy im Browser zu öffnen
   - Vor dem echten Start: Testbetrieb abschalten, Beispielprofile löschen
   - Treffen, Events, Campus und Echt Plus laufen weiter nur im Demo-Speicher

14. **Neu-Hinweise, Melden und Blockieren** ✅ (Migration `20261008200000_safety_and_unread.sql`, `src/domain/safety.ts`, `src/ui/ReportPanel.tsx`)
   - Roter Punkt am Match und Zahl am Matches-Tab, wenn ein Match neu ist oder die andere Person geschrieben, geantwortet oder ein Date vorgeschlagen hat; Ansehen setzt es zurück (`mark_read()`)
   - Melden im Match (Fahne oben rechts) und in den Vorschlägen („… melden“, verbraucht keinen der 6); feste Gründe, Melden blockiert immer mit, ab 3 offenen Meldungen gesperrt
   - Blockieren wirkt in beide Richtungen: kein Vorschlag, kein Match, keine Nachrichten mehr
   - Noch offen: echte Push-Benachrichtigungen aufs Handy (braucht App-Build), Prüfung der Meldungen durch einen Menschen

Klickbarer Prototyp als einzelne HTML-Datei: `npx expo export --platform web --output-dir dist && node scripts/prototype-html.mjs dist`

## Offene Punkte
- Monetarisierung: Echt Plus (4,99 €/Monat) plus Einnahmen von Partner-Cafés und Events, im Prototyp nur als Demo ohne Zahlung
- Geschlechter jenseits von f/m und wer wen sucht: die Verhältnisregel muss das später abbilden
