-- Reconcile only the Cloyd & Cyrin proposal list to the approved 27 recipients.
-- Rows outside this exact role/name list are deleted from wedding_entourage.

begin;

create temporary table approved_proposal_recipients (
  role text not null,
  full_name text not null,
  normalized_full_name text not null,
  primary key (role, normalized_full_name)
) on commit drop;

insert into approved_proposal_recipients (role, full_name, normalized_full_name)
values
  ('Maid of Honor', 'Mary Grace Mendania', public.normalize_person_name('Mary Grace Mendania')),
  ('Best Man', 'Noel Rashed Peñacuba', public.normalize_person_name('Noel Rashed Peñacuba')),
  ('Bridesmaid', 'Jolina Mana-ay', public.normalize_person_name('Jolina Mana-ay')),
  ('Bridesmaid', 'Emely Keith Belonta', public.normalize_person_name('Emely Keith Belonta')),
  ('Bridesmaid', 'Riza Mae Morales', public.normalize_person_name('Riza Mae Morales')),
  ('Bridesmaid', 'Nenen More', public.normalize_person_name('Nenen More')),
  ('Bridesmaid', 'Nofe Glydell Peñacuba', public.normalize_person_name('Nofe Glydell Peñacuba')),
  ('Groomsman', 'Cyberhelle Ricaplaza', public.normalize_person_name('Cyberhelle Ricaplaza')),
  ('Groomsman', 'Ralfh Laurence Deles', public.normalize_person_name('Ralfh Laurence Deles')),
  ('Groomsman', 'Kurt Adrian Mendania', public.normalize_person_name('Kurt Adrian Mendania')),
  ('Groomsman', 'Ezekiel Mendania', public.normalize_person_name('Ezekiel Mendania')),
  ('Groomsman', 'Jason Client Pagador', public.normalize_person_name('Jason Client Pagador')),
  ('Candle Sponsor', 'Mr. & Mrs. Charlie Perez', public.normalize_person_name('Mr. & Mrs. Charlie Perez')),
  ('Cord Sponsor', 'Mr. & Mrs. Carl John Argando', public.normalize_person_name('Mr. & Mrs. Carl John Argando')),
  ('Veil Sponsor', 'Mr. & Mrs. Roberto Argando', public.normalize_person_name('Mr. & Mrs. Roberto Argando')),
  ('Flower Girl', 'Maria Zhavia Mendania', public.normalize_person_name('Maria Zhavia Mendania')),
  ('Flower Girl', 'Jewel Jade Mendania', public.normalize_person_name('Jewel Jade Mendania')),
  ('Flower Girl', 'Gianna Cuizon', public.normalize_person_name('Gianna Cuizon')),
  ('Flower Girl', 'Yuna Argando', public.normalize_person_name('Yuna Argando')),
  ('Flower Girl', 'Clieanna Felize Perez', public.normalize_person_name('Clieanna Felize Perez')),
  ('Flower Girl', 'Zhydyn Diotay', public.normalize_person_name('Zhydyn Diotay')),
  ('Flower Girl', 'Elly Brynn Marco', public.normalize_person_name('Elly Brynn Marco')),
  ('Flower Girl', 'Eliana Zale Villarin', public.normalize_person_name('Eliana Zale Villarin')),
  ('Ring Bearer', 'Ziandre Danlly Ortega', public.normalize_person_name('Ziandre Danlly Ortega')),
  ('Bible Bearer', 'Alejo Ezekiel Dollasa', public.normalize_person_name('Alejo Ezekiel Dollasa')),
  ('Coin Bearer', 'Chaiff Antoine Perez', public.normalize_person_name('Chaiff Antoine Perez')),
  ('Banner Bearer', 'Redan Ortega Jr.', public.normalize_person_name('Redan Ortega Jr.'));

with current_wedding as (
  select id from public.wedding_events where slug = 'cloyd-cyrin'
)
insert into public.wedding_entourage (
  wedding_id, role, full_name, normalized_full_name
)
select w.id, a.role, a.full_name, a.normalized_full_name
from current_wedding as w
cross join approved_proposal_recipients as a
on conflict (wedding_id, normalized_full_name, role) do update
set full_name = excluded.full_name,
    updated_at = now();

delete from public.wedding_entourage as e
using public.wedding_events as w
where w.id = e.wedding_id
  and w.slug = 'cloyd-cyrin'
  and not exists (
    select 1
    from approved_proposal_recipients as a
    where a.role = e.role
      and a.normalized_full_name = e.normalized_full_name
  );

commit;
