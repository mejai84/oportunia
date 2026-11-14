-- Extend unverified payment trace to ALL authenticated customer declarations.
-- Linking to a PREVIEW selection is optional, and never creates a sale.
alter table public.payment_control_cases
 alter column claim_link_id drop not null,
 alter column reservation_id drop not null;
comment on table public.payment_control_cases is
 'One trace per customer-owned payment declaration, optionally linked to a noncommercial preview reservation; never bank-verified.';

alter table public.payment_control_case_events
 drop constraint payment_control_case_events_event_type_check;
alter table public.payment_control_case_events
 add constraint payment_control_case_events_event_type_check
 check(event_type in ('submitted','linked','file_matched','rejected','reopened'));

create or replace function public.record_payment_control_case_event()
 returns trigger language plpgsql security definer set search_path='' as $pc$
declare v_event bigint;v_key text;v_rule public.payment_notification_workflows%rowtype;
 v_run bigint;v_title text;v_message text;v_type text;
begin
 if tg_op='INSERT' then
  insert into public.payment_control_case_events(case_id,actor_id,event_type,current_status)
  values(new.id,auth.uid(),'submitted',new.evidence_status);
  -- The existing bank_recon_claim_events trigger creates the general receipt
  -- notice. Do not duplicate that receipt in the payment-control inbox.
  return new;
 end if;

 if new.claim_link_id is distinct from old.claim_link_id
    and new.claim_link_id is not null then
  v_type:='linked';v_key:='reference_linked';
 elsif new.evidence_status is distinct from old.evidence_status then
  v_type:=case new.evidence_status
    when 'file_matched' then 'file_matched'
    when 'rejected' then 'rejected' else 'reopened' end;
  v_key:=case new.evidence_status
    when 'file_matched' then 'reference_file_matched'
    when 'rejected' then 'reference_rejected' else null end;
 else return new;
 end if;

 insert into public.payment_control_case_events(
   case_id,actor_id,event_type,previous_status,current_status)
 values(new.id,auth.uid(),v_type,old.evidence_status,new.evidence_status)
 returning id into v_event;
 if v_key is null then return new;end if;
 select * into v_rule from public.payment_notification_workflows where workflow_key=v_key;
 if not found then raise exception 'Workflow configuration missing: %',v_key;end if;
 insert into public.payment_notification_runs(
  workflow_key,case_event_id,case_id,customer_user_id,result)
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
  insert into public.payment_notification_inbox(
   run_id,customer_user_id,case_id,title,message)
   values(v_run,new.customer_user_id,new.id,v_title,v_message);
 end if;
 return new;
end; $pc$;

create or replace function public.track_linked_customer_payment()
 returns trigger language plpgsql security definer set search_path='' as $pc$
declare v_claim public.bank_recon_claims%rowtype;v_id uuid;
begin
 select * into v_claim from public.bank_recon_claims where id=new.claim_id;
 if v_claim.id is null or v_claim.customer_user_id is distinct from new.user_id then
   raise exception 'Reference ownership mismatch';
 end if;
 if not exists(select 1 from public.preview_reservations r
   where r.id=new.reservation_id and r.user_id=new.user_id) then
   raise exception 'Selection ownership mismatch';
 end if;
 update public.payment_control_cases
 set claim_link_id=new.id,reservation_id=new.reservation_id,updated_at=now()
 where claim_id=new.claim_id and customer_user_id=new.user_id and claim_link_id is null
 returning id into v_id;
 if v_id is null then
   raise exception 'The declaration is missing or already linked to another selection';
 end if;
 return new;
end; $pc$;

create function public.track_new_customer_payment_declaration()
 returns trigger language plpgsql security definer set search_path='' as $pc$
begin
 if new.customer_user_id is null then
  return new;
 end if;
 insert into public.payment_control_cases(
    claim_id,customer_user_id,declared_amount_cop,bank_account_alias,evidence_status,created_at)
 values(new.id,new.customer_user_id,new.expected_amount_cop,new.account_alias,
  case new.status when 'matched' then 'file_matched' when 'rejected' then 'rejected' else 'reported' end,
  new.created_at)
 on conflict(claim_id) do nothing;
 return new;
end; $pc$;
revoke all on function public.track_new_customer_payment_declaration() from public,anon,authenticated;
create trigger payment_control_on_new_claim after insert on public.bank_recon_claims
 for each row execute function public.track_new_customer_payment_declaration();

-- Existing declarations are preserved and added to the same ledger. No data is overwritten.
insert into public.payment_control_cases(
 claim_id,customer_user_id,declared_amount_cop,bank_account_alias,evidence_status,created_at)
select c.id,c.customer_user_id,c.expected_amount_cop,c.account_alias,
 case c.status when 'matched' then 'file_matched' when 'rejected' then 'rejected' else 'reported' end,
 c.created_at from public.bank_recon_claims c
where c.customer_user_id is not null
on conflict(claim_id) do nothing;
