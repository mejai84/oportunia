-- Applied in Supabase Oportunia project qsclrpmkgcjobtupicyx on 2026-11-13.
-- Public read: moderated real reviews and verified real results only.
create table public.draw_reviews (
 id uuid primary key default gen_random_uuid(),
 draw_id text not null references public.draw_catalog(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 rating smallint not null check(rating between 1 and 5),
 comment text not null check(char_length(btrim(comment)) between 12 and 700),
 display_name text not null check(char_length(btrim(display_name)) between 2 and 70),
 status text not null default 'pending' check(status in ('pending','published','hidden')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(draw_id,user_id)
);
alter table public.draw_reviews enable row level security;
revoke all on public.draw_reviews from public,anon,authenticated;
grant select,insert,update on public.draw_reviews to authenticated;
grant select on public.draw_reviews to anon;
create policy "public published reviews" on public.draw_reviews for select to anon using(status='published');
create policy "authenticated own or published reviews" on public.draw_reviews for select to authenticated
 using(status='published' or user_id=(select auth.uid()) or exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));
create policy "authenticated submits own reviews" on public.draw_reviews for insert to authenticated
 with check(user_id=(select auth.uid()) and status='pending');
create policy "customers revise their own reviews for moderation" on public.draw_reviews for update to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and status='pending');
create policy "admin moderates reviews" on public.draw_reviews for update to authenticated
 using(exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())))
 with check(exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));

create table public.draw_results (
 id uuid primary key default gen_random_uuid(),
 draw_id text not null references public.draw_catalog(id) on delete restrict,
 draw_date date not null,
 winning_number text not null check(winning_number ~ '^[0-9]{4}$'),
 winner_display_name text not null check(char_length(btrim(winner_display_name)) between 2 and 80),
 result_source text not null check(char_length(btrim(result_source)) between 5 and 500),
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 unique(draw_id)
);
alter table public.draw_results enable row level security;
revoke all on public.draw_results from public,anon,authenticated;
grant select on public.draw_results to anon,authenticated;
grant insert,update,delete on public.draw_results to authenticated;
create policy "public sees verified results" on public.draw_results for select to anon using(verified_at is not null);
create policy "authenticated sees verified or admin results" on public.draw_results for select to authenticated
 using(verified_at is not null or exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));
create policy "admin inserts results" on public.draw_results for insert to authenticated
 with check(exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));
create policy "admin updates results" on public.draw_results for update to authenticated
 using(exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())))
 with check(exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));
create policy "admin deletes results" on public.draw_results for delete to authenticated
 using(exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));

-- Owner membership is granted only after verified email ownership; no password or user is created by SQL.
create or replace function public.authorize_oportunia_owner_after_email_verification()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if lower(coalesce(new.email,''))='jajl840316@gmail.com' and new.email_confirmed_at is not null then
  insert into public.oportunia_admins(user_id) values(new.id) on conflict(user_id) do nothing;
 end if;
 return new;
end; $$;
revoke all on function public.authorize_oportunia_owner_after_email_verification() from public,anon,authenticated;
create trigger oportunia_owner_verified_email after insert or update of email_confirmed_at on auth.users
for each row execute function public.authorize_oportunia_owner_after_email_verification();
insert into public.oportunia_admins(user_id)
 select id from auth.users where lower(email)='jajl840316@gmail.com' and email_confirmed_at is not null
on conflict do nothing;
