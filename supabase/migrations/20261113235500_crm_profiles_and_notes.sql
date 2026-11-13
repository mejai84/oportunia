-- CRM Oportunia: perfil de cada usuario autenticado y notas internas append-only.
-- NO representa clientes compradores, ni pagos, ventas, reservas o participaciones reales.
create table public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '' check (char_length(email)<=254),
  display_name text not null default '' check (char_length(display_name)<=100),
  phone text not null default '' check (phone='' or phone ~ '^[+]?[0-9]{7,15}
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.customer_profiles is 'Directorio de cuentas Oportunia; no representa ventas ni compradores verificados.';

create table public.customer_crm_notes (
  id bigint generated always as identity primary key,
  customer_user_id uuid not null references public.customer_profiles(user_id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  category text not null check(category in ('seguimiento','soporte','pagos','otro')),
  body text not null check(char_length(btrim(body)) between 5 and 1000),
  created_at timestamptz not null default now()
);
comment on table public.customer_crm_notes is 'Observaciones internas de administración; historial inmutable, no accesible a clientes.';
create index customer_crm_notes_customer_time_idx on public.customer_crm_notes(customer_user_id,created_at desc);

alter table public.customer_profiles enable row level security;
alter table public.customer_crm_notes enable row level security;
revoke all on public.customer_profiles,public.customer_crm_notes from public,anon,authenticated;
grant select on public.customer_profiles to authenticated;
grant update (display_name,phone,marketing_consent) on public.customer_profiles to authenticated;
grant select,insert on public.customer_crm_notes to authenticated;
grant usage,select on sequence public.customer_crm_notes_id_seq to authenticated;

create policy "customer reads own profile or admin lists profiles"
  on public.customer_profiles for select to authenticated
  using (
    user_id=(select auth.uid())
    or exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid()))
  );
create policy "customer edits own contact data"
  on public.customer_profiles for update to authenticated
  using (user_id=(select auth.uid()))
  with check (user_id=(select auth.uid()));
create policy "admin reads internal CRM notes"
  on public.customer_crm_notes for select to authenticated
  using (exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));
create policy "admin adds CRM note"
  on public.customer_crm_notes for insert to authenticated
  with check (
    author_user_id=(select auth.uid())
    and exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid()))
  );

create function public.sync_oportunia_customer_profile()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.customer_profiles(user_id,email,phone,created_at)
  values(new.id,lower(coalesce(new.email,'')),coalesce(new.phone,''),coalesce(new.created_at,now()))
  on conflict(user_id) do update set email=excluded.email,updated_at=now();
  return new;
end; $$;
revoke all on function public.sync_oportunia_customer_profile() from public,anon,authenticated;
create trigger oportunia_customer_profile_sync
  after insert or update of email on auth.users
  for each row execute function public.sync_oportunia_customer_profile();
insert into public.customer_profiles(user_id,email,phone,created_at)
select id,lower(coalesce(email,'')),coalesce(phone,''),coalesce(created_at,now()) from auth.users
on conflict(user_id) do nothing;
),
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.customer_profiles is 'Directorio de cuentas Oportunia; no representa ventas ni compradores verificados.';

create table public.customer_crm_notes (
  id bigint generated always as identity primary key,
  customer_user_id uuid not null references public.customer_profiles(user_id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  category text not null check(category in ('seguimiento','soporte','pagos','otro')),
  body text not null check(char_length(btrim(body)) between 5 and 1000),
  created_at timestamptz not null default now()
);
comment on table public.customer_crm_notes is 'Observaciones internas de administración; historial inmutable, no accesible a clientes.';
create index customer_crm_notes_customer_time_idx on public.customer_crm_notes(customer_user_id,created_at desc);

alter table public.customer_profiles enable row level security;
alter table public.customer_crm_notes enable row level security;
revoke all on public.customer_profiles,public.customer_crm_notes from public,anon,authenticated;
grant select on public.customer_profiles to authenticated;
grant update (display_name,phone,marketing_consent) on public.customer_profiles to authenticated;
grant select,insert on public.customer_crm_notes to authenticated;
grant usage,select on sequence public.customer_crm_notes_id_seq to authenticated;

create policy "customer reads own profile or admin lists profiles"
  on public.customer_profiles for select to authenticated
  using (
    user_id=(select auth.uid())
    or exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid()))
  );
create policy "customer edits own contact data"
  on public.customer_profiles for update to authenticated
  using (user_id=(select auth.uid()))
  with check (user_id=(select auth.uid()));
create policy "admin reads internal CRM notes"
  on public.customer_crm_notes for select to authenticated
  using (exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));
create policy "admin adds CRM note"
  on public.customer_crm_notes for insert to authenticated
  with check (
    author_user_id=(select auth.uid())
    and exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid()))
  );

create function public.sync_oportunia_customer_profile()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.customer_profiles(user_id,email,phone,created_at)
  values(new.id,lower(coalesce(new.email,'')),coalesce(new.phone,''),coalesce(new.created_at,now()))
  on conflict(user_id) do update set email=excluded.email,updated_at=now();
  return new;
end; $$;
revoke all on function public.sync_oportunia_customer_profile() from public,anon,authenticated;
create trigger oportunia_customer_profile_sync
  after insert or update of email on auth.users
  for each row execute function public.sync_oportunia_customer_profile();
insert into public.customer_profiles(user_id,email,phone,created_at)
select id,lower(coalesce(email,'')),coalesce(phone,''),coalesce(created_at,now()) from auth.users
on conflict(user_id) do nothing;
