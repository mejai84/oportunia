-- Disable legacy authorization-only admin RPC: all new configurations use an explicit country/mode.
revoke execute on function public.configure_commerce_draw(text,text,text,text,text,text,date,date,boolean,boolean)
 from public,anon,authenticated;

create or replace function public.configure_commerce_draw_v2(
 p_draw_id text,p_country_code text,p_legal_mode text,
 p_authority text,p_operator text,p_reference text,p_document_url text,
 p_legal_basis text,p_legal_basis_url text,p_rules_url text,
 p_from date,p_until date,p_scheme_legal boolean,p_enable boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid();
 c text:=upper(btrim(coalesce(p_country_code,'')));
 mode text:=btrim(coalesce(p_legal_mode,''));
 date_today date:=((now() at time zone 'America/Bogota')::date);
begin
 if actor is null or not exists(
  select 1 from public.oportunia_admins a where a.user_id=actor
 ) then raise exception 'Solo el propietario puede configurar la edición';end if;
 if c !~ '^[A-Z]{2}$' or mode not in ('permit_required','no_permit_required')
 then raise exception 'Selecciona país ISO y modalidad legal válida';end if;
 if c='CO' and mode='no_permit_required'
 then raise exception 'Las rifas en Colombia deben seguir la modalidad de autorización';end if;
 if not exists(select 1 from public.draw_catalog d where d.id=p_draw_id and d.enabled)
 then raise exception 'Publica primero la edición en el catálogo';end if;
 if length(btrim(coalesce(p_operator,'')))<3
 or coalesce(p_rules_url,'') !~ '^https://[^ ]+$'
 or p_from is null or p_until is null or p_from>p_until
 then raise exception 'Indica organizador/operador, reglamento HTTPS y vigencia';end if;
 if mode='permit_required' and (
  length(btrim(coalesce(p_authority,'')))<3 or
  length(btrim(coalesce(p_reference,'')))<5 or
  coalesce(p_document_url,'') !~ '^https://[^ ]+$'
 ) then raise exception 'Esta jurisdicción requiere autoridad, referencia y documento de permiso';end if;
 if mode='no_permit_required' and (
  length(btrim(coalesce(p_legal_basis,'')))<100 or
  coalesce(p_legal_basis_url,'') !~ '^https://[^ ]+$'
 ) then raise exception 'Documenta al menos 100 caracteres y una fuente jurídica HTTPS que pruebe la excepción en el país indicado';end if;
 if not coalesce(p_scheme_legal,false) then
 raise exception 'Confirma que las reglas locales permiten el modelo 10+40, cuotas y venta web';end if;
 if coalesce(p_enable,false) and date_today not between p_from and p_until
 then raise exception 'La vigencia de la edición no incluye la fecha actual';end if;
 insert into public.commerce_draws(
  draw_id,country_code,legal_mode,authority_name,operator_name,
  authorization_reference,authorization_document_url,legal_basis,legal_basis_url,
  rules_url,authorized_from,authorized_until,scheme_10_40_authorized,
  legal_checked_at,legal_checked_by,sales_enabled,updated_at
 ) values(
  p_draw_id,c,mode,
  case when mode='permit_required' then btrim(p_authority) else '' end,
  btrim(p_operator),
  case when mode='permit_required' then btrim(p_reference) else '' end,
  case when mode='permit_required' then btrim(p_document_url) else '' end,
  case when mode='no_permit_required' then btrim(p_legal_basis) else '' end,
  case when mode='no_permit_required' then btrim(p_legal_basis_url) else '' end,
  btrim(p_rules_url),p_from,p_until,true,now(),actor,coalesce(p_enable,false),now()
 )
 on conflict(draw_id) do update set
  country_code=excluded.country_code,
  legal_mode=excluded.legal_mode,
  authority_name=excluded.authority_name,
  operator_name=excluded.operator_name,
  authorization_reference=excluded.authorization_reference,
  authorization_document_url=excluded.authorization_document_url,
  legal_basis=excluded.legal_basis,
  legal_basis_url=excluded.legal_basis_url,
  rules_url=excluded.rules_url,
  authorized_from=excluded.authorized_from,
  authorized_until=excluded.authorized_until,
  scheme_10_40_authorized=excluded.scheme_10_40_authorized,
  legal_checked_at=now(),legal_checked_by=actor,
  sales_enabled=excluded.sales_enabled,updated_at=now();
 return coalesce(p_enable,false);
end $$;

-- A buyer can request residency review; only an owner can attest verification.
create or replace function public.request_commerce_country_review(p_country_code text)
returns uuid language plpgsql security definer set search_path='' as $$
declare
 buyer uuid:=auth.uid();
 c text:=upper(btrim(coalesce(p_country_code,'')));
 requested_id uuid;
begin
 if buyer is null then raise exception 'Inicia sesión para solicitar una revisión';end if;
 if c !~ '^[A-Z]{2}$' or c='CO'
 then raise exception 'Selecciona un país distinto de Colombia';end if;
 if not exists(select 1 from public.commerce_draws d
  where d.country_code=c and d.sales_enabled) then
 raise exception 'No hay edición comercial habilitada para ese país';end if;
 if exists(select 1 from public.commerce_country_verifications v
  where v.user_id=buyer and v.country_code=c and v.expires_at>now())
 then raise exception 'Tu país ya está revisado y vigente';end if;
 if (select count(*) from public.commerce_country_requests r
  where r.user_id=buyer and r.requested_at>now()-interval '30 days')>=3
 then raise exception 'Máximo tres solicitudes al mes';end if;
 if exists(select 1 from public.commerce_country_requests r
  where r.user_id=buyer and r.country_code=c and r.status='pending')
 then raise exception 'Ya existe una solicitud pendiente';end if;
 insert into public.commerce_country_requests(user_id,country_code)
 values(buyer,c) returning id into requested_id;
 return requested_id;
end $$;

create or replace function public.review_commerce_country_request(
 p_request_id uuid,p_approve boolean,p_review_note text)
returns boolean language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid();
 req public.commerce_country_requests%rowtype;
 note text:=btrim(coalesce(p_review_note,''));
begin
 if actor is null or not exists(select 1 from public.oportunia_admins a
 where a.user_id=actor) then raise exception 'Solo propietario revisa la residencia';end if;
 if p_approve is null or length(note)<20 or length(note)>500
 then raise exception 'Especifica decisión y evidencia de revisión (20–500 caracteres)';end if;
 select * into req from public.commerce_country_requests
 where id=p_request_id for update;
 if req.id is null or req.status<>'pending'
 then raise exception 'La solicitud no existe o ya se resolvió';end if;
 if p_approve then
  insert into public.commerce_country_verifications(
   user_id,country_code,verified_at,verified_by,expires_at,review_note)
  values(req.user_id,req.country_code,now(),actor,now()+interval '180 days',note)
  on conflict(user_id,country_code) do update set
   verified_at=now(),verified_by=actor,expires_at=now()+interval '180 days',
   review_note=note;
 end if;
 update public.commerce_country_requests
 set status=case when p_approve then 'approved' else 'rejected' end,
 decided_at=now(),decided_by=actor,decision_note=note
 where id=req.id;
 return p_approve;
end $$;

revoke execute on function public.configure_commerce_draw_v2(text,text,text,text,text,text,text,text,text,text,date,date,boolean,boolean)
 from public,anon;
revoke execute on function public.request_commerce_country_review(text) from public,anon;
revoke execute on function public.review_commerce_country_request(uuid,boolean,text) from public,anon;
grant execute on function public.configure_commerce_draw_v2(text,text,text,text,text,text,text,text,text,text,date,date,boolean,boolean)
 to authenticated;
grant execute on function public.request_commerce_country_review(text) to authenticated;
grant execute on function public.review_commerce_country_request(uuid,boolean,text) to authenticated;
