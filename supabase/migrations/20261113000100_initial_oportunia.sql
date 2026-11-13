-- Oportunia: estructura INICIAL, no habilita escrituras públicas.
-- Los números y pagos reales requerirán funciones transaccionales
-- y un servicio backend autenticado, aún NO implementados.
create extension if not exists pgcrypto;

create table if not exists public.draws (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  price_cop integer not null default 50000 check (price_cop > 0),
  max_opportunities integer not null default 200 check (max_opportunities > 0),
  status text not null default 'draft' check (status in ('draft','sale','collection','review','ready','closed')),
  sold_out_at timestamptz,
  collection_deadline_at timestamptz,
  official_draw_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  phone text not null,
  email text,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  plan text not null check (plan in ('contado','dos-cuotas','tres-cuotas')),
  status text not null default 'pending' check (status in ('pending','financed','paid','expired','cancelled')),
  paid_cop integer not null default 0 check (paid_cop between 0 and 50000),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (draw_id, id)
);

create table if not exists public.opportunity_numbers (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null,
  opportunity_id uuid not null,
  number smallint not null check (number between 0 and 9999),
  kind text not null check (kind in ('chosen','random')),
  state text not null default 'reserved' check (state in ('reserved','assigned','eligible')),
  created_at timestamptz not null default now(),
  foreign key (draw_id, opportunity_id) references public.opportunities(draw_id, id) on delete restrict,
  unique (draw_id, number),
  unique (opportunity_id, number)
);

create table if not exists public.payment_reports (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete restrict,
  amount_cop integer not null check (amount_cop > 0 and amount_cop % 1000 = 0),
  method text not null,
  reference text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reported_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.payment_reports(id) on delete restrict,
  opportunity_id uuid not null references public.opportunities(id) on delete restrict,
  amount_cop integer not null check (amount_cop > 0),
  confirmed_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_opportunities_customer on public.opportunities(customer_id);
create index if not exists idx_opportunities_draw on public.opportunities(draw_id);
create index if not exists idx_reports_status on public.payment_reports(status);
create index if not exists idx_numbers_opportunity on public.opportunity_numbers(opportunity_id);

alter table public.draws enable row level security;
alter table public.customers enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_numbers enable row level security;
alter table public.payment_reports enable row level security;
alter table public.payments enable row level security;
alter table public.audit_events enable row level security;

-- DENY BY DEFAULT: no public/authenticated policies yet.
-- Implement RLS, role separation and privileged server functions before
-- allowing access to any sensitive customer/payment data.
