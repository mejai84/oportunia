-- Country-specific legal route without assuming any foreign jurisdiction is exempt.
-- Historical COP flows stay separate and unchanged; all new countries fail closed.
alter table public.commerce_draws
 add column country_code text not null default 'CO'
   check(country_code ~ '^[A-Z]{2}$'),
 add column legal_mode text not null default 'permit_required'
   check(legal_mode in ('permit_required','no_permit_required')),
 add column legal_basis text not null default '',
 add column legal_basis_url text not null default '';
alter table public.commerce_draws drop constraint permit_required_before_sales;
alter table public.commerce_draws add constraint commerce_jurisdiction_sales_guard
check (
  legal_mode <> 'no_permit_required' or country_code <> 'CO'
);
alter table public.commerce_draws add constraint commerce_legal_evidence_before_sales
check (
  not sales_enabled or (
    legal_checked_at is not null and legal_checked_by is not null
    and scheme_10_40_authorized
    and rules_url ~ '^https://[^ ]+$'
    and authorized_from is not null and authorized_until is not null
    and authorized_until >= authorized_from
    and length(btrim(operator_name)) >= 3
    and (
      (legal_mode='permit_required'
       and length(btrim(authority_name))>=3
       and length(btrim(authorization_reference))>=5
       and authorization_document_url ~ '^https://[^ ]+$')
      or
      (legal_mode='no_permit_required'
       and country_code<>'CO'
       and length(btrim(legal_basis))>=100
       and legal_basis_url ~ '^https://[^ ]+$')
    )
  )
);

create or replace function public.guard_commerce_country_on_existing_orders()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if (new.country_code is distinct from old.country_code
  or new.legal_mode is distinct from old.legal_mode)
   and exists(select 1 from public.commerce_orders o where o.draw_id=old.draw_id)
 then raise exception 'No se puede cambiar el país ni la modalidad legal de una edición con pedidos existentes';end if;
 return new;
end $$;
create trigger commerce_country_immutable_after_orders
 before update on public.commerce_draws for each row
 execute function public.guard_commerce_country_on_existing_orders();
revoke execute on function public.guard_commerce_country_on_existing_orders() from public,anon,authenticated;

alter table public.commerce_orders
 add column country_code_at_purchase text,
 add column legal_mode_at_purchase text,
 add column legal_basis_url_at_purchase text;
create or replace function public.capture_commerce_order_terms()
returns trigger language plpgsql security definer set search_path='' as $$
declare c public.commerce_draws%rowtype;
begin
 select * into c from public.commerce_draws where draw_id=new.draw_id;
 if c.draw_id is null or not c.sales_enabled or c.rules_url=''
 then raise exception 'La edición no tiene documentación comercial completa';end if;
 if c.legal_mode='permit_required'
  and (c.authorization_reference='' or c.operator_name='') then
 raise exception 'Faltan los datos del permiso obligatorio';end if;
 if c.legal_mode='no_permit_required'
  and (c.country_code='CO' or length(btrim(c.legal_basis))<100 or c.legal_basis_url='')
 then raise exception 'No hay fundamento jurídico comprobable para operar sin licencia';end if;
 if c.country_code<>'CO' and not exists(
  select 1 from public.commerce_country_verifications v
  where v.user_id=new.user_id and v.country_code=c.country_code and v.expires_at>now()
 ) then raise exception 'Tu país de residencia debe verificarse antes de realizar esta reserva';end if;
 new.rules_url_at_purchase:=c.rules_url;
 new.authorization_reference_at_purchase:=case when c.legal_mode='permit_required'
   then c.authorization_reference else null end;
 new.operator_name_at_purchase:=c.operator_name;
 new.country_code_at_purchase:=c.country_code;
 new.legal_mode_at_purchase:=c.legal_mode;
 new.legal_basis_url_at_purchase:=case when c.legal_mode='no_permit_required'
   then c.legal_basis_url else null end;
 return new;
end $$;

-- Verified country is a staff decision, never the user's mutable metadata.
create table public.commerce_country_verifications(
 user_id uuid not null references auth.users(id) on delete cascade,
 country_code text not null check(country_code ~ '^[A-Z]{2}$' and country_code<>'CO'),
 verified_at timestamptz not null default now(),
 verified_by uuid not null references auth.users(id),
 expires_at timestamptz not null check(expires_at>verified_at),
 review_note text not null check(length(btrim(review_note))>=20),
 primary key(user_id,country_code)
);
alter table public.commerce_country_verifications enable row level security;
revoke all on public.commerce_country_verifications from anon,authenticated;
grant select on public.commerce_country_verifications to authenticated;
create policy "buyer reads their country eligibility" on public.commerce_country_verifications
 for select to authenticated using(
 user_id=(select auth.uid()) or public.staff_has_permission('admin.dashboard'));

create table public.commerce_country_requests(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 country_code text not null check(country_code ~ '^[A-Z]{2}$' and country_code<>'CO'),
 status text not null default 'pending'
  check(status in ('pending','approved','rejected')),
 requested_at timestamptz not null default now(),
 decided_at timestamptz,
 decided_by uuid references auth.users(id),
 decision_note text,
 constraint resolved_country_request_has_reviewer check(
  (status='pending' and decided_at is null and decided_by is null)
  or (status in ('approved','rejected') and decided_at is not null and decided_by is not null)
 )
);
create unique index commerce_country_one_pending
 on public.commerce_country_requests(user_id,country_code) where status='pending';
create index commerce_country_pending_queue
 on public.commerce_country_requests(status,requested_at);
alter table public.commerce_country_requests enable row level security;
revoke all on public.commerce_country_requests from anon,authenticated;
grant select on public.commerce_country_requests to authenticated;
create policy "buyer reads own country requests" on public.commerce_country_requests
 for select to authenticated using(
 user_id=(select auth.uid()) or public.staff_has_permission('admin.dashboard'));

comment on column public.commerce_draws.legal_mode is
 'Permit required vs. evidence-supported exemption, by a named ISO country. Never determines legal status automatically.';
comment on table public.commerce_country_verifications is
 'Manually reviewed residency eligibility for NON-Colombian editions. Not a statutory identity verification service.';
