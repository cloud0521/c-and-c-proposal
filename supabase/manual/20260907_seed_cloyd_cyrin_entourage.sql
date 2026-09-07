-- Run after 20260907_secure_wedding_api.sql in the dreamz-platform SQL Editor.
-- Idempotently creates/updates the event and current proposal entourage list.

begin;

insert into public.wedding_events (
  slug, couple_names, partner_one_name, partner_two_name, wedding_date,
  timezone, status, invitation_enabled, entourage_enabled, rsvp_enabled
) values (
  'cloyd-cyrin', 'Cloyd & Cyrin', 'Cloyd', 'Cyrin', date '2026-12-19',
  'Asia/Manila', 'active', true, true, true
)
on conflict (slug) do update set
  couple_names = excluded.couple_names,
  partner_one_name = excluded.partner_one_name,
  partner_two_name = excluded.partner_two_name,
  wedding_date = excluded.wedding_date,
  timezone = excluded.timezone,
  status = excluded.status,
  invitation_enabled = excluded.invitation_enabled,
  entourage_enabled = excluded.entourage_enabled,
  rsvp_enabled = excluded.rsvp_enabled,
  updated_at = now();

with current_wedding as (
  select id from public.wedding_events where slug = 'cloyd-cyrin'
), current_entourage(role, full_name) as (
  values
    ('Maid of Honor', 'Mary Grace Mendania'),
    ('Best Man', 'Noel Rashed Peñacuba'),
    ('Bridesmaid', 'Jolina Mana-ay'),
    ('Bridesmaid', 'Emely Keith Belonta'),
    ('Bridesmaid', 'Riza Mae Morales'),
    ('Bridesmaid', 'Nenen More'),
    ('Bridesmaid', 'Nofe Glydell Peñacuba'),
    ('Groomsman', 'Cyberhelle Ricaplaza'),
    ('Groomsman', 'Ralfh Laurence Deles'),
    ('Groomsman', 'Kurt Adrian Mendania'),
    ('Groomsman', 'Ezekiel Mendania'),
    ('Groomsman', 'Jason Client Pagador'),
    ('Candle Sponsor', 'Mr. & Mrs. Charlie Perez'),
    ('Cord Sponsor', 'Mr. & Mrs. Carl John Argando'),
    ('Veil Sponsor', 'Mr. & Mrs. Roberto Argando'),
    ('Flower Girl', 'Maria Zhavia Mendania'),
    ('Flower Girl', 'Jewel Jade Mendania'),
    ('Flower Girl', 'Gianna Cuizon'),
    ('Flower Girl', 'Yuna Argando'),
    ('Flower Girl', 'Clieanna Felize Perez'),
    ('Flower Girl', 'Zhydyn Diotay'),
    ('Flower Girl', 'Elly Brynn Marco'),
    ('Flower Girl', 'Eliana Zale Villarin'),
    ('Ring Bearer', 'Ziandre Danlly Ortega'),
    ('Bible Bearer', 'Alejo Ezekiel Dollasa'),
    ('Coin Bearer', 'Chaiff Antoine Perez'),
    ('Banner Bearer', 'Redan Ortega Jr.')
)
insert into public.wedding_entourage (
  wedding_id, full_name, normalized_full_name, role
)
select
  w.id,
  e.full_name,
  public.normalize_person_name(e.full_name),
  e.role
from current_wedding as w
cross join current_entourage as e
on conflict (wedding_id, normalized_full_name, role) do update set
  full_name = excluded.full_name,
  updated_at = now();

commit;
