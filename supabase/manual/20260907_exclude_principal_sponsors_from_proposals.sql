-- Run manually in the dreamz-platform SQL Editor.
-- Principal Sponsors remain stored but cannot appear in the public proposal search.

begin;

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

revoke all on function public.search_wedding_entourage(text, text)
  from public, anon, authenticated;
grant execute on function public.search_wedding_entourage(text, text)
  to anon, authenticated, service_role;

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

revoke all on function public.respond_to_wedding_entourage(text, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.respond_to_wedding_entourage(text, uuid, text, text)
  to anon, authenticated, service_role;

commit;
