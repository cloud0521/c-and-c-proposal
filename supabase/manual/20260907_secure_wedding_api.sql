-- Dreamz Platform: secure wedding public API
-- Run this file manually in the Supabase SQL Editor for project anwlsrcimgrwfxgzdqib.
-- This script only changes the six public.wedding_* tables and their wedding RPCs.
-- It does not touch QR tables, Storage, wedding-photos, or the Christening project.

begin;

-- Keep name matching deterministic: lowercase, trim ends, and collapse whitespace.
create or replace function public.normalize_person_name(input_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $function$
  select lower(regexp_replace(btrim(coalesce(input_text, '')), '\s+', ' ', 'g'));
$function$;

create or replace function public.set_wedding_guest_normalized_name()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.normalized_full_name := public.normalize_person_name(new.full_name);
  return new;
end;
$function$;

create or replace function public.set_wedding_rsvp_normalized_name()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.normalized_full_name := public.normalize_person_name(new.full_name);
  return new;
end;
$function$;

create or replace function public.set_wedding_entourage_normalized_name()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.normalized_full_name := public.normalize_person_name(new.full_name);
  return new;
end;
$function$;

-- Public wedding details. The return signature is preserved for app compatibility.
create or replace function public.get_public_wedding(p_slug text)
returns table(
  wedding_id uuid,
  slug text,
  couple_names text,
  partner_one_name text,
  partner_two_name text,
  wedding_date date,
  ceremony_time time without time zone,
  timezone text,
  invitation_enabled boolean,
  entourage_enabled boolean,
  rsvp_enabled boolean,
  ceremony_name text,
  ceremony_address text,
  ceremony_map_url text,
  details_ceremony_time time without time zone,
  reception_name text,
  reception_address text,
  reception_map_url text,
  reception_time time without time zone,
  dress_code text,
  attire_notes text,
  coordinator_name text,
  coordinator_contact text,
  general_notes text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_slug text := btrim(coalesce(p_slug, ''));
begin
  if v_slug = '' or length(v_slug) > 160 then
    return;
  end if;

  return query
  select
    w.id, w.slug, w.couple_names, w.partner_one_name, w.partner_two_name,
    w.wedding_date, w.ceremony_time, w.timezone,
    w.invitation_enabled, w.entourage_enabled, w.rsvp_enabled,
    d.ceremony_name, d.ceremony_address, d.ceremony_map_url, d.ceremony_time,
    d.reception_name, d.reception_address, d.reception_map_url, d.reception_time,
    d.dress_code, d.attire_notes, d.coordinator_name, d.coordinator_contact,
    d.general_notes
  from public.wedding_events as w
  left join public.wedding_details as d on d.wedding_id = w.id
  where w.slug = v_slug
    and w.status = 'active'
    and (w.invitation_enabled or w.entourage_enabled)
  limit 1;
end;
$function$;

create or replace function public.search_wedding_guests(
  p_wedding_slug text,
  p_search text
)
returns table(guest_id uuid, full_name text, max_guests integer)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_slug text := btrim(coalesce(p_wedding_slug, ''));
  v_search text := public.normalize_person_name(p_search);
begin
  if v_slug = '' or length(v_slug) > 160
     or length(v_search) < 3 or length(v_search) > 100 then
    return;
  end if;

  return query
  select g.id, g.full_name, g.max_guests
  from public.wedding_guests as g
  join public.wedding_events as w on w.id = g.wedding_id
  where w.slug = v_slug
    and w.status = 'active'
    and w.invitation_enabled
    and w.rsvp_enabled
    and g.is_active
    and g.normalized_full_name like '%' || v_search || '%'
  order by
    case when g.normalized_full_name = v_search then 0 else 1 end,
    g.full_name
  limit 8;
end;
$function$;

create or replace function public.submit_wedding_rsvp(
  p_wedding_slug text,
  p_guest_id uuid,
  p_attendance text,
  p_guest_count integer default 1,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_slug text := btrim(coalesce(p_wedding_slug, ''));
  v_attendance text := lower(btrim(coalesce(p_attendance, '')));
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_wedding_id uuid;
  v_guest_name text;
  v_max_guests integer;
  v_rsvp_id uuid;
  v_count integer;
begin
  if v_slug = '' or length(v_slug) > 160 or p_guest_id is null then
    raise exception using errcode = '22023', message = 'Invalid RSVP request';
  end if;
  if v_attendance not in ('attending', 'declined') then
    raise exception using errcode = '22023', message = 'Invalid attendance response';
  end if;
  if v_message is not null and length(v_message) > 1000 then
    raise exception using errcode = '22023', message = 'Message is too long';
  end if;

  select w.id into v_wedding_id
  from public.wedding_events as w
  where w.slug = v_slug
    and w.status = 'active'
    and w.invitation_enabled
    and w.rsvp_enabled;

  if v_wedding_id is null then
    raise exception using errcode = 'P0001', message = 'Wedding not available for RSVP';
  end if;

  select g.full_name, g.max_guests
    into v_guest_name, v_max_guests
  from public.wedding_guests as g
  where g.id = p_guest_id
    and g.wedding_id = v_wedding_id
    and g.is_active
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'Guest not found';
  end if;

  if v_attendance = 'declined' then
    v_count := 0;
  else
    if p_guest_count is null or p_guest_count < 1 or p_guest_count > v_max_guests then
      raise exception using errcode = '22023', message = 'Guest count exceeds invitation allowance';
    end if;
    v_count := p_guest_count;
  end if;

  insert into public.wedding_rsvps (
    wedding_id, guest_id, full_name, normalized_full_name,
    attendance, guest_count, message
  ) values (
    v_wedding_id, p_guest_id, v_guest_name,
    public.normalize_person_name(v_guest_name),
    v_attendance, v_count, v_message
  )
  on conflict (wedding_id, guest_id) where guest_id is not null
  do update set
    full_name = excluded.full_name,
    normalized_full_name = excluded.normalized_full_name,
    attendance = excluded.attendance,
    guest_count = excluded.guest_count,
    message = excluded.message,
    updated_at = now()
  returning id into v_rsvp_id;

  return jsonb_build_object(
    'success', true,
    'rsvp_id', v_rsvp_id,
    'attendance', v_attendance,
    'guest_count', v_count
  );
end;
$function$;

create or replace function public.search_wedding_entourage(
  p_wedding_slug text,
  p_search text
)
returns table(
  entourage_id uuid,
  full_name text,
  role text,
  personal_message text,
  photo_path text,
  response_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_slug text := btrim(coalesce(p_wedding_slug, ''));
  v_search text := public.normalize_person_name(p_search);
begin
  if v_slug = '' or length(v_slug) > 160
     or length(v_search) < 3 or length(v_search) > 100 then
    return;
  end if;

  return query
  select e.id, e.full_name, e.role, e.personal_message, e.photo_path,
         e.response_status
  from public.wedding_entourage as e
  join public.wedding_events as w on w.id = e.wedding_id
  where w.slug = v_slug
    and w.status = 'active'
    and w.entourage_enabled
    and e.role in (
      'Maid of Honor', 'Best Man', 'Bridesmaid', 'Groomsman',
      'Candle Sponsor', 'Cord Sponsor', 'Veil Sponsor',
      'Flower Girl', 'Ring Bearer', 'Bible Bearer',
      'Coin Bearer', 'Banner Bearer'
    )
    and e.normalized_full_name like '%' || v_search || '%'
  order by
    case when e.normalized_full_name = v_search then 0 else 1 end,
    e.full_name,
    e.role
  limit 8;
end;
$function$;

create or replace function public.respond_to_wedding_entourage(
  p_wedding_slug text,
  p_entourage_id uuid,
  p_response text,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_slug text := btrim(coalesce(p_wedding_slug, ''));
  v_response text := lower(btrim(coalesce(p_response, '')));
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_wedding_id uuid;
  v_current_status text;
  v_responded_at timestamptz;
begin
  if v_slug = '' or length(v_slug) > 160 or p_entourage_id is null then
    raise exception using errcode = '22023', message = 'Invalid entourage request';
  end if;
  if v_response not in ('accepted', 'declined') then
    raise exception using errcode = '22023', message = 'Invalid response';
  end if;
  if v_message is not null and length(v_message) > 1000 then
    raise exception using errcode = '22023', message = 'Message is too long';
  end if;

  -- The row lock makes the first accepted/declined response final under concurrency.
  select w.id, e.response_status
    into v_wedding_id, v_current_status
  from public.wedding_entourage as e
  join public.wedding_events as w on w.id = e.wedding_id
  where w.slug = v_slug
    and w.status = 'active'
    and w.entourage_enabled
    and e.id = p_entourage_id
    and e.role in (
      'Maid of Honor', 'Best Man', 'Bridesmaid', 'Groomsman',
      'Candle Sponsor', 'Cord Sponsor', 'Veil Sponsor',
      'Flower Girl', 'Ring Bearer', 'Bible Bearer',
      'Coin Bearer', 'Banner Bearer'
    )
  for update of e;

  if not found then
    raise exception using errcode = 'P0001', message = 'Entourage proposal not found';
  end if;
  if v_current_status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'This proposal already has a final response';
  end if;

  v_responded_at := now();
  update public.wedding_entourage
  set response_status = v_response,
      responded_at = v_responded_at,
      updated_at = v_responded_at
  where id = p_entourage_id and wedding_id = v_wedding_id;

  insert into public.wedding_entourage_responses (
    wedding_id, entourage_id, response, message
  ) values (
    v_wedding_id, p_entourage_id, v_response, v_message
  );

  return jsonb_build_object(
    'success', true,
    'response', v_response,
    'responded_at', v_responded_at
  );
end;
$function$;

-- Defense in depth: public clients cannot query or mutate wedding tables directly.
alter table public.wedding_events enable row level security;
alter table public.wedding_details enable row level security;
alter table public.wedding_guests enable row level security;
alter table public.wedding_rsvps enable row level security;
alter table public.wedding_entourage enable row level security;
alter table public.wedding_entourage_responses enable row level security;

revoke all on table public.wedding_events from public, anon, authenticated;
revoke all on table public.wedding_details from public, anon, authenticated;
revoke all on table public.wedding_guests from public, anon, authenticated;
revoke all on table public.wedding_rsvps from public, anon, authenticated;
revoke all on table public.wedding_entourage from public, anon, authenticated;
revoke all on table public.wedding_entourage_responses from public, anon, authenticated;

-- Remove the default PUBLIC execute privilege, including from trigger helpers.
revoke all on function public.normalize_person_name(text) from public, anon, authenticated;
revoke all on function public.set_wedding_guest_normalized_name() from public, anon, authenticated;
revoke all on function public.set_wedding_rsvp_normalized_name() from public, anon, authenticated;
revoke all on function public.set_wedding_entourage_normalized_name() from public, anon, authenticated;
revoke all on function public.get_public_wedding(text) from public, anon, authenticated;
revoke all on function public.search_wedding_guests(text, text) from public, anon, authenticated;
revoke all on function public.submit_wedding_rsvp(text, uuid, text, integer, text) from public, anon, authenticated;
revoke all on function public.search_wedding_entourage(text, text) from public, anon, authenticated;
revoke all on function public.respond_to_wedding_entourage(text, uuid, text, text) from public, anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant execute on function public.get_public_wedding(text) to anon, authenticated, service_role;
grant execute on function public.search_wedding_guests(text, text) to anon, authenticated, service_role;
grant execute on function public.submit_wedding_rsvp(text, uuid, text, integer, text) to anon, authenticated, service_role;
grant execute on function public.search_wedding_entourage(text, text) to anon, authenticated, service_role;
grant execute on function public.respond_to_wedding_entourage(text, uuid, text, text) to anon, authenticated, service_role;

commit;

-- Optional read-only verification after COMMIT:
-- select proname, prosecdef, proconfig
-- from pg_proc
-- where oid in (
--   'public.get_public_wedding(text)'::regprocedure,
--   'public.search_wedding_guests(text,text)'::regprocedure,
--   'public.submit_wedding_rsvp(text,uuid,text,integer,text)'::regprocedure,
--   'public.search_wedding_entourage(text,text)'::regprocedure,
--   'public.respond_to_wedding_entourage(text,uuid,text,text)'::regprocedure
-- );
