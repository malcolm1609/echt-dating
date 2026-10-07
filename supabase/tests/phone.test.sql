\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

-- Doppelte Prüfung: ohne bestätigte Handynummer kein Profil.
insert into auth.users values ('00000000-0000-0000-0000-00000000004a', null, null);
select pg_temp.as_user('00000000-0000-0000-0000-00000000004a');
do $$ begin
  insert into profiles (id, display_name, birthdate, gender, seeking, lat, lng)
    values (auth.uid(), 'Lea', '1997-03-03', 'f', '{m}', 52.5, 13.4);
  raise exception 'FAILED: Profil ohne bestätigte Handynummer angelegt';
exception when insufficient_privilege then raise notice 'ok - ohne bestätigte Handynummer kein Profil';
end $$;
reset role;

update auth.users set phone = '+4915100000004', phone_confirmed_at = now() where id = '00000000-0000-0000-0000-00000000004a';
select pg_temp.as_user('00000000-0000-0000-0000-00000000004a');
insert into profiles (id, display_name, birthdate, gender, seeking, lat, lng)
  values (auth.uid(), 'Lea', '1997-03-03', 'f', '{m}', 52.5, 13.4);
select pg_temp.assert((select count(*) from profiles where id = auth.uid()) = 1, 'mit bestätigter Handynummer klappt das Profil');
reset role;

rollback;
