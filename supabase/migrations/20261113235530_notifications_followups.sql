-- Oportunia: avisos privados y agenda interna. NO realiza cobros ni mensajeria saliente.
-- Las alertas se generan exclusivamente desde eventos de reportes bancarios auditados.
create table public.customer_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  claim_event_id bigint not null unique references public.bank_recon_claim_events(id) on delete restrict,
  kind text not null check(kind in ('reporte_recibido','cotejo_extracto','reporte_rechazado')),
  title text not null check(char_length(title) between 5 and 110),
  message text not null check(char_length(message) between 10 and 350),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
comment on table public.customer_notifications is
 'Avisos privados dentro de Mi cuenta; no son SMS, WhatsApp ni confirmaciones bancarias.';
create index customer_notifications_user_created_idx on public.customer_notifications(user_id,created_at desc);

alter table public.customer_notifications enable row level security;
revoke all on public.customer_notifications from public,anon,authenticated;
grant select on public.customer_notifications to authenticated;
grant update(read_at) on public.customer_notifications to authenticated;
create policy "own notifications only" on public.customer_notifications
  for select to authenticated using(user_id=(select auth.uid()));
create policy "owner marks notification read" on public.customer_notifications
  for update to authenticated
  using(user_id=(select auth.uid()))
  with check(user_id=(select auth.uid()));

create function public.notify_customer_bank_claim_event()
returns trigger language plpgsql security definer set search_path='' as $$
declare
 v_user uuid;
 v_kind text;
 v_title text;
 v_message text;
begin
 select c.customer_user_id into v_user
 from public.bank_recon_claims c where c.id=new.claim_id;
 if v_user is null then return new; end if;
 v_kind:=case new.event_type
   when 'submitted' then 'reporte_recibido'
   when 'matched_statement' then 'cotejo_extracto'
   when 'rejected' then 'reporte_rechazado'
   else null end;
 if v_kind is null then return new; end if;
 v_title:=case new.event_type
   when 'submitted' then 'Recibimos tu referencia'
   when 'matched_statement' then 'Coincidencia con extracto importado'
   else 'Tu reporte requiere revisión' end;
 v_message:=case new.event_type
   when 'submitted' then 'Tu referencia está registrada y pendiente de revisión. Esto no confirma recepción de dinero.'
   when 'matched_statement' then 'La referencia coincide con un movimiento cargado por administración; no es validación bancaria automática.'
   else 'Administración rechazó la referencia reportada. Consulta el historial y el motivo en Mi cuenta.' end;
 insert into public.customer_notifications(user_id,claim_event_id,kind,title,message)
 values(v_user,new.id,v_kind,v_title,v_message)
 on conflict(claim_event_id) do nothing;
 return new;
end; $$;
revoke all on function public.notify_customer_bank_claim_event() from public,anon,authenticated;
create trigger notification_on_bank_claim_event
after insert on public.bank_recon_claim_events
for each row execute function public.notify_customer_bank_claim_event();

-- Also cover report events that existed before installation.
insert into public.customer_notifications(user_id,claim_event_id,kind,title,message,created_at)
select c.customer_user_id,e.id,
 case e.event_type
  when 'submitted' then 'reporte_recibido'
  when 'matched_statement' then 'cotejo_extracto'
  else 'reporte_rechazado' end,
 case e.event_type
  when 'submitted' then 'Recibimos tu referencia'
  when 'matched_statement' then 'Coincidencia con extracto importado'
  else 'Tu reporte requiere revisión' end,
 case e.event_type
  when 'submitted' then 'Tu referencia está registrada y pendiente de revisión. Esto no confirma recepción de dinero.'
  when 'matched_statement' then 'La referencia coincide con un movimiento cargado por administración; no es validación bancaria automática.'
  else 'Administración rechazó la referencia reportada. Consulta el historial y el motivo en Mi cuenta.' end,
 e.created_at
from public.bank_recon_claim_events e
join public.bank_recon_claims c on c.id=e.claim_id
where c.customer_user_id is not null
  and e.event_type in ('submitted','matched_statement','rejected')
on conflict(claim_event_id) do nothing;

-- Agenda privada de tareas. Una referencia declarada NUNCA se trata como deuda exigible.
create table public.crm_followups (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references public.customer_profiles(user_id) on delete restrict,
  category text not null check(category in ('contacto','revision_referencia','soporte','documentacion')),
  title text not null check(char_length(btrim(title)) between 8 and 160),
  due_date date not null,
  priority text not null default 'normal' check(priority in ('normal','alta')),
  status text not null default 'pending' check(status in ('pending','done','cancelled')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.crm_followups is
 'Agenda administrativa sin envío automático de mensajes. No implica cartera de deudas verificadas.';
create index crm_followups_status_date_idx on public.crm_followups(status,due_date);
create index crm_followups_customer_idx on public.crm_followups(customer_user_id,created_at desc);

create table public.crm_followup_events (
  id bigint generated always as identity primary key,
  followup_id uuid not null references public.crm_followups(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check(event_type in ('created','status_changed')),
  old_status text,
  new_status text not null check(new_status in ('pending','done','cancelled')),
  created_at timestamptz not null default now()
);
comment on table public.crm_followup_events is 'Traza append-only de creacion y cambios de estado.';

alter table public.crm_followups enable row level security;
alter table public.crm_followup_events enable row level security;
revoke all on public.crm_followups,public.crm_followup_events from public,anon,authenticated;
grant select,insert on public.crm_followups to authenticated;
grant update(status) on public.crm_followups to authenticated;
grant select on public.crm_followup_events to authenticated;
create policy "admins read followup tasks" on public.crm_followups
 for select to authenticated
 using(exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));
create policy "admins create followup tasks" on public.crm_followups
 for insert to authenticated
 with check(
   created_by=(select auth.uid())
   and status='pending'
   and exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())))
 ;
create policy "admins update followup status" on public.crm_followups
 for update to authenticated
 using(exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())))
 with check(exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));
create policy "admins read followup audit" on public.crm_followup_events
 for select to authenticated
 using(exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));

-- Trigger inserts the audit row as privileged database code; no direct client writes.
create function public.record_crm_followup_change()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
   insert into public.crm_followup_events(followup_id,actor_id,event_type,new_status)
   values(new.id,auth.uid(),'created',new.status);
 elsif new.status is distinct from old.status then
   insert into public.crm_followup_events(followup_id,actor_id,event_type,old_status,new_status)
   values(new.id,auth.uid(),'status_changed',old.status,new.status);
 end if;
 return new;
end; $$;
revoke all on function public.record_crm_followup_change() from public,anon,authenticated;
create trigger track_crm_followup_after_insert
 after insert on public.crm_followups for each row
 execute function public.record_crm_followup_change();
create trigger track_crm_followup_after_update
 after update of status on public.crm_followups for each row
 execute function public.record_crm_followup_change();

create function public.touch_crm_followup_updated_at()
returns trigger language plpgsql set search_path='' as $$
begin
 new.updated_at:=now();
 return new;
end; $$;
revoke all on function public.touch_crm_followup_updated_at() from public,anon,authenticated;
create trigger touch_crm_followup_before_update
 before update of status on public.crm_followups for each row
 execute function public.touch_crm_followup_updated_at();
