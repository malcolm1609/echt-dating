\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

insert into areas (id, name, lat, lng, radius_km, capacity) values (1, 'Gießen', 50.5841, 8.6784, 30, 1000);
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000d1'), ('00000000-0000-0000-0000-0000000000d2'), ('00000000-0000-0000-0000-0000000000d3');
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status) values
  ('00000000-0000-0000-0000-0000000000d1', 'Lea', '2003-02-01', 'f', '{m}', 1, 50.58, 8.68, 'admitted'),
  ('00000000-0000-0000-0000-0000000000d2', 'Tom', '2002-05-01', 'm', '{f}', 1, 50.58, 8.67, 'admitted'),
  ('00000000-0000-0000-0000-0000000000d3', 'Ben', '2002-05-01', 'm', '{f}', 1, 50.58, 8.67, 'admitted');
insert into matches (user_a, user_b) values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2');
insert into match_dates (match_id, proposed_by, place, when_text, accepted)
  select id, '00000000-0000-0000-0000-0000000000d2', 'Café am Kirchenplatz', 'Samstag, 15 Uhr', true from matches;

create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when others then
  return true;
end $$;

-- Starten ---------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3');
select pg_temp.assert(pg_temp.fails($$select start_date_check('00000000-0000-0000-0000-0000000000d1', 'Mama', '+4915112345678')$$),
  'nur mit einem Match');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select pg_temp.assert(pg_temp.fails($$select start_date_check('00000000-0000-0000-0000-0000000000d2', 'Mama', '015112345678')$$),
  'Handynummer im internationalen Format');
create temp table t as select start_date_check('00000000-0000-0000-0000-0000000000d2', 'Mama', '+4915112345678')->>'token' as token;
grant select on t to authenticated, anon;
select pg_temp.assert(length((select token from t)) = 64, 'langer zufälliger Link');
select pg_temp.assert(current_date_check('00000000-0000-0000-0000-0000000000d2')->>'contact_name' = 'Mama', 'laufender Check sichtbar');
select date_check_location((select token from t), 50.58412, 8.67845);
reset role;

-- Seite der Vertrauensperson (ohne Anmeldung) --------------------------------------------
set local role anon;
select pg_temp.assert((select date_check_public(token)->>'name' from t) = 'Lea', 'Seite zeigt den Namen');
select pg_temp.assert((select date_check_public(token)->'match'->>'name' from t) = 'Tom', 'Seite zeigt, mit wem');
select pg_temp.assert((select date_check_public(token)->>'place' from t) = 'Café am Kirchenplatz', 'Seite zeigt den Ort');
select pg_temp.assert((select (date_check_public(token)->'location'->>'lat')::float8 from t) = 50.58412, 'Seite zeigt den genauen Standort');
select pg_temp.assert((select date_check_public(token)->>'status' from t) = 'active', 'Status läuft');
select pg_temp.assert(date_check_public('falsch') is null, 'falscher Link zeigt nichts');
select pg_temp.assert(pg_temp.fails($$select * from date_checks$$), 'Tabelle nicht direkt lesbar');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
select pg_temp.assert(pg_temp.fails($$select date_check_location((select token from t), 1, 1)$$), 'nur die eigene Person sendet den Standort');
reset role;

-- Alarm ---------------------------------------------------------------------------------
select pg_temp.assert(not exists (select from claim_date_alarms()), 'vor der Zeit kein Alarm');
update date_checks set check_at = now() - interval '20 minutes';
select pg_temp.assert((select date_check_public(token)->>'status' from t) = 'overdue', 'nach 15 Minuten ohne Antwort überfällig');
select pg_temp.assert((select kind from claim_date_alarms()) = 'overdue', 'SMS: keine Antwort');
select pg_temp.assert(not exists (select from claim_date_alarms()), 'SMS nur einmal');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select answer_date_check((select token from t), 'later');
reset role;
select pg_temp.assert((select kind from claim_date_alarms()) = 'clear', 'Entwarnung nach Antwort');
select pg_temp.assert((select alarm_sent from date_checks) is null, 'späteres Überziehen alarmiert wieder');
update date_checks set check_at = now() - interval '20 minutes';
select pg_temp.assert((select kind from claim_date_alarms()) = 'overdue', 'zweites Überziehen: SMS');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select answer_date_check((select token from t), 'later');
reset role;
select pg_temp.assert((select kind from claim_date_alarms()) = 'clear', 'zweite Entwarnung');
update date_checks set check_at = now() - interval '20 minutes';
select pg_temp.assert(not exists (select from claim_date_alarms()), 'ab dem dritten Überziehen keine SMS mehr (gegen SMS-Schleuder)');
update date_checks set check_at = now() + interval '1 hour';

