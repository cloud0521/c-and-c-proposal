-- DreamZ Wedding event-owner access (read-only RSVP dashboard)
-- Wedding-only objects. Does not alter QR tables, Storage, or Christening.

begin;

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.wedding_admin_credentials (
  wedding_id uuid primary key references public.wedding_events(id) on delete cascade,
  admin_code_hash text not null unique,
  admin_password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.wedding_admin_sessions (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.wedding_events(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);
create index if not exists idx_wedding_admin_sessions_wedding
  on private.wedding_admin_sessions(wedding_id, expires_at);

create table if not exists private.wedding_admin_login_attempts (
  attempt_key text not null,
  client_hash text not null,
  failure_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (attempt_key, client_hash)
);

alter table private.wedding_admin_credentials enable row level security;
alter table private.wedding_admin_sessions enable row level security;
alter table private.wedding_admin_login_attempts enable row level security;
revoke all on all tables in schema private from public, anon, authenticated;

create or replace function private.wedding_admin_client_hash()
returns text language plpgsql stable security definer set search_path = '' as $function$
declare
  v_headers jsonb := '{}'::jsonb;
  v_address text;
begin
  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then v_headers := '{}'::jsonb;
  end;
  v_address := coalesce(
    nullif(btrim(v_headers ->> 'cf-connecting-ip'), ''),
    nullif(btrim(split_part(v_headers ->> 'x-forwarded-for', ',', 1)), ''),
    nullif(btrim(v_headers ->> 'x-real-ip'), ''), 'unknown'
  );
  return encode(extensions.digest(v_address, 'sha256'), 'hex');
end;
$function$;

create or replace function private.random_wedding_admin_code(p_length integer default 5)
returns text language plpgsql volatile security definer set search_path = '' as $function$
declare
  v_chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea := extensions.gen_random_bytes(p_length);
  v_result text := '';
  i integer;
begin
  if p_length < 1 or p_length > 64 then raise exception 'Invalid code length'; end if;
  for i in 0..p_length - 1 loop
    v_result := v_result || substr(v_chars, (get_byte(v_bytes, i) % length(v_chars)) + 1, 1);
  end loop;
  return v_result;
end;
$function$;

create or replace function private.create_wedding_admin_credentials(p_wedding_slug text)
returns table(admin_code text, admin_password text)
language plpgsql volatile security definer set search_path = '' as $function$
declare
  v_wedding_id uuid;
  v_code text;
  v_password text;
begin
  select id into v_wedding_id from public.wedding_events where slug = btrim(p_wedding_slug);
  if not found then raise exception 'Wedding not found'; end if;
  if exists (select 1 from private.wedding_admin_credentials where wedding_id = v_wedding_id) then
    raise exception 'Wedding admin credentials already exist; they were not regenerated';
  end if;
  loop
    v_code := private.random_wedding_admin_code(5);
    exit when not exists (
      select 1 from private.wedding_admin_credentials
      where admin_code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex')
    );
  end loop;
  v_password := private.random_wedding_admin_code(5);
  insert into private.wedding_admin_credentials(wedding_id, admin_code_hash, admin_password_hash)
  values (
    v_wedding_id,
    encode(extensions.digest(v_code, 'sha256'), 'hex'),
    extensions.crypt(v_password, extensions.gen_salt('bf', 12))
  );
  return query select v_code, v_password;
end;
$function$;

revoke all on function private.wedding_admin_client_hash() from public, anon, authenticated;
revoke all on function private.random_wedding_admin_code(integer) from public, anon, authenticated;
revoke all on function private.create_wedding_admin_credentials(text) from public, anon, authenticated;

create or replace function public.discover_wedding_admin(p_wedding_slug text, p_candidate_code text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $function$
declare
  v_slug text := btrim(coalesce(p_wedding_slug, ''));
  v_code text := upper(btrim(coalesce(p_candidate_code, '')));
  v_match boolean := false;
begin
  if v_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$' or length(v_slug) > 160 then
    return jsonb_build_object('admin_match', false);
  end if;
  if not private.consume_wedding_rate_limit('admin_discovery', v_slug, 12, 60) then
    return jsonb_build_object('admin_match', false);
  end if;
  select exists (
    select 1 from public.wedding_events w
    join private.wedding_admin_credentials c on c.wedding_id = w.id
    where w.slug = v_slug and w.status = 'active'
      and c.admin_code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex')
  ) into v_match;
  return jsonb_build_object('admin_match', v_match);
end;
$function$;

create or replace function public.login_wedding_admin(
  p_wedding_slug text, p_admin_code text, p_password text
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $function$
declare
  v_slug text := btrim(coalesce(p_wedding_slug, ''));
  v_code text := upper(btrim(coalesce(p_admin_code, '')));
  v_password text := upper(btrim(coalesce(p_password, '')));
  v_client_hash text := private.wedding_admin_client_hash();
  v_attempt_key text;
  v_attempt private.wedding_admin_login_attempts%rowtype;
  v_has_attempt boolean := false;
  v_wedding_id uuid;
  v_password_hash text;
  v_token text;
  v_expires_at timestamptz;
  v_failure_count integer;
  v_generic_error constant text := 'Unable to verify access. Please check your credentials and try again.';
begin
  v_attempt_key := encode(extensions.digest(v_slug || '|' || v_code, 'sha256'), 'hex');
  select * into v_attempt from private.wedding_admin_login_attempts
  where attempt_key = v_attempt_key and client_hash = v_client_hash for update;
  v_has_attempt := found;
  if v_has_attempt and v_attempt.locked_until is not null and v_attempt.locked_until > now() then
    return jsonb_build_object('success', false, 'message', v_generic_error);
  end if;

  if v_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$'
     and v_password ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$'
     and length(v_slug) <= 160 then
    select w.id, c.admin_password_hash into v_wedding_id, v_password_hash
    from public.wedding_events w
    join private.wedding_admin_credentials c on c.wedding_id = w.id
    where w.slug = v_slug and w.status = 'active'
      and c.admin_code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex');
  end if;

  if v_wedding_id is null or extensions.crypt(v_password, v_password_hash) <> v_password_hash then
    v_failure_count := case
      when v_has_attempt and v_attempt.window_started_at > now() - interval '15 minutes'
        then v_attempt.failure_count + 1 else 1 end;
    insert into private.wedding_admin_login_attempts(
      attempt_key, client_hash, failure_count, window_started_at, locked_until, updated_at
    ) values (
      v_attempt_key, v_client_hash, v_failure_count, now(),
      case when v_failure_count >= 5 then now() + interval '15 minutes' end, now()
    ) on conflict (attempt_key, client_hash) do update set
      failure_count = excluded.failure_count,
      window_started_at = case
        when private.wedding_admin_login_attempts.window_started_at > now() - interval '15 minutes'
          then private.wedding_admin_login_attempts.window_started_at else now() end,
      locked_until = excluded.locked_until,
      updated_at = now();
    return jsonb_build_object('success', false, 'message', v_generic_error);
  end if;

  delete from private.wedding_admin_login_attempts
  where attempt_key = v_attempt_key and client_hash = v_client_hash;
  delete from private.wedding_admin_sessions where expires_at <= now();
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '8 hours';
  insert into private.wedding_admin_sessions(wedding_id, token_hash, expires_at)
  values (v_wedding_id, encode(extensions.digest(v_token, 'sha256'), 'hex'), v_expires_at);
  return jsonb_build_object('success', true, 'session_token', v_token, 'expires_at', v_expires_at);
end;
$function$;

create or replace function public.validate_wedding_admin_session(p_session_token text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $function$
declare
  v_token text := lower(btrim(coalesce(p_session_token, '')));
  v_result jsonb;
begin
  if v_token !~ '^[0-9a-f]{64}$' then return jsonb_build_object('valid', false); end if;
  update private.wedding_admin_sessions s set last_used_at = now()
  from public.wedding_events w
  where w.id = s.wedding_id and s.expires_at > now()
    and s.token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex')
  returning jsonb_build_object('valid', true, 'wedding_id', w.id, 'slug', w.slug,
    'couple_names', w.couple_names, 'expires_at', s.expires_at) into v_result;
  return coalesce(v_result, jsonb_build_object('valid', false));
end;
$function$;

create or replace function public.get_wedding_admin_rsvps(p_session_token text)
returns table(rsvp_id uuid, guest_name text, attendance text, guest_count integer, message text, responded_at timestamptz)
language plpgsql volatile security definer set search_path = '' as $function$
declare
  v_token text := lower(btrim(coalesce(p_session_token, '')));
  v_wedding_id uuid;
begin
  if v_token !~ '^[0-9a-f]{64}$' then return; end if;
  select s.wedding_id into v_wedding_id from private.wedding_admin_sessions s
  where s.token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex') and s.expires_at > now();
  if not found then return; end if;
  update private.wedding_admin_sessions set last_used_at = now()
  where token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex');
  return query select r.id, r.full_name, r.attendance, r.guest_count, r.message, r.updated_at
  from public.wedding_rsvps r where r.wedding_id = v_wedding_id order by r.updated_at desc;
end;
$function$;

create or replace function public.logout_wedding_admin(p_session_token text)
returns boolean language plpgsql volatile security definer set search_path = '' as $function$
declare v_token text := lower(btrim(coalesce(p_session_token, ''))); v_deleted boolean;
begin
  if v_token !~ '^[0-9a-f]{64}$' then return false; end if;
  delete from private.wedding_admin_sessions
  where token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex') returning true into v_deleted;
  return coalesce(v_deleted, false);
end;
$function$;

revoke all on function public.discover_wedding_admin(text, text) from public, anon, authenticated;
revoke all on function public.login_wedding_admin(text, text, text) from public, anon, authenticated;
revoke all on function public.validate_wedding_admin_session(text) from public, anon, authenticated;
revoke all on function public.get_wedding_admin_rsvps(text) from public, anon, authenticated;
revoke all on function public.logout_wedding_admin(text) from public, anon, authenticated;
grant execute on function public.discover_wedding_admin(text, text) to anon, authenticated, service_role;
grant execute on function public.login_wedding_admin(text, text, text) to anon, authenticated, service_role;
grant execute on function public.validate_wedding_admin_session(text) to anon, authenticated, service_role;
grant execute on function public.get_wedding_admin_rsvps(text) to anon, authenticated, service_role;
grant execute on function public.logout_wedding_admin(text) to anon, authenticated, service_role;

commit;
