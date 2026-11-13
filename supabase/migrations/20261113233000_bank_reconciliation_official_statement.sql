-- Oportunia: ledger administrativo de conciliacion manual desde extractos.
-- No crea ventas, sorteos, oportunidades reales ni conexion a banca en linea.
-- Los archivos se originan fuera de la app; nunca se solicitan claves bancarias.
create table public.bank_recon_claims (
  id uuid primary key default gen_random_uuid(),
  bank text not null check (bank in ('BANCOLOMBIA','NEQUI')),
  account_alias text not null check (account_alias ~ '^[A-Z0-9_-]{3,40}$'),
  customer_label text not null check (char_length(btrim(customer_label)) between 2 and 120),
  customer_user_id uuid references auth.users(id) on delete set null,
  origin_channel text not null default 'OTRO' check (origin_channel in ('BANCOLOMBIA','NEQUI','BRE-B','DAVIPLATA','PSE','OTRO')),
  customer_order_reference text check (customer_order_reference is null or char_length(customer_order_reference) between 4 and 80),
  claimed_reference text not null check (claimed_reference ~ '^[A-Z0-9][A-Z0-9._/-]{3,99}$'),
  expected_amount_cop bigint not null check (expected_amount_cop between 1000 and 100000000),
  status text not null default 'pending' check (status in ('pending','matched','rejected')),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  unique (bank,account_alias,claimed_reference)
);
comment on table public.bank_recon_claims is 'Reportes operativos administrativos, NO pagos comprobados ni ventas reales.';
create table public.bank_recon_claim_events (
  id bigint generated always as identity primary key,
  claim_id uuid not null references public.bank_recon_claims(id) on delete restrict,
  actor_id uuid not null references auth.users(id),
  event_type text not null check(event_type in ('submitted','matched_statement','rejected')),
  message text not null check(char_length(message) between 6 and 350),
  created_at timestamptz not null default now()
);
comment on table public.bank_recon_claim_events is 'Historial inmutable de reportes del cliente y decisiones administrativas.';
create index bank_recon_claim_events_claim_idx on public.bank_recon_claim_events(claim_id,created_at);
create table public.bank_recon_movements (
  id uuid primary key default gen_random_uuid(),
  bank text not null check (bank in ('BANCOLOMBIA','NEQUI')),
  account_alias text not null check (account_alias ~ '^[A-Z0-9_-]{3,40}$'),
  transaction_reference text not null check (transaction_reference ~ '^[A-Z0-9][A-Z0-9._/-]{3,99}$'),
  movement_date date not null,
  amount_cop bigint not null check (amount_cop between 1000 and 100000000),
  description text not null default '' check (char_length(description) <= 300),
  source_label text not null check (char_length(source_label) between 3 and 120),
  status text not null default 'unmatched' check (status in ('unmatched','matched','ignored')),
  matched_claim_id uuid unique references public.bank_recon_claims(id),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  imported_at timestamptz not null default now(),
  imported_by uuid not null references auth.users(id),
  unique(bank,account_alias,transaction_reference),
  constraint movement_match_consistent check (
    (status='matched' and matched_claim_id is not null and reviewed_at is not null and reviewed_by is not null)
    or (status='unmatched' and matched_claim_id is null and reviewed_at is null and reviewed_by is null)
    or (status='ignored' and matched_claim_id is null and reviewed_at is not null and reviewed_by is not null)
  )
);
comment on table public.bank_recon_movements is 'Abonos declarados desde archivos importados por un administrador; origen NO validado por API bancaria.';
create table public.bank_recon_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  action text not null check (action in ('claim_created','claim_rejected','movement_imported','movement_matched','movement_ignored')),
  claim_id uuid references public.bank_recon_claims(id),
  movement_id uuid references public.bank_recon_movements(id),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index bank_recon_claims_status_idx on public.bank_recon_claims(status,created_at desc);
create index bank_recon_movements_status_idx on public.bank_recon_movements(status,movement_date desc);
create index bank_recon_audit_created_idx on public.bank_recon_audit(created_at desc);

