\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

insert into areas (id, name, lat, lng, radius_km, capacity) values
  (101, 'Gießen', 50.5841, 8.6784, 30, 1000),
  (102, 'Lasttest', 52.52, 13.40, 30, 1000);

select pg_temp.assert((select code from areas where id = 101) is null, 'Vorbereitung');
update areas set code = '06531' where name = 'Gießen';

-- Vor dem Laden der Grenzen gilt der Radius.
select pg_temp.assert(area_for(50.60, 8.70) = 101, 'ohne Umrisse per Radius');

-- Landkreis Kassel umschließt die Stadt Kassel (wie im echten Leben); Gießen behält seine ID.
select load_districts($$[
  {"code": "06531", "name": "Gießen (Landkreis)", "lat": 50.6, "lng": 8.7,
   "shapes": [{"points": "((8.5,50.4),(8.9,50.4),(8.9,50.8),(8.5,50.8))", "size": 0.16}]},
  {"code": "06633", "name": "Kassel (Landkreis)", "lat": 51.3, "lng": 9.4,
   "shapes": [{"points": "((9.0,51.0),(9.8,51.0),(9.8,51.6),(9.0,51.6))", "size": 0.48}]},
  {"code": "06611", "name": "Kassel", "lat": 51.3, "lng": 9.5,
   "shapes": [{"points": "((9.4,51.25),(9.55,51.25),(9.55,51.35),(9.4,51.35))", "size": 0.015}]}
]$$, 2000);

select pg_temp.assert((select name from areas where code = '06531') = 'Gießen', 'vorhandenes Gebiet behält Namen');
select pg_temp.assert((select capacity from areas where code = '06633') = 2000, 'neue Gebiete mit Kapazität');
select pg_temp.assert(area_for(50.60, 8.70) = 101, 'Punkt im Landkreis Gießen');
select pg_temp.assert(area_for(51.30, 9.50) = (select id from areas where code = '06611'), 'Stadt Kassel statt Landkreis drumherum');
select pg_temp.assert(area_for(51.10, 9.10) = (select id from areas where code = '06633'), 'Landkreis Kassel');
select pg_temp.assert(area_for(52.50, 13.41) = 102, 'Gebiet ohne Umriss weiter per Radius');
select pg_temp.assert(area_for(48.14, 11.58) is null, 'außerhalb aller Gebiete kein Gebiet');
select pg_temp.assert(area_for(50.90, 8.70) is null, 'Gießen gilt nach dem Laden nur noch in seinen Grenzen');

-- Erneutes Laden ersetzt die Umrisse statt sie zu verdoppeln.
select load_districts($$[{"code": "06611", "name": "Kassel", "lat": 51.3, "lng": 9.5,
  "shapes": [{"points": "((9.4,51.25),(9.55,51.25),(9.55,51.35),(9.4,51.35))", "size": 0.015}]}]$$, 2000);
select pg_temp.assert((select count(*) from area_shapes s join areas a on a.id = s.area_id where a.code = '06611') = 1, 'kein doppelter Umriss');

-- Nur der Server darf laden.
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000e1');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select pg_temp.assert(not has_function_privilege('authenticated', 'load_districts(jsonb, int)', 'execute'), 'Laden nur für den Server');
select pg_temp.assert(not has_function_privilege('authenticated', 'area_for(double precision, double precision)', 'execute'), 'Zuordnung nur für den Server');
reset role;

-- Testbetrieb: Zulassung im eigenen Landkreis.
update beta_settings set enabled = true;
insert into profiles (id, display_name, birthdate, gender, seeking, lat, lng) values
  ('00000000-0000-0000-0000-0000000000e1', 'Kim', '2002-05-01', 'f', '{m}', 51.3, 9.5);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select beta_verify();
reset role;
select pg_temp.assert((select area_id from profiles where id = '00000000-0000-0000-0000-0000000000e1') = (select id from areas where code = '06611'),
  'Testbetrieb lässt im eigenen Landkreis zu');

rollback;
