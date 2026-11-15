-- Treasury validates actual credit in recipient banking application / statement.
-- No automatic provider authenticity is claimed; every approval has an audited reviewer.
create or replace function public.review_commerce_receipt(
 p_receipt_id uuid,p_approve boolean,p_bank_transaction_reference text,
 p_bank_credit_date date,p_note text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 reviewer uuid:=auth.uid(); v_order_id uuid; v_draw text;
 o public.commerce_orders%rowtype; receipt public.commerce_receipts%rowtype;
 new_paid bigint; n_total int; n_existing int; n_extra int; n_inserted int; numbers int[];
 clean_ref text:=upper(btrim(coalesce(p_bank_transaction_reference,'')));
 note text:=btrim(coalesce(p_note,''));
 new_status text;
begin
 if reviewer is null or not public.staff_has_permission('bank.write') then
 raise exception 'Solo tesorería autorizada puede revisar comprobantes'; end if;
 if p_approve is null then raise exception 'Selecciona confirmar o rechazar';end if;
 select order_id into v_order_id from public.commerce_receipts where id=p_receipt_id;
 if v_order_id is null then raise exception 'Comprobante no encontrado';end if;
 select draw_id into v_draw from public.commerce_orders where id=v_order_id;
 perform 1 from public.commerce_draws where draw_id=v_draw for update;
 select * into o from public.commerce_orders where id=v_order_id for update;
 select * into receipt from public.commerce_receipts where id=p_receipt_id for update;
 if receipt.status<>'pending' or o.status<>'proof_pending'
 then raise exception 'El comprobante ya fue procesado o el pedido cambió de estado';end if;
 if not p_approve then
   if length(note)<12 or length(note)>500 then
     raise exception 'Indica el motivo del rechazo (12 a 500 caracteres)';end if;
   update public.commerce_receipts set status='rejected',reviewed_at=now(),
     reviewed_by=reviewer,rejection_reason=note where id=p_receipt_id;
   new_status:=case when o.paid_cop>0 then 'part_paid' else 'reserved' end;
   update public.commerce_orders set status=new_status,
     expires_at=case when o.paid_cop=0 then now()+interval '6 hours' else o.expires_at end,
     review_due_at=null,updated_at=now() where id=o.id;
   insert into public.commerce_events(order_id,actor_id,event_type,detail)
   values(o.id,reviewer,'proof_rejected',jsonb_build_object(
    'receipt_id',p_receipt_id,'reason',note,'correction_hours',case when o.paid_cop=0 then 6 else null end));
   return jsonb_build_object('status','rejected','order_status',new_status);
 end if;
 if clean_ref !~ '^[A-Z0-9][A-Z0-9._/-]{3,99}$'
 or p_bank_credit_date is null or p_bank_credit_date>current_date
 or p_bank_credit_date<current_date-interval '90 days'
 or length(note)<20 or length(note)>1000
 then raise exception 'Registra la referencia bancaria real, fecha de abono y evidencia de revisión (20 caracteres mínimo)';end if;
 new_paid:=o.paid_cop+receipt.amount_cop;
 if new_paid>o.price_cop then raise exception 'El abono supera el valor de la oportunidad';end if;
 n_total:=new_paid/1000; -- $1,000 COP corresponds to one number, final total always 50
 select count(*) into n_existing from public.commerce_numbers where order_id=o.id;
 if n_existing<10 then raise exception 'La selección inicial tiene menos de diez números';end if;
 n_extra:=n_total-n_existing;
 if n_extra<0 then raise exception 'Los números asignados exceden el valor confirmado';end if;
 if n_extra>0 then
   select coalesce(array_agg(n order by n),'{}'::int[]) into numbers from (
     select g.n from generate_series(0,9999) g(n)
     where not exists(select 1 from public.commerce_numbers t
       where t.draw_id=v_draw and t.number=g.n)
     order by random() limit n_extra
   ) candidate;
   if cardinality(numbers)<>n_extra then
     raise exception 'No hay números suficientes. No se acreditó el pago; revisa disponibilidad';end if;
   insert into public.commerce_numbers(draw_id,number,order_id,category)
   select v_draw,n,o.id,'extra' from unnest(numbers) n;
   get diagnostics n_inserted=row_count;
   if n_inserted<>n_extra then raise exception 'No fue posible asignar todos los números';end if;
 end if;
 -- A reused bank transaction cannot pay more than one order.
 insert into public.commerce_confirmed_credits(
  receipt_id,order_id,bank,bank_transaction_reference,bank_credit_date,
  amount_cop,verified_by,verification_note)
 values(receipt.id,o.id,receipt.destination_bank,clean_ref,p_bank_credit_date,
  receipt.amount_cop,reviewer,note);
 update public.commerce_receipts set status='approved',reviewed_at=now(),
 reviewed_by=reviewer where id=receipt.id;
 new_status:=case when new_paid=o.price_cop then 'paid' else 'part_paid' end;
 update public.commerce_orders set paid_cop=new_paid,status=new_status,review_due_at=null,
 updated_at=now() where id=o.id;
 insert into public.commerce_events(order_id,actor_id,event_type,detail)
 values(o.id,reviewer,'bank_manually_verified',jsonb_build_object(
  'receipt_id',receipt.id,'amount_cop',receipt.amount_cop,'total_confirmed_cop',new_paid,
  'numbers_assigned',n_total,'verification','human_bank_review_not_api'));
 return jsonb_build_object('status','approved','order_status',new_status,
 'paid_cop',new_paid,'numbers_assigned',n_total);
end $$;

create or replace function public.set_commerce_whatsapp_group(
 p_draw_id text,p_name text,p_invite_url text)
returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from public.oportunia_admins a where a.user_id=actor)
 then raise exception 'Solo propietario puede publicar la invitación';end if;
 if not exists(select 1 from public.commerce_draws where draw_id=p_draw_id)
 then raise exception 'Configura primero la edición';end if;
 if length(btrim(coalesce(p_name,''))) not between 3 and 120 or
 coalesce(p_invite_url,'') !~ '^https://chat[.]whatsapp[.]com/[A-Za-z0-9]+$'
 then raise exception 'Nombre o enlace de WhatsApp inválidos';end if;
 insert into public.commerce_whatsapp_groups(draw_id,group_name,invite_url,updated_by,updated_at)
 values(p_draw_id,btrim(p_name),p_invite_url,actor,now())
 on conflict(draw_id) do update set group_name=excluded.group_name,
 invite_url=excluded.invite_url,updated_by=actor,updated_at=now();
 return true;
