\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000c1'), ('00000000-0000-0000-0000-0000000000c2');

select pg_temp.assert(not has_function_privilege('anon', 'record_consent(text[], text)', 'execute'), 'anon: keine Einwilligung');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select record_consent(array['privacy', 'sensitive_data'], '2026-10-09');
select record_consent(array['privacy'], '2026-10-09');
select pg_temp.assert((select count(*) from consents) = 2, 'Einwilligungen gespeichert, doppelt zählt einmal');
select pg_temp.assert((select bool_and(user_id = '00000000-0000-0000-0000-0000000000c1') from consents), 'nur für das eigene Konto');

do $$ begin
  perform record_consent(array['werbung'], '2026-10-09');
  raise exception 'FAILED: unbekannte Einwilligung angenommen';
exception when check_violation then raise notice 'ok - unbekannte Einwilligung abgelehnt';
end $$;

do $$ begin
  insert into consents (user_id, kind, version) values ('00000000-0000-0000-0000-0000000000c2', 'privacy', '2026-10-09');
  raise exception 'FAILED: direkt geschrieben';
exception when insufficient_privilege then raise notice 'ok - kein direktes Schreiben';
end $$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.assert((select count(*) from consents) = 0, 'fremde Einwilligungen unsichtbar');

reset role;
delete from auth.users where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.assert(not exists (select from consents), 'mit dem Konto gelöscht');

rollback;
