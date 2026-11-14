-- Oportunia: payment trace and in-app automation. NO bank-provider integration,
-- NO official payment verification, NO sales and NO external message delivery.
create table public.payment_control_cases(
 id uuid primary key default gen_random_uuid(),
 claim_link_id uuid not null unique references public.preview_claim_links(id) on delete restrict,
 claim_id uuid not null unique references public.bank_recon_claims(id) on delete restrict,
 reservation_id uuid not null references public.preview_reservations(id) on delete restrict,
 customer_user_id uuid not null references auth.users(id) on delete cascade,
 declared_amount_cop bigint not null check(declared_amount_cop between 1000 and 100000000),
 bank_account_alias text not null,
 evidence_status text not null check(evidence_status in ('reported','file_matched','rejected')),
 authenticity text not null default 'not_verified'
    check(authenticity='not_verified'),
 bank_provider_event_id text,
 commercial_eligible boolean not null default false
    check(commercial_eligible=false),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint payment_no_provider_evidence check(bank_provider_event_id is null)
);
comment on table public.payment_control_cases is
 'Linked declared customer transfer and experimental selection. File matches are unverified, never commercial.';
create index payment_cases_owner_idx on public.payment_control_cases(customer_user_id,created_at desc);
create index payment_cases_status_idx on public.payment_control_cases(evidence_status,created_at desc);

create table public.payment_control_case_events(
 id bigint generated always as identity primary key,
 case_id uuid not null references public.payment_control_cases(id) on delete restrict,
 actor_id uuid references auth.users(id) on delete set null,
 event_type text not null check(event_type in ('linked','file_matched','rejected','reopened')),
 previous_status text,
 current_status text not null check(current_status in ('reported','file_matched','rejected')),
 created_at timestamptz not null default now()
);
create index payment_case_events_case_idx on public.payment_control_case_events(case_id,created_at desc);
comment on table public.payment_control_case_events is 'Append-only audit of the declared transfer lifecycle, not authenticated money movements.';

create table public.payment_notification_workflows(
 workflow_key text primary key check(workflow_key in ('reference_linked','reference_file_matched','reference_rejected')),
 label text not null,
 description text not null,
 enabled boolean not null default true,
 channel text not null default 'in_app' check(channel='in_app'),
 delivery_mode text not null default 'in_app_only' check(delivery_mode='in_app_only'),
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now()
);
insert into public.payment_notification_workflows(workflow_key,label,description) values
('reference_linked','Referencia vinculada','Aviso privado de que un reporte declarado se asoció con una selección de ensayo.'),
('reference_file_matched','Coincidencia de extracto','Aviso privado sobre una coincidencia en archivo aportado por administración; NO confirma dinero.'),
('reference_rejected','Referencia rechazada','Aviso privado cuando el reporte declarado es rechazado.');
comment on table public.payment_notification_workflows is 'Local automation, no n8n installed, no SMS/email/WhatsApp delivery.';

create table public.payment_notification_workflow_audit(
 id bigint generated always as identity primary key,
 workflow_key text not null references public.payment_notification_workflows(workflow_key) on delete restrict,
 actor_id uuid references auth.users(id) on delete set null,
 was_enabled boolean not null,
 now_enabled boolean not null,
 changed_at timestamptz not null default now()
);
create table public.payment_notification_runs(
 id bigint generated always as identity primary key,
 workflow_key text not null references public.payment_notification_workflows(workflow_key) on delete restrict,
 case_event_id bigint not null references public.payment_control_case_events(id) on delete restrict,
 case_id uuid not null references public.payment_control_cases(id) on delete restrict,
 customer_user_id uuid not null references auth.users(id) on delete cascade,
 result text not null check(result in ('in_app_created','disabled')),
 external_sent boolean not null default false check(external_sent=false),
 created_at timestamptz not null default now(),
 unique(workflow_key,case_event_id)
);
comment on table public.payment_notification_runs is 'Idempotent workflow run history: only private in-app notices; no external delivery.';
create index payment_notification_runs_time_idx on public.payment_notification_runs(created_at desc);
create table public.payment_notification_inbox(
 id uuid primary key default gen_random_uuid(),
 run_id bigint not null unique references public.payment_notification_runs(id) on delete restrict,
 customer_user_id uuid not null references auth.users(id) on delete cascade,
 case_id uuid not null references public.payment_control_cases(id) on delete restrict,
 title text not null check(length(title) between 5 and 100),
 message text not null check(length(message) between 12 and 350),
 created_at timestamptz not null default now(),
 read_at timestamptz
);
create index payment_notification_inbox_owner_idx on public.payment_notification_inbox(customer_user_id,created_at desc);
comment on table public.payment_notification_inbox is 'Customer-owned private in-app notices. No external message has been sent.';

