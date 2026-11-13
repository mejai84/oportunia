-- Oportunia · Supabase marketing catalog. Applied 2026-11-13.
-- Marketing only: no real payments, reservations, winners or sales counters.
create table public.oportunia_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.oportunia_admins enable row level security;
revoke all on public.oportunia_admins from public, anon, authenticated;
grant select on public.oportunia_admins to authenticated;
create policy "admins can read own membership" on public.oportunia_admins for select to authenticated
  using (user_id = (select auth.uid()));

create table public.draw_catalog (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  title text not null check (char_length(title) between 5 and 90),
  prize text not null check (char_length(prize) between 2 and 90),
  description text not null default '' check (char_length(description) <= 200),
  enabled boolean not null default false,
  status text not null default 'preview' check (status in ('preview','coming_soon','closed')),
  display_order integer not null default 0 check (display_order between 0 and 10000),
  hero_image_url text check (hero_image_url is null or char_length(hero_image_url) <= 2048),
  prize_image_url text check (prize_image_url is null or char_length(prize_image_url) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.draw_catalog enable row level security;
revoke all on public.draw_catalog from public, anon, authenticated;
grant select on public.draw_catalog to anon, authenticated;
grant insert, update, delete on public.draw_catalog to authenticated;
create policy "anonymous reads published catalog" on public.draw_catalog for select to anon using (enabled);
create policy "authenticated reads published or admin catalog" on public.draw_catalog for select to authenticated
  using (enabled or exists (select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));
create policy "admins insert catalog entries" on public.draw_catalog for insert to authenticated
  with check (exists (select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));
create policy "admins update catalog entries" on public.draw_catalog for update to authenticated
  using (exists (select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())))
  with check (exists (select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));
create policy "admins delete catalog entries" on public.draw_catalog for delete to authenticated
  using (exists (select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));

insert into public.draw_catalog(id,title,prize,description,enabled,status,display_order,hero_image_url,prize_image_url)
values('principal','Sorteo iPhone 18','iPhone 18',
'Conoce la propuesta de 50 números por oportunidad: 10 elegidos o automáticos y 40 adicionales.',
true,'preview',1,'/raffles/iphone18-hero.svg','/raffles/iphone18-product.svg');

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('draw-media','draw-media',true,6291456,array['image/jpeg','image/png','image/webp']);
create policy "oportunia admins upload draw media" on storage.objects for insert to authenticated
  with check (bucket_id='draw-media' and exists (select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));
create policy "oportunia admins update draw media" on storage.objects for update to authenticated
  using (bucket_id='draw-media' and exists (select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())))
  with check (bucket_id='draw-media' and exists (select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));
create policy "oportunia admins delete draw media" on storage.objects for delete to authenticated
  using (bucket_id='draw-media' and exists (select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));