-- Das Match ändert den Ort: Die Vertrauensperson sieht weiter den Ort vom Start des Checks.
update match_dates set place = 'Irgendwo anders', when_text = 'Sonntag', accepted = false;  -- wie ein neuer Vorschlag
select pg_temp.assert((select date_check_public(token)->>'place' from t) = 'Café am Kirchenplatz', 'Ort lässt sich nachträglich nicht umbiegen');
update match_dates set place = 'Café am Kirchenplatz', when_text = 'Samstag, 15 Uhr', accepted = true;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select answer_date_check((select token from t), 'help');
reset role;
select pg_temp.assert((select date_check_public(token)->>'status' from t) = 'help', 'Hilferuf sichtbar');
create temp table claimed as select * from claim_date_alarms();
select pg_temp.assert((select kind from claimed) = 'help' and (select user_name from claimed) = 'Lea', 'SMS: Hilferuf');
select release_date_alarm((select id from claimed), (select previous from claimed));
select pg_temp.assert((select kind from claim_date_alarms()) = 'help', 'fehlgeschlagene SMS wird erneut versucht');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select answer_date_check((select token from t), 'ok');
reset role;
select pg_temp.assert((select date_check_public(token)->>'status' from t) = 'ended', 'beendet');
select pg_temp.assert((select date_check_public(token)->'location' from t) is null, 'Standort nach dem Ende weg');
select pg_temp.assert((select date_check_public(token)->'match' from t) is null and (select date_check_public(token)->'place' from t) is null,
  'nach dem Ende kein Match und kein Ort mehr');
select pg_temp.assert((select lat is null from date_checks), 'Standort gelöscht');
select pg_temp.assert((select kind from claim_date_alarms()) = 'clear', 'Entwarnung nach dem Hilferuf');

-- Höchstens 3 pro Tag -------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select pg_temp.assert(pg_temp.fails($$select start_date_check('00000000-0000-0000-0000-0000000000d2', 'Fremd', '+19005550100')$$),
  'nur Nummern aus Deutschland, Österreich und der Schweiz');
select start_date_check('00000000-0000-0000-0000-0000000000d2', 'Papa', '+4917012345678');
select start_date_check('00000000-0000-0000-0000-0000000000d2', 'Oma', '+436641234567');
select pg_temp.assert(pg_temp.fails($$select start_date_check('00000000-0000-0000-0000-0000000000d2', 'Opa', '+41791234567')$$),
  'höchstens 3 Checks pro Tag');
reset role;

-- Dieselbe Nummer höchstens dreimal am Tag, auch von verschiedenen Leuten
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
select start_date_check('00000000-0000-0000-0000-0000000000d1', 'Mama', '+4917012345678');
select start_date_check('00000000-0000-0000-0000-0000000000d1', 'Mama', '+4917012345678');
select pg_temp.assert(pg_temp.fails($$select start_date_check('00000000-0000-0000-0000-0000000000d1', 'Mama', '+4917012345678')$$),
  'dieselbe Nummer höchstens dreimal am Tag');
reset role;

-- Die Alarm-Funktion bekommt ein Geheimnis, das nur in der Datenbank steht
select pg_temp.assert(length((select value from app_settings where key = 'date_alarm_secret')) = 64, 'Geheimnis für die Alarm-Funktion');

rollback;