end $$;
create or replace function public.set_commerce_whatsapp_consent(p_order_id uuid,p_accept boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); o public.commerce_orders%rowtype;
begin
 if actor is null then raise exception 'Inicia sesión';end if;
 select * into o from public.commerce_orders where id=p_order_id;
 if o.id is null or o.user_id<>actor or o.status<>'paid'
 then raise exception 'Solo el titular con el pago total confirmado puede solicitar el grupo';end if;
 if p_accept is null then raise exception 'Selecciona tu consentimiento';end if;
 insert into public.commerce_group_consent(order_id,user_id,consented_at,revoked_at,updated_at)
 values(p_order_id,actor,case when p_accept then now() else null end,
 case when p_accept then null else now() end,now())
 on conflict(order_id) do update set
 consented_at=case when p_accept then now() else null end,
 revoked_at=case when p_accept then null else now() end,updated_at=now();
 insert into public.commerce_events(order_id,actor_id,event_type)
 values(p_order_id,actor,case when p_accept then 'whatsapp_consent' else 'whatsapp_revoked' end);
 return p_accept;
end $$;

revoke all on function public.review_commerce_receipt(uuid,boolean,text,date,text) from public,anon;
revoke all on function public.set_commerce_whatsapp_group(text,text,text) from public,anon;
revoke all on function public.set_commerce_whatsapp_consent(uuid,boolean) from public,anon;
grant execute on function public.review_commerce_receipt(uuid,boolean,text,date,text) to authenticated;
grant execute on function public.set_commerce_whatsapp_group(text,text,text) to authenticated;
grant execute on function public.set_commerce_whatsapp_consent(uuid,boolean) to authenticated;