alter table public.bank_recon_claim_events enable row level security;
alter table public.bank_recon_claims enable row level security;
alter table public.bank_recon_movements enable row level security;
alter table public.bank_recon_audit enable row level security;
revoke all on public.bank_recon_claims,public.bank_recon_claim_events,public.bank_recon_movements,public.bank_recon_audit from public,anon,authenticated;
grant select on public.bank_recon_claims,public.bank_recon_claim_events,public.bank_recon_movements,public.bank_recon_audit to authenticated;
grant usage,select on sequence public.bank_recon_audit_id_seq to postgres;
create policy "own customer claim or admin reads" on public.bank_recon_claims for select to authenticated
  using (customer_user_id=(select auth.uid()) or exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));
create policy "own claim event or admin reads" on public.bank_recon_claim_events for select to authenticated
  using (
    exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid()))
    or exists(select 1 from public.bank_recon_claims c where c.id=claim_id and c.customer_user_id=(select auth.uid()))
  );
create policy "admin reads recon movements" on public.bank_recon_movements for select to authenticated
  using (exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));
create policy "admin reads recon audit" on public.bank_recon_audit for select to authenticated
  using (exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));

-- Functions hold the only write path: server-side validation, locks, unique ids and audit.
create function public.create_bank_recon_claim(
  p_bank text,p_account_alias text,p_customer_label text,p_reference text,p_amount_cop bigint
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid := auth.uid(); v_id uuid;
begin
  if v_actor is null or not exists (select 1 from public.oportunia_admins where user_id=v_actor) then
    raise exception 'Acceso denegado';
  end if;
  insert into public.bank_recon_claims(bank,account_alias,customer_label,claimed_reference,expected_amount_cop,created_by)
  values(upper(btrim(p_bank)),upper(btrim(p_account_alias)),btrim(p_customer_label),upper(btrim(p_reference)),p_amount_cop,v_actor)
  returning id into v_id;
  insert into public.bank_recon_audit(actor_id,action,claim_id,detail)
  values(v_actor,'claim_created',v_id,jsonb_build_object('amount_cop',p_amount_cop));
  return v_id;
end; $$;

create function public.import_bank_recon_movements(p_rows jsonb,p_source_label text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid := auth.uid();
  v_row jsonb; v_bank text; v_alias text; v_reference text; v_description text;
  v_date date; v_amount bigint; v_id uuid; v_existing record;
  v_inserted integer:=0; v_duplicates integer:=0; v_source text:=btrim(coalesce(p_source_label,''));
begin
  if v_actor is null or not exists (select 1 from public.oportunia_admins where user_id=v_actor) then
    raise exception 'Acceso denegado';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 300 then
    raise exception 'Se permiten lotes entre 1 y 300 movimientos';
  end if;
  if char_length(v_source) not between 3 and 120 then raise exception 'Origen de archivo no valido'; end if;
  for v_row in select value from jsonb_array_elements(p_rows) as x(value) loop
    if jsonb_typeof(v_row) is distinct from 'object' then raise exception 'Fila mal formada'; end if;
    v_bank:=upper(btrim(coalesce(v_row->>'bank','')));
    v_alias:=upper(btrim(coalesce(v_row->>'account_alias','')));
    v_reference:=upper(btrim(coalesce(v_row->>'transaction_reference','')));
    v_description:=btrim(coalesce(v_row->>'description',''));
    if v_bank not in ('BANCOLOMBIA','NEQUI') then raise exception 'Banco no permitido'; end if;
    if v_alias !~ '^[A-Z0-9_-]{3,40}$' then raise exception 'Alias de cuenta invalido'; end if;
    if v_reference !~ '^[A-Z0-9][A-Z0-9._/-]{3,99}$' then raise exception 'Referencia bancaria invalida'; end if;
    if char_length(v_description)>300 then raise exception 'Descripcion demasiado larga'; end if;
    if coalesce(v_row->>'movement_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Fecha invalida'; end if;
    v_date:=(v_row->>'movement_date')::date;
    if v_date > current_date + 1 then raise exception 'Movimiento con fecha futura'; end if;
    if coalesce(v_row->>'amount_cop','') !~ '^[0-9]{1,9}$' then raise exception 'Valor COP invalido'; end if;
    v_amount:=(v_row->>'amount_cop')::bigint;
    if v_amount not between 1000 and 100000000 then raise exception 'Importe fuera de rango'; end if;
    insert into public.bank_recon_movements
    (bank,account_alias,transaction_reference,movement_date,amount_cop,description,source_label,imported_by)
    values(v_bank,v_alias,v_reference,v_date,v_amount,v_description,v_source,v_actor)
    on conflict (bank,account_alias,transaction_reference) do nothing returning id into v_id;
    if v_id is null then
      select movement_date,amount_cop into v_existing from public.bank_recon_movements
      where bank=v_bank and account_alias=v_alias and transaction_reference=v_reference;
      if not found or v_existing.movement_date <> v_date or v_existing.amount_cop <> v_amount then
        raise exception 'Referencia existente con fecha o valor distinto: %', v_reference;
      end if;
      v_duplicates:=v_duplicates+1;
    else
      v_inserted:=v_inserted+1;
      insert into public.bank_recon_audit(actor_id,action,movement_id,detail)
      values(v_actor,'movement_imported',v_id,jsonb_build_object('source',v_source));
    end if;
    v_id:=null;
  end loop;
  return jsonb_build_object('inserted',v_inserted,'duplicates',v_duplicates);
end; $$;

create function public.match_bank_recon_movement(p_movement_id uuid,p_claim_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_movement public.bank_recon_movements%rowtype; v_claim public.bank_recon_claims%rowtype;
begin
  if v_actor is null or not exists (select 1 from public.oportunia_admins where user_id=v_actor) then
    raise exception 'Acceso denegado';
  end if;
  select * into v_movement from public.bank_recon_movements where id=p_movement_id for update;
  select * into v_claim from public.bank_recon_claims where id=p_claim_id for update;
  if not found or v_movement.id is null or v_claim.id is null then raise exception 'No se encontro un registro'; end if;
  if v_movement.status <> 'unmatched' or v_claim.status <> 'pending' then raise exception 'El movimiento o reporte ya fue procesado'; end if;
  if v_movement.bank<>v_claim.bank or v_movement.account_alias<>v_claim.account_alias
    or v_movement.transaction_reference<>v_claim.claimed_reference
    or v_movement.amount_cop<>v_claim.expected_amount_cop then
      raise exception 'La referencia, la cuenta receptora o el valor no coinciden';
  end if;
  update public.bank_recon_claims set status='matched' where id=p_claim_id;
  update public.bank_recon_movements set status='matched',matched_claim_id=p_claim_id,
    reviewed_at=now(),reviewed_by=v_actor where id=p_movement_id;
  insert into public.bank_recon_audit(actor_id,action,claim_id,movement_id,detail)
  values(v_actor,'movement_matched',p_claim_id,p_movement_id,
    jsonb_build_object('amount_cop',v_movement.amount_cop,'source',v_movement.source_label));
  insert into public.bank_recon_claim_events(claim_id,actor_id,event_type,message)
  values(p_claim_id,v_actor,'matched_statement','La referencia coincide con un abono del extracto registrado por administración.');
  return jsonb_build_object('status','matched','movement_id',p_movement_id,'claim_id',p_claim_id);
end; $$;

create function public.close_bank_recon_item(p_kind text,p_id uuid,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_rows integer;
begin
  if v_actor is null or not exists (select 1 from public.oportunia_admins where user_id=v_actor) then
    raise exception 'Acceso denegado';
  end if;
  if char_length(btrim(coalesce(p_reason,''))) not between 10 and 300 then
    raise exception 'Indica un motivo de 10 a 300 caracteres';
  end if;
  if p_kind='movement' then
    update public.bank_recon_movements set status='ignored',reviewed_at=now(),reviewed_by=v_actor
    where id=p_id and status='unmatched';
    get diagnostics v_rows=row_count;
    if v_rows<>1 then raise exception 'Movimiento inexistente o ya procesado'; end if;
    insert into public.bank_recon_audit(actor_id,action,movement_id,detail)
    values(v_actor,'movement_ignored',p_id,jsonb_build_object('reason',btrim(p_reason)));
  elsif p_kind='claim' then
    update public.bank_recon_claims set status='rejected'
    where id=p_id and status='pending';
    get diagnostics v_rows=row_count;
    if v_rows<>1 then raise exception 'Reporte inexistente o ya procesado'; end if;
    insert into public.bank_recon_audit(actor_id,action,claim_id,detail)
    values(v_actor,'claim_rejected',p_id,jsonb_build_object('reason',btrim(p_reason)));
    insert into public.bank_recon_claim_events(claim_id,actor_id,event_type,message)
    values(p_id,v_actor,'rejected',btrim(p_reason));
  else
    raise exception 'Tipo no valido';
  end if;
end; $$;

revoke all on function public.create_bank_recon_claim(text,text,text,text,bigint) from public,anon,authenticated;
revoke all on function public.import_bank_recon_movements(jsonb,text) from public,anon,authenticated;
revoke all on function public.match_bank_recon_movement(uuid,uuid) from public,anon,authenticated;
revoke all on function public.close_bank_recon_item(text,uuid,text) from public,anon,authenticated;
grant execute on function public.create_bank_recon_claim(text,text,text,text,bigint) to authenticated;
grant execute on function public.import_bank_recon_movements(jsonb,text) to authenticated;
grant execute on function public.match_bank_recon_movement(uuid,uuid) to authenticated;
grant execute on function public.close_bank_recon_item(text,uuid,text) to authenticated;


-- Client creates their own claim; authentication identity is always auth.uid().
-- No app secrets, bank login credentials, financial confirmation or numbers allocation.
create function public.submit_customer_bank_recon_claim(
  p_bank text, p_origin_channel text, p_customer_label text,
  p_reference text, p_amount_cop bigint, p_order_reference text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid:=auth.uid(); v_id uuid;
  v_bank text:=upper(btrim(coalesce(p_bank,'')));
  v_channel text:=upper(btrim(coalesce(p_origin_channel,'')));
  v_reference text:=upper(btrim(coalesce(p_reference,'')));
  v_label text:=btrim(coalesce(p_customer_label,''));
  v_order text:=nullif(btrim(coalesce(p_order_reference,'')),'');
  v_alias text;
begin
  if v_actor is null then raise exception 'Inicia sesión para registrar el reporte'; end if;
  if v_bank not in ('BANCOLOMBIA','NEQUI') then raise exception 'Cuenta de destino inválida'; end if;
  if v_channel not in ('BANCOLOMBIA','NEQUI','BRE-B','DAVIPLATA','PSE','OTRO') then raise exception 'Canal inválido'; end if;
  if char_length(v_label) not between 2 and 120 then raise exception 'Nombre inválido'; end if;
  if v_reference !~ '^[A-Z0-9][A-Z0-9._/-]{3,99}$' then raise exception 'Referencia inválida'; end if;
  if p_amount_cop not between 1000 and 100000000 then raise exception 'Valor de reporte inválido'; end if;
  if v_order is not null and char_length(v_order) not between 4 and 80 then raise exception 'Código de oportunidad inválido'; end if;
  if (select count(*) from public.bank_recon_claims
      where customer_user_id=v_actor and created_at>now()-interval '24 hours')>=20 then
    raise exception 'Límite de reportes del día alcanzado';
  end if;
  v_alias:=case when v_bank='BANCOLOMBIA' then 'BANCOLOMBIA_PRINCIPAL' else 'NEQUI_PRINCIPAL' end;
  insert into public.bank_recon_claims
    (bank,account_alias,customer_label,customer_user_id,origin_channel,
    customer_order_reference,claimed_reference,expected_amount_cop,created_by)
  values (v_bank,v_alias,v_label,v_actor,v_channel,v_order,v_reference,p_amount_cop,v_actor)
  returning id into v_id;
  insert into public.bank_recon_claim_events(claim_id,actor_id,event_type,message)
  values(v_id,v_actor,'submitted','Recibimos tu referencia y quedó pendiente de conciliación.');
  insert into public.bank_recon_audit(actor_id,action,claim_id,detail)
  values(v_actor,'claim_created',v_id,jsonb_build_object('customer_submitted',true));
  return v_id;
end; $$;
revoke all on function public.submit_customer_bank_recon_claim(text,text,text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.submit_customer_bank_recon_claim(text,text,text,text,bigint,text) to authenticated;
