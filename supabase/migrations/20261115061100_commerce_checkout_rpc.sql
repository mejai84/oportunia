-- All privileged order actions validate auth.uid() and never trust user-supplied owner IDs.
create or replace function public.configure_commerce_draw(
 p_draw_id text,p_authority text,p_operator text,p_reference text,p_document_url text,
 p_rules_url text,p_from date,p_until date,p_scheme_authorized boolean,p_enable boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid();
begin
 if a is null or not exists(select 1 from public.oportunia_admins x where x.user_id=a)
 then raise exception 'Solo el propietario puede declarar la autorización'; end if;
 if not exists(select 1 from public.draw_catalog x where x.id=p_draw_id and x.enabled)
 then raise exception 'La edición debe estar publicada en el catálogo'; end if;
 if length(btrim(coalesce(p_authority,'')))<3 or length(btrim(coalesce(p_operator,'')))<3
 or length(btrim(coalesce(p_reference,'')))<5 or coalesce(p_document_url,'') !~ '^https://[^ ]+$'
 or coalesce(p_rules_url,'') !~ '^https://[^ ]+$'
 or p_from is null or p_until is null or p_until<p_from
 then raise exception 'Completa autoridad, operador autorizado, acto, enlace y vigencia'; end if;
 if not coalesce(p_scheme_authorized,false) then
 raise exception 'El esquema 10 elegidos y 40 aleatorios debe estar expresamente cubierto por la autorización'; end if;
 if p_enable and current_date not between p_from and p_until then
 raise exception 'La vigencia declarada no incluye la fecha actual'; end if;
 insert into public.commerce_draws(draw_id,authority_name,operator_name,authorization_reference,
 authorization_document_url,rules_url,authorized_from,authorized_until,
 scheme_10_40_authorized,legal_checked_at,legal_checked_by,sales_enabled,updated_at)
 values(p_draw_id,btrim(p_authority),btrim(p_operator),btrim(p_reference),btrim(p_document_url),
 btrim(p_rules_url),p_from,p_until,true,now(),a,coalesce(p_enable,false),now())
 on conflict(draw_id) do update set
 authority_name=excluded.authority_name,operator_name=excluded.operator_name,
 authorization_reference=excluded.authorization_reference,
 authorization_document_url=excluded.authorization_document_url,
 rules_url=excluded.rules_url,authorized_from=excluded.authorized_from,authorized_until=excluded.authorized_until,
 scheme_10_40_authorized=excluded.scheme_10_40_authorized,legal_checked_at=now(),
 legal_checked_by=a,sales_enabled=excluded.sales_enabled,updated_at=now();
 return coalesce(p_enable,false);
end $$;

create or replace function public.get_commerce_taken_numbers(p_draw_id text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v jsonb;
begin
 if auth.uid() is null then raise exception 'Inicia sesión'; end if;
 if not exists(select 1 from public.commerce_draws c join public.draw_catalog d
 on d.id=c.draw_id where c.draw_id=p_draw_id and c.sales_enabled and d.enabled
 and current_date between c.authorized_from and c.authorized_until)
 then raise exception 'La edición no admite ventas actualmente'; end if;
 select coalesce(jsonb_agg(number order by number),'[]'::jsonb) into v
 from public.commerce_numbers where draw_id=p_draw_id;
 return v;
end $$;

create or replace function public.create_commerce_order(
 p_draw_id text,p_mode text,p_numbers int[],p_plan text,p_accept_terms boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); cfg public.commerce_draws%rowtype;
 id uuid; selected int[]; occupied int; remaining int;
begin
 if u is null then raise exception 'Inicia sesión'; end if;
 if coalesce(p_accept_terms,false)=false then raise exception 'Debes aceptar las reglas de la edición'; end if;
 if p_mode not in ('manual','automatic') or p_plan not in ('contado','dos-cuotas','tres-cuotas')
 then raise exception 'Modo o plan inválidos'; end if;
 select * into cfg from public.commerce_draws where draw_id=p_draw_id for update;
 if cfg.draw_id is null or not cfg.sales_enabled
 or current_date not between cfg.authorized_from and cfg.authorized_until
 or not exists(select 1 from public.draw_catalog d where d.id=p_draw_id and d.enabled)
 then raise exception 'Las ventas de esta edición no están activas o la autorización venció'; end if;
 -- Never reclaim a number if a proof is awaiting manual review or if ANY credit was approved.
 update public.commerce_orders set status='expired',updated_at=now()
 where draw_id=p_draw_id and status='reserved' and paid_cop=0 and expires_at<=now();
 delete from public.commerce_numbers n using public.commerce_orders o
 where n.order_id=o.id and o.draw_id=p_draw_id and o.status in ('expired','cancelled');
 if exists(select 1 from public.commerce_orders o where o.user_id=u and o.draw_id=p_draw_id
 and o.status in ('reserved','proof_pending','part_paid')) then
 raise exception 'Ya tienes un pedido vigente o pendiente de verificación en esta edición'; end if;
 if (select count(*) from public.commerce_orders o where o.user_id=u
 and o.created_at>now()-interval '24 hours')>=3 then
 raise exception 'Máximo tres nuevos pedidos por cuenta cada 24 horas'; end if;
 select count(*) into occupied from public.commerce_orders o where o.draw_id=p_draw_id
 and o.status in ('reserved','proof_pending','part_paid','paid');
 if occupied>=cfg.max_orders then raise exception 'Se agotaron los cupos de esta edición'; end if;
 if p_mode='manual' then
   if cardinality(p_numbers) is distinct from 10 or
   exists(select 1 from unnest(p_numbers) n where n is null or n<0 or n>9999) or
   (select count(distinct n) from unnest(p_numbers) n)<>10
   then raise exception 'Selecciona exactamente diez números distintos del 0000 al 9999'; end if;
   selected:=p_numbers;
   if exists(select 1 from public.commerce_numbers n
   where n.draw_id=p_draw_id and n.number=any(selected)) then
   raise exception 'Uno o varios números ya están ocupados'; end if;
 else
   if coalesce(cardinality(p_numbers),0)>0 then raise exception 'La selección automática no recibe números manuales';end if;
   select coalesce(array_agg(n order by n),'{}'::int[]) into selected from (
     select g.n from generate_series(0,9999) as g(n)
     where not exists(select 1 from public.commerce_numbers z where z.draw_id=p_draw_id and z.number=g.n)
     order by random() limit 10
   ) q;
   if cardinality(selected)<>10 then raise exception 'No quedan diez números disponibles'; end if;
 end if;
 insert into public.commerce_orders(draw_id,user_id,selection_mode,payment_plan,terms_accepted_at,expires_at)
 values(p_draw_id,u,p_mode,p_plan,now(),now()+interval '24 hours') returning commerce_orders.id into id;
 insert into public.commerce_numbers(draw_id,number,order_id,category)
 select p_draw_id,n,id,'initial' from unnest(selected) n;
 get diagnostics remaining=row_count;
 if remaining<>10 then raise exception 'Falló la selección de diez números'; end if;
 insert into public.commerce_events(order_id,actor_id,event_type,detail)
 values(id,u,'reserved',jsonb_build_object('numbers',selected,'expires_at',now()+interval '24 hours'));
 return id;
end $$;

create or replace function public.cancel_commerce_order(p_order_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); dr text; o public.commerce_orders%rowtype;
begin
 if u is null then raise exception 'Inicia sesión';end if;
 select draw_id into dr from public.commerce_orders where id=p_order_id;
 if dr is null then raise exception 'Pedido desconocido';end if;
 perform 1 from public.commerce_draws where draw_id=dr for update;
 select * into o from public.commerce_orders where id=p_order_id for update;
 if o.user_id<>u or o.status<>'reserved' or o.paid_cop<>0 then
 raise exception 'Solo puedes cancelar una reserva sin comprobante y sin pagos aprobados';end if;
 update public.commerce_orders set status='cancelled',updated_at=now() where id=p_order_id;
 delete from public.commerce_numbers where order_id=p_order_id;
 insert into public.commerce_events(order_id,actor_id,event_type) values(p_order_id,u,'cancelled');
 return true;
end $$;

create or replace function public.submit_commerce_receipt(
 p_order_id uuid,p_destination_bank text,p_origin_channel text,
 p_reference text,p_amount_cop bigint,p_receipt_path text)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); o public.commerce_orders%rowtype; dr text;
 v_reference text:=upper(btrim(coalesce(p_reference,'')));
 v_bank text:=upper(btrim(coalesce(p_destination_bank,'')));
 v_channel text:=upper(btrim(coalesce(p_origin_channel,'')));
 v_expected bigint; id uuid;
begin
 if u is null then raise exception 'Inicia sesión';end if;
 select draw_id into dr from public.commerce_orders where id=p_order_id;
 if dr is null then raise exception 'Pedido inexistente';end if;
 perform 1 from public.commerce_draws where draw_id=dr for update;
 select * into o from public.commerce_orders where id=p_order_id for update;
 if o.user_id<>u or o.status not in ('reserved','part_paid')
 or (o.status='reserved' and o.expires_at<=now())
 then raise exception 'La reserva venció o tienes una verificación pendiente';end if;
 if v_bank not in ('BANCOLOMBIA','NEQUI')
 or v_channel not in ('BANCOLOMBIA','NEQUI','BRE-B','DAVIPLATA','OTRO')
 or v_reference !~ '^[A-Z0-9][A-Z0-9._/-]{3,99}$'
 then raise exception 'Datos de banco o referencia inválidos';end if;
 v_expected:=case o.payment_plan
 when 'contado' then case when o.paid_cop=0 then 50000 end
 when 'dos-cuotas' then case when o.paid_cop in (0,25000) then 25000 end
 when 'tres-cuotas' then case when o.paid_cop=0 then 20000 when o.paid_cop in (20000,35000) then 15000 end
 end;
 if v_expected is null or p_amount_cop<>v_expected then
 raise exception 'El abono debe coincidir con la cuota actual del plan';end if;
 if coalesce(p_receipt_path,'') not like u::text||'/%'
 or length(p_receipt_path)>240
 or not exists(select 1 from storage.objects s where s.bucket_id='oportunia-receipts'
 and s.name=p_receipt_path)
 then raise exception 'Debes adjuntar un comprobante privado de tu cuenta';end if;
 if exists(select 1 from public.commerce_receipts r where r.order_id=p_order_id and r.status='pending')
 then raise exception 'Ya hay un comprobante pendiente de revisión';end if;
 if (select count(*) from public.commerce_receipts r where r.order_id=p_order_id)>=8
 or (select count(*) from public.commerce_receipts r where r.user_id=u
 and r.created_at>now()-interval '24 hours')>=6
 then raise exception 'Límite de comprobantes alcanzado. Contacta soporte';end if;
 insert into public.commerce_receipts(order_id,user_id,destination_bank,origin_channel,
 claimed_reference,amount_cop,receipt_path)
 values(p_order_id,u,v_bank,v_channel,v_reference,p_amount_cop,p_receipt_path)
 returning commerce_receipts.id into id;
 -- Proof gives extra time and freezes this number block until a human decision.
 -- review_due_at is an operator service target, NOT an auto-release deadline.
 update public.commerce_orders set status='proof_pending',
 expires_at=greatest(expires_at,now()+interval '72 hours'),
 review_due_at=now()+interval '72 hours',updated_at=now()
 where commerce_orders.id=p_order_id;
 insert into public.commerce_events(order_id,actor_id,event_type,detail)
 values(p_order_id,u,'proof_submitted',jsonb_build_object(
 'receipt_id',id,'amount_cop',p_amount_cop,'review_due_hours',72,'no_payment_confirmed',true));
 return id;
end $$;

revoke all on function public.configure_commerce_draw(text,text,text,text,text,text,date,date,boolean,boolean)
 from public,anon;
revoke all on function public.get_commerce_taken_numbers(text) from public,anon;
revoke all on function public.create_commerce_order(text,text,int[],text,boolean) from public,anon;
revoke all on function public.cancel_commerce_order(uuid) from public,anon;
revoke all on function public.submit_commerce_receipt(uuid,text,text,text,bigint,text) from public,anon;
grant execute on function public.configure_commerce_draw(text,text,text,text,text,text,date,date,boolean,boolean) to authenticated;
grant execute on function public.get_commerce_taken_numbers(text) to authenticated;
grant execute on function public.create_commerce_order(text,text,int[],text,boolean) to authenticated;
grant execute on function public.cancel_commerce_order(uuid) to authenticated;
grant execute on function public.submit_commerce_receipt(uuid,text,text,text,bigint,text) to authenticated;
