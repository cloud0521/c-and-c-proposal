-- Explicit person count for combined entourage invitations such as Mr. & Mrs.

begin;

alter table public.wedding_entourage
  add column if not exists party_size smallint not null default 1
  check (party_size between 1 and 10);

update public.wedding_entourage e
set party_size = case
  when e.full_name like 'Mr. & Mrs.%' then 2
  else 1
end
from public.wedding_events w
where w.id = e.wedding_id
  and w.slug = 'cloyd-cyrin';

drop function public.get_wedding_admin_entourage_responses(text);

create or replace function public.get_wedding_admin_entourage_responses(p_session_token text)
returns table(
  proposal_id uuid,
  person_name text,
  role text,
  party_size smallint,
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
  update private.wedding_admin_sessions set last_used_at = now()
  where token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex');

  return query
  select e.id, e.full_name, e.role, e.party_size, e.response_status,
         latest.message, e.responded_at
  from public.wedding_entourage e
  left join lateral (
    select r.message from public.wedding_entourage_responses r
    where r.entourage_id = e.id order by r.created_at desc limit 1
  ) latest on true
  where e.wedding_id = v_wedding_id
  order by case when e.responded_at is null then 1 else 0 end,
           e.responded_at desc nulls last, e.full_name;
end;
$function$;

revoke all on function public.get_wedding_admin_entourage_responses(text)
  from public, anon, authenticated;
grant execute on function public.get_wedding_admin_entourage_responses(text)
  to anon, authenticated, service_role;

commit;
