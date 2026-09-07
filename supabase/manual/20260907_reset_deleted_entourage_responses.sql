-- Run manually in the dreamz-platform SQL Editor.
-- Resets only Cloyd & Cyrin entourage rows whose response-history row was deleted.

begin;

update public.wedding_entourage as e
set response_status = 'pending',
    responded_at = null,
    updated_at = now()
from public.wedding_events as w
where w.id = e.wedding_id
  and w.slug = 'cloyd-cyrin'
  and not exists (
    select 1
    from public.wedding_entourage_responses as r
    where r.entourage_id = e.id
  );

commit;
