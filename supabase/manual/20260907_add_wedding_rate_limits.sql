-- Server-side rate limits for public wedding search and response RPCs.
-- Scoped to wedding APIs only. QR tables, Storage, and other projects are untouched.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.wedding_rate_limits (
  action_name text not null,
  subject_key text not null,
  client_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (action_name, subject_key, client_hash, window_started_at)
);

revoke all on table private.wedding_rate_limits from public, anon, authenticated;

create or replace function private.consume_wedding_rate_limit(
  p_action_name text,
  p_subject_key text,
  p_max_requests integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_headers jsonb := '{}'::jsonb;
  v_client_address text;
  v_client_hash text;
  v_window_started_at timestamptz;
  v_allowed boolean;
begin
  if p_max_requests < 1 or p_window_seconds < 1 then
    raise exception using errcode = '22023', message = 'Invalid rate-limit configuration';
  end if;

  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  v_client_address := coalesce(
    nullif(btrim(v_headers ->> 'cf-connecting-ip'), ''),
    nullif(btrim(split_part(v_headers ->> 'x-forwarded-for', ',', 1)), ''),
    nullif(btrim(v_headers ->> 'x-real-ip'), ''),
    'unknown'
  );
  v_client_hash := md5(v_client_address);
  v_window_started_at := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into private.wedding_rate_limits (
    action_name, subject_key, client_hash, window_started_at, request_count
  ) values (
    p_action_name, p_subject_key, v_client_hash, v_window_started_at, 1
  )
  on conflict (action_name, subject_key, client_hash, window_started_at)
  do update set request_count = private.wedding_rate_limits.request_count + 1
  where private.wedding_rate_limits.request_count < p_max_requests
  returning true into v_allowed;

  if random() < 0.02 then
    delete from private.wedding_rate_limits
    where window_started_at < now() - interval '1 day';
  end if;

  return coalesce(v_allowed, false);
end;
$function$;

revoke all on function private.consume_wedding_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;

create or replace function public.search_wedding_guests(
  p_wedding_slug text,
  p_search text
)
returns table(guest_id uuid, full_name text, max_guests integer)
language plpgsql
volatile
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
  if not private.consume_wedding_rate_limit('guest_search', v_slug, 20, 60) then
    raise exception using errcode = 'P0001', message = 'Too many searches. Please wait a minute and try again.';
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
    and strpos(g.normalized_full_name, v_search) > 0
  order by case when g.normalized_full_name = v_search then 0 else 1 end, g.full_name
  limit 8;
end;
$function$;

create or replace function public.search_wedding_entourage(
  p_wedding_slug text,
  p_search text
)
returns table(entourage_id uuid, full_name text, role text, personal_message text, photo_path text, response_status text)
language plpgsql
volatile
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
  if not private.consume_wedding_rate_limit('entourage_search', v_slug, 20, 60) then
    raise exception using errcode = 'P0001', message = 'Too many searches. Please wait a minute and try again.';
  end if;

  return query
  select e.id, e.full_name, e.role, e.personal_message, e.photo_path, e.response_status
  from public.wedding_entourage as e
  join public.wedding_events as w on w.id = e.wedding_id
  where w.slug = v_slug
    and w.status = 'active'
    and w.entourage_enabled
    and e.role in (
      'Maid of Honor', 'Best Man', 'Bridesmaid', 'Groomsman',
      'Candle Sponsor', 'Cord Sponsor', 'Veil Sponsor',
      'Flower Girl', 'Ring Bearer', 'Bible Bearer', 'Coin Bearer', 'Banner Bearer'
    )
    and strpos(e.normalized_full_name, v_search) > 0
  order by case when e.normalized_full_name = v_search then 0 else 1 end, e.full_name, e.role
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
  if not private.consume_wedding_rate_limit('rsvp_submit', v_slug, 10, 600)
     or not private.consume_wedding_rate_limit('rsvp_target', p_guest_id::text, 3, 600) then
    raise exception using errcode = 'P0001', message = 'Too many RSVP attempts. Please wait and try again.';
  end if;

  select w.id into v_wedding_id
  from public.wedding_events as w
  where w.slug = v_slug and w.status = 'active' and w.invitation_enabled and w.rsvp_enabled;
  if v_wedding_id is null then
    raise exception using errcode = 'P0001', message = 'Wedding not available for RSVP';
  end if;

  select g.full_name, g.max_guests into v_guest_name, v_max_guests
  from public.wedding_guests as g
  where g.id = p_guest_id and g.wedding_id = v_wedding_id and g.is_active
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
    wedding_id, guest_id, full_name, normalized_full_name, attendance, guest_count, message
  ) values (
    v_wedding_id, p_guest_id, v_guest_name, public.normalize_person_name(v_guest_name),
    v_attendance, v_count, v_message
  )
  on conflict (wedding_id, guest_id) where guest_id is not null
  do update set full_name = excluded.full_name,
                normalized_full_name = excluded.normalized_full_name,
                attendance = excluded.attendance,
                guest_count = excluded.guest_count,
                message = excluded.message,
                updated_at = now()
  returning id into v_rsvp_id;

  return jsonb_build_object('success', true, 'rsvp_id', v_rsvp_id,
                            'attendance', v_attendance, 'guest_count', v_count);
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
  if not private.consume_wedding_rate_limit('entourage_submit', v_slug, 10, 600)
     or not private.consume_wedding_rate_limit('entourage_target', p_entourage_id::text, 3, 600) then
    raise exception using errcode = 'P0001', message = 'Too many response attempts. Please wait and try again.';
  end if;

  select w.id, e.response_status into v_wedding_id, v_current_status
  from public.wedding_entourage as e
  join public.wedding_events as w on w.id = e.wedding_id
  where w.slug = v_slug and w.status = 'active' and w.entourage_enabled
    and e.id = p_entourage_id
    and e.role in (
      'Maid of Honor', 'Best Man', 'Bridesmaid', 'Groomsman',
      'Candle Sponsor', 'Cord Sponsor', 'Veil Sponsor',
      'Flower Girl', 'Ring Bearer', 'Bible Bearer', 'Coin Bearer', 'Banner Bearer'
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
  set response_status = v_response, responded_at = v_responded_at, updated_at = v_responded_at
  where id = p_entourage_id and wedding_id = v_wedding_id;
  insert into public.wedding_entourage_responses (wedding_id, entourage_id, response, message)
  values (v_wedding_id, p_entourage_id, v_response, v_message);

  return jsonb_build_object('success', true, 'response', v_response, 'responded_at', v_responded_at);
end;
$function$;

revoke all on function public.search_wedding_guests(text, text) from public, anon, authenticated;
revoke all on function public.search_wedding_entourage(text, text) from public, anon, authenticated;
revoke all on function public.submit_wedding_rsvp(text, uuid, text, integer, text) from public, anon, authenticated;
revoke all on function public.respond_to_wedding_entourage(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.search_wedding_guests(text, text) to anon, authenticated, service_role;
grant execute on function public.search_wedding_entourage(text, text) to anon, authenticated, service_role;
grant execute on function public.submit_wedding_rsvp(text, uuid, text, integer, text) to anon, authenticated, service_role;
grant execute on function public.respond_to_wedding_entourage(text, uuid, text, text) to anon, authenticated, service_role;

commit;
