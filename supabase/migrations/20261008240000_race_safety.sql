-- Gefunden im Stresstest: Wenn zwei Personen sich im selben Moment gegenseitig liken, sah keine der beiden
-- Speicherungen die andere, und es entstand kein Match. Genauso konnten gleichzeitige Entscheidungen das
-- Tageslimit von 6 überspringen. Eine kurze Sperre je Paar bzw. je Person lässt die zweite Speicherung warten,
-- bis die erste fertig ist; danach sieht sie deren Ergebnis.

create or replace function enforce_daily_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('likes-day:' || new.from_id::text, 0));
  if (select count(*) from likes where from_id = new.from_id and created_at >= day_start()) >= 6 then
    raise exception 'daily limit reached' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create or replace function create_match() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.decision <> 'like' then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended('match:' || least(new.from_id, new.to_id)::text || greatest(new.from_id, new.to_id)::text, 0));
  if exists (select from likes where from_id = new.to_id and to_id = new.from_id and decision = 'like') then
    insert into matches (user_a, user_b)
      values (least(new.from_id, new.to_id), greatest(new.from_id, new.to_id))
      on conflict do nothing;
  end if;
  return new;
end $$;
