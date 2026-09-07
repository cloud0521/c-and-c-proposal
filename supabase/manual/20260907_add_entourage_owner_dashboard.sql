-- Read-only entourage response feed for a valid Wedding owner session.

begin;

create or replace function public.get_wedding_admin_entourage_responses(p_session_token text)
returns table(
  proposal_id uuid,
  person_name text,
  role text,
  response text,
  message text,
  responded_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_token text := lower(btrim(coalesce(p_session_token, '')));
  v_wedding_id uuid;
begin
  if v_token !~ '^[0-9a-f]{64}$' then return; end if;

  select s.wedding_id into v_wedding_id
  from private.wedding_admin_sessions s
  where s.token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex')
    and s.expires_at > now();
  if not found then return; end if;

  update private.wedding_admin_sessions
  set last_used_at = now()
  where token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex');

  return query
  select
    e.id,
    e.full_name,
    e.role,
    e.response_status,
    latest.message,
    e.responded_at
  from public.wedding_entourage e
  left join lateral (
    select r.message
    from public.wedding_entourage_responses r
    where r.entourage_id = e.id
    order by r.created_at desc
    limit 1
  ) latest on true
  where e.wedding_id = v_wedding_id
  order by
    case when e.responded_at is null then 1 else 0 end,
    e.responded_at desc nulls last,
    e.full_name;
end;
$function$;

revoke all on function public.get_wedding_admin_entourage_responses(text)
  from public, anon, authenticated;
grant execute on function public.get_wedding_admin_entourage_responses(text)
  to anon, authenticated, service_role;

commit;
