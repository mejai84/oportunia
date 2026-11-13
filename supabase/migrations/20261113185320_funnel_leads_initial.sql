-- Migración aplicada al proyecto Oportunia qsclrpmkgcjobtupicyx.
-- Embudo: registro de interés, NO compras, reservas ni pagos.
create table if not exists public.funnel_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 3 and 100),
  phone text not null check (phone ~ '^\+?[0-9]{7,15}$'),
  email text check (email is null or char_length(email) <= 254),
  contact_consent boolean not null check (contact_consent),
  marketing_consent boolean not null default false,
  utm_source text check (utm_source is null or char_length(utm_source) <= 120),
  utm_medium text check (utm_medium is null or char_length(utm_medium) <= 120),
  utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 120),
  utm_content text check (utm_content is null or char_length(utm_content) <= 120),
  utm_term text check (utm_term is null or char_length(utm_term) <= 120),
  landing_path text not null default '/embudo' check (char_length(landing_path) <= 120),
  created_at timestamptz not null default now()
);
create index if not exists idx_funnel_leads_created_at on public.funnel_leads (created_at desc);
create index if not exists idx_funnel_leads_utm_campaign on public.funnel_leads (utm_campaign);
alter table public.funnel_leads enable row level security;
revoke all on table public.funnel_leads from public, anon, authenticated;
grant insert on table public.funnel_leads to service_role;
comment on table public.funnel_leads is 'Solicitudes de información del embudo. Sin compras, reservas ni pagos. RLS sin acceso público; escrituras solo desde backend autorizado.';