alter table public.payment_control_cases enable row level security;
alter table public.payment_control_case_events enable row level security;
alter table public.payment_notification_workflows enable row level security;
alter table public.payment_notification_workflow_audit enable row level security;
alter table public.payment_notification_runs enable row level security;
alter table public.payment_notification_inbox enable row level security;
revoke all on public.payment_control_cases,public.payment_control_case_events,
 public.payment_notification_workflows,public.payment_notification_workflow_audit,
 public.payment_notification_runs,public.payment_notification_inbox from public,anon,authenticated;
grant select on public.payment_control_cases,public.payment_control_case_events,
 public.payment_notification_workflows,public.payment_notification_workflow_audit,
 public.payment_notification_runs,public.payment_notification_inbox to authenticated;
grant update(read_at) on public.payment_notification_inbox to authenticated;

create policy "payment cases only customer treasury or auditor"
on public.payment_control_cases for select to authenticated
using(customer_user_id=(select auth.uid())
 or public.staff_has_permission('bank.read')
 or public.staff_has_permission('audit.read'));

create policy "payment events of visible cases only"
on public.payment_control_case_events for select to authenticated
using(exists(select 1 from public.payment_control_cases c where c.id=case_id
 and (c.customer_user_id=(select auth.uid())
  or public.staff_has_permission('bank.read') or public.staff_has_permission('audit.read'))));

create policy "staff reads available workflows"
 on public.payment_notification_workflows for select to authenticated
 using(public.staff_has_permission('admin.menu'));
create policy "owner or auditor reads workflow changes"
 on public.payment_notification_workflow_audit for select to authenticated
 using(public.staff_has_permission('audit.read'));
create policy "owner treasury auditor reads workflow logs"
 on public.payment_notification_runs for select to authenticated
 using(public.staff_has_permission('bank.read') or public.staff_has_permission('audit.read'));
create policy "customer reads only own in-app notices"
 on public.payment_notification_inbox for select to authenticated
 using(customer_user_id=(select auth.uid()));
create policy "customer can mark own in-app notices as read"
 on public.payment_notification_inbox for update to authenticated
 using(customer_user_id=(select auth.uid()))
 with check(customer_user_id=(select auth.uid()));

create function public.record_payment_control_case_event()
 returns trigger language plpgsql security definer set search_path='' as $pc$
declare v_event bigint;v_key text;v_rule public.payment_notification_workflows%rowtype;v_run bigint;v_title text;v_message text;
begin
 if tg_op='INSERT' then
  insert into public.payment_control_case_events(case_id,actor_id,event_type,current_status)
  values(new.id,auth.uid(),'linked',new.evidence_status) returning id into v_event;
  v_key:='reference_linked';
 elsif tg_op='UPDATE' and new.evidence_status is distinct from old.evidence_status then
  insert into public.payment_control_case_events(case_id,actor_id,event_type,previous_status,current_status)
  values(new.id,auth.uid(),
   case when new.evidence_status='file_matched' then 'file_matched'
        when new.evidence_status='rejected' then 'rejected'
        else 'reopened' end,old.evidence_status,new.evidence_status)
  returning id into v_event;
  v_key:=case when new.evidence_status='file_matched' then 'reference_file_matched'
              when new.evidence_status='rejected' then 'reference_rejected' else null end;
 else return new;
 end if;
 if v_key is null then return new;end if;
 select * into v_rule from public.payment_notification_workflows where workflow_key=v_key;
 if not found then raise exception 'Workflow configuration missing: %',v_key;end if;
 insert into public.payment_notification_runs(workflow_key,case_event_id,case_id,customer_user_id,result)
 values(v_key,v_event,new.id,new.customer_user_id,
   case when v_rule.enabled then 'in_app_created' else 'disabled' end)
 returning id into v_run;
 if v_rule.enabled then
  v_title:=case v_key
    when 'reference_linked' then 'Tu referencia quedó asociada'
    when 'reference_file_matched' then 'Coincidencia con archivo importado'
    else 'Tu referencia requiere revisión' end;
  v_message:=case v_key
    when 'reference_linked' then 'Asociamos tu reporte a un ensayo. No es una compra ni significa que el banco haya recibido dinero.'
    when 'reference_file_matched' then 'El reporte coincide con un movimiento de un archivo cargado; no es verificación bancaria auténtica ni habilita números.'
    else 'Tu referencia fue rechazada en la revisión. Consulta el historial; no se acreditaron pagos ni números.' end;
  insert into public.payment_notification_inbox(run_id,customer_user_id,case_id,title,message)
   values(v_run,new.customer_user_id,new.id,v_title,v_message);
 end if;
 return new;
