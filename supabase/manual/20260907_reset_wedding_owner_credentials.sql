-- Private operator-only credential reset helper.
-- Never grant this function to browser roles.

begin;

create or replace function private.reset_wedding_admin_credentials(p_wedding_slug text)
returns table(admin_code text, admin_password text)
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_wedding_id uuid;
  v_code text;
  v_password text;
begin
  select id into v_wedding_id
  from public.wedding_events
  where slug = btrim(p_wedding_slug);
  if not found then raise exception 'Wedding not found'; end if;

  loop
    v_code := private.random_wedding_admin_code(5);
    exit when not exists (
      select 1 from private.wedding_admin_credentials
      where admin_code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex')
        and wedding_id <> v_wedding_id
    );
  end loop;
  v_password := private.random_wedding_admin_code(5);

  insert into private.wedding_admin_credentials(
    wedding_id, admin_code_hash, admin_password_hash
  ) values (
    v_wedding_id,
    encode(extensions.digest(v_code, 'sha256'), 'hex'),
    extensions.crypt(v_password, extensions.gen_salt('bf', 12))
  )
  on conflict (wedding_id) do update set
    admin_code_hash = excluded.admin_code_hash,
    admin_password_hash = excluded.admin_password_hash,
    updated_at = now();

  delete from private.wedding_admin_sessions where wedding_id = v_wedding_id;
  delete from private.wedding_admin_login_attempts;

  return query select v_code, v_password;
end;
$function$;

revoke all on function private.reset_wedding_admin_credentials(text)
  from public, anon, authenticated;

commit;
