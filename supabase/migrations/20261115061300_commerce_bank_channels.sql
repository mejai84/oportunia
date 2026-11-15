-- The owner publishes VERIFIED destination account details; never invent bank numbers.
create table public.commerce_payment_channels(
 bank text primary key check(bank in ('BANCOLOMBIA','NEQUI')),
 account_number text not null check(account_number ~ '^[0-9]{7,20}$'),
 account_holder text not null check(length(btrim(account_holder)) between 5 and 120),
 account_type text not null check(account_type in ('AHORROS','CORRIENTE','NEQUI')),
 enabled boolean not null default false,
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now()
);
alter table public.commerce_payment_channels enable row level security;
revoke all on public.commerce_payment_channels from anon,authenticated;
grant select on public.commerce_payment_channels to authenticated;
create policy "bank account destination visible if published or owner" on public.commerce_payment_channels
 for select to authenticated using(enabled or
 exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));
create or replace function public.configure_commerce_payment_channel(
 p_bank text,p_account_number text,p_account_holder text,p_account_type text,p_enabled boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); b text:=upper(btrim(coalesce(p_bank,'')));
begin
 if actor is null or not exists(select 1 from public.oportunia_admins a where a.user_id=actor)
 then raise exception 'Solo propietario puede establecer cuentas receptoras';end if;
 if b not in ('BANCOLOMBIA','NEQUI') or
 coalesce(p_account_number,'') !~ '^[0-9]{7,20}$' or
 length(btrim(coalesce(p_account_holder,''))) not between 5 and 120 or
 p_account_type not in ('AHORROS','CORRIENTE','NEQUI') or
 (b='NEQUI' and p_account_type<>'NEQUI') or
 (b='BANCOLOMBIA' and p_account_type='NEQUI')
 then raise exception 'Datos de cuenta inválidos';end if;
 insert into public.commerce_payment_channels(
 bank,account_number,account_holder,account_type,enabled,updated_by,updated_at)
 values(b,p_account_number,btrim(p_account_holder),p_account_type,coalesce(p_enabled,false),actor,now())
 on conflict(bank) do update set account_number=excluded.account_number,
 account_holder=excluded.account_holder,account_type=excluded.account_type,
 enabled=excluded.enabled,updated_by=actor,updated_at=now();
 if exists(select 1 from public.commerce_draws where sales_enabled)
 and not exists(select 1 from public.commerce_payment_channels where enabled)
 then raise exception 'No puedes quitar la última cuenta receptora con ventas activas';end if;
 return coalesce(p_enabled,false);
end $$;

-- Fail closed: no edition can start collecting orders without bank account details.
create or replace function public.prevent_unconfigured_commerce_draw()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.sales_enabled and not exists(select 1 from public.commerce_payment_channels x where x.enabled)
 then raise exception 'Publica al menos una cuenta de destino antes de activar ventas';end if;
 return new;
end $$;
create trigger commerce_requires_payment_channel
 before insert or update on public.commerce_draws
 for each row execute function public.prevent_unconfigured_commerce_draw();
revoke all on function public.configure_commerce_payment_channel(text,text,text,text,boolean)
 from public,anon;
grant execute on function public.configure_commerce_payment_channel(text,text,text,text,boolean)
 to authenticated;