end; $pc$;
revoke all on function public.record_payment_control_case_event() from public,anon,authenticated;
create trigger payment_case_after_insert after insert on public.payment_control_cases
 for each row execute function public.record_payment_control_case_event();
create trigger payment_case_after_update after update of evidence_status on public.payment_control_cases
 for each row execute function public.record_payment_control_case_event();

create function public.track_linked_customer_payment()
 returns trigger language plpgsql security definer set search_path='' as $pc$
declare v_claim public.bank_recon_claims%rowtype;v_id uuid;v_status text;
begin
 select * into v_claim from public.bank_recon_claims where id=new.claim_id;
 if v_claim.id is null or v_claim.customer_user_id is distinct from new.user_id then
   raise exception 'Reference ownership mismatch';
 end if;
 if not exists(select 1 from public.preview_reservations r where r.id=new.reservation_id and r.user_id=new.user_id) then
   raise exception 'Selection ownership mismatch';
 end if;
 v_status:=case v_claim.status when 'matched' then 'file_matched'
   when 'rejected' then 'rejected' else 'reported' end;
 insert into public.payment_control_cases(
  claim_link_id,claim_id,reservation_id,customer_user_id,declared_amount_cop,bank_account_alias,evidence_status)
 values(new.id,new.claim_id,new.reservation_id,new.user_id,
   v_claim.expected_amount_cop,v_claim.account_alias,v_status);
 return new;
end; $pc$;
revoke all on function public.track_linked_customer_payment() from public,anon,authenticated;
create trigger payment_control_on_reference_link after insert on public.preview_claim_links
 for each row execute function public.track_linked_customer_payment();

create function public.sync_linked_customer_payment_status()
 returns trigger language plpgsql security definer set search_path='' as $pc$
begin
 if old.status is distinct from new.status then
  update public.payment_control_cases set
    evidence_status=case new.status when 'matched' then 'file_matched'
      when 'rejected' then 'rejected' else 'reported' end,
    updated_at=now()
  where claim_id=new.id;
 end if;
 return new;
end; $pc$;
revoke all on function public.sync_linked_customer_payment_status() from public,anon,authenticated;
create trigger payment_control_on_claim_status after update of status on public.bank_recon_claims
 for each row execute function public.sync_linked_customer_payment_status();

create function public.set_payment_notification_workflow(p_workflow_key text,p_enabled boolean)
 returns boolean language plpgsql security definer set search_path='' as $pc$
declare v_actor uuid:=auth.uid();v_old boolean;
begin
 if v_actor is null or not public.staff_has_permission('staff.manage') then
   raise exception 'Solo el propietario puede cambiar automatizaciones';
 end if;
 if p_enabled is null then raise exception 'Selecciona el estado del flujo';end if;
 select enabled into v_old from public.payment_notification_workflows
  where workflow_key=p_workflow_key for update;
 if not found then raise exception 'Flujo desconocido';end if;
 if v_old is distinct from p_enabled then
   update public.payment_notification_workflows set
      enabled=p_enabled,updated_at=now(),updated_by=v_actor
   where workflow_key=p_workflow_key;
   insert into public.payment_notification_workflow_audit(workflow_key,actor_id,was_enabled,now_enabled)
      values(p_workflow_key,v_actor,v_old,p_enabled);
 end if;
 return p_enabled;
end; $pc$;
revoke all on function public.set_payment_notification_workflow(text,boolean) from public,anon,authenticated;
grant execute on function public.set_payment_notification_workflow(text,boolean) to authenticated;

-- No historic customer data is deleted. Backfill creates a case only where a
-- user previously linked their own report to a demo reservation.
insert into public.payment_control_cases(
 claim_link_id,claim_id,reservation_id,customer_user_id,
 declared_amount_cop,bank_account_alias,evidence_status,created_at)
select l.id,l.claim_id,l.reservation_id,l.user_id,
 c.expected_amount_cop,c.account_alias,
 case c.status when 'matched' then 'file_matched' when 'rejected' then 'rejected' else 'reported' end,
 l.created_at
from public.preview_claim_links l join public.bank_recon_claims c on c.id=l.claim_id
where c.customer_user_id=l.user_id
on conflict (claim_link_id) do nothing;
