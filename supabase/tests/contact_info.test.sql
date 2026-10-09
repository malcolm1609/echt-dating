\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

insert into areas (id, name, lat, lng, radius_km, capacity) values (1, 'Gießen', 50.5841, 8.6784, 30, 1000);
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000c1');
alter table profiles disable trigger block_contact_info;
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status, bio) values
  ('00000000-0000-0000-0000-0000000000c1', 'Lea', '2003-02-01', 'f', '{m}', 1, 50.58, 8.68, 'admitted', 'Altes Profil mit @lea');
alter table profiles enable trigger block_contact_info;

create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when others then
  return true;
end $$;

select pg_temp.assert(has_contact_info('Folgt mir auf @lea.giessen'), '@-Name');
select pg_temp.assert(has_contact_info('Insta lea.mueller'), 'Plattform mit Benutzername');
select pg_temp.assert(has_contact_info('insta: lea_gi'), 'Plattform mit Doppelpunkt');
select pg_temp.assert(has_contact_info('www.lea-fotografie.de'), 'Webadresse');
select pg_temp.assert(has_contact_info('meinblog.de'), 'Domain');
select pg_temp.assert(has_contact_info('Schreib mir: 0151 2345 6789'), 'Handynummer');
select pg_temp.assert(has_contact_info('+49 151 23456789'), 'internationale Nummer');
select pg_temp.assert(has_contact_info('adde mich'), 'adde mich');
select pg_temp.assert(not has_contact_info('Ich bin kaum auf Instagram unterwegs'), 'Plattform ohne Namen erlaubt');
select pg_temp.assert(not has_contact_info('Kaffee um 10 Uhr, z. B. am Kirchenplatz'), 'normaler Text');
select pg_temp.assert(not has_contact_info('Seit 2019 in Gießen, 3 WG-Mitbewohner'), 'Zahlen im Text');
select pg_temp.assert(not has_contact_info('Ich mag Tiktok-Tänze nicht'), 'Tiktok im Satz');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.assert(pg_temp.fails($$update profiles set bio = 'Mehr auf insta: lea_gi' where id = auth.uid()$$), 'Über mich gesperrt');
select pg_temp.assert(pg_temp.fails($$update profiles set display_name = '@lea' where id = auth.uid()$$), 'Name gesperrt');
select pg_temp.assert(pg_temp.fails($$update profiles set prompts = '[{"prompt_id":"a","answer":"Schreib mir auf snapchat lea2003"}]' where id = auth.uid()$$),
  'Antworten gesperrt');
update profiles set lat = 50.59 where id = auth.uid();
update profiles set bio = 'Ich koche gern' where id = auth.uid();
reset role;
select pg_temp.assert((select bio from profiles where id = '00000000-0000-0000-0000-0000000000c1') = 'Ich koche gern',
  'alte Profile lassen sich weiter ändern und bereinigen');

rollback;
