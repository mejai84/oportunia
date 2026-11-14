-- Oportunia. Staff roles (separate from immutable legacy owner allowlist).
-- Never put privileged roles in user_metadata or allow direct browser table writes.
create table public.oportunia_staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('treasury','support','draws','auditor')),
  assigned_by uuid not null references auth.users(id) on delete restrict,
  assigned_at timestamptz not null default now()
);
comment on table public.oportunia_staff_roles is
  'Assigned operator role; owner stays exclusively in oportunia_admins. No direct browser mutations.';

create table public.oportunia_staff_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('assigned','changed','revoked')),
  old_role text,
  new_role text,
  created_at timestamptz not null default now()
);
comment on table public.oportunia_staff_audit is
  'Append-only record of role assignments and removals.';

create table public.oportunia_admin_action_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  entity text not null check (entity in ('draw_catalog','draw_reviews','draw_results')),
  record_id text not null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  old_status text,
  new_status text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
comment on table public.oportunia_admin_action_audit is
  'Append-only metadata-level audit, not a bank-movement verification or sales ledger.';

alter table public.oportunia_staff_roles enable row level security;
alter table public.oportunia_staff_audit enable row level security;
alter table public.oportunia_admin_action_audit enable row level security;
revoke all on public.oportunia_staff_roles,public.oportunia_staff_audit,public.oportunia_admin_action_audit
 from public,anon,authenticated;
grant select on public.oportunia_staff_roles,public.oportunia_staff_audit,public.oportunia_admin_action_audit
 to authenticated;

-- Security-definer is needed only to inspect owner membership/role safely. The
-- current user's identity comes exclusively from auth.uid(), never the client arguments.
create function public.staff_role_for_current_user()
returns text language plpgsql stable security definer set search_path='' as $staff$
declare v_user uuid:=auth.uid(); v_role text;
begin
 if v_user is null then return null; end if;
 if exists(select 1 from public.oportunia_admins a where a.user_id=v_user) then
   return 'owner';
 end if;
 select s.role into v_role from public.oportunia_staff_roles s where s.user_id=v_user;
 return v_role;
end; $staff$;

create function public.staff_has_permission(p_permission text)
returns boolean language plpgsql stable security definer set search_path='' as $staff$
declare v_role text;
begin
 if p_permission is null or length(p_permission)>64 then return false; end if;
 v_role:=public.staff_role_for_current_user();
 if v_role='owner' then
  return p_permission=any(array[
   'admin.menu','admin.dashboard','staff.manage','audit.read','bank.read','bank.write',
   'crm.read','crm.write','followups.read','followups.write',
   'catalog.read','catalog.write','reviews.read','reviews.write','preview.read','preview.write']);
 end if;
 case v_role
  when 'treasury' then return p_permission=any(array['admin.menu','bank.read','bank.write']);
  when 'support' then return p_permission=any(array['admin.menu','crm.read','crm.write','followups.read','followups.write']);
  when 'draws' then return p_permission=any(array['admin.menu','catalog.read','catalog.write','reviews.read','reviews.write','preview.read','preview.write']);
  when 'auditor' then return p_permission=any(array[
   'admin.menu','audit.read','bank.read','crm.read','followups.read',
   'catalog.read','reviews.read','preview.read']);
  else return false;
 end case;
end; $staff$;

revoke all on function public.staff_role_for_current_user() from public,anon,authenticated;
revoke all on function public.staff_has_permission(text) from public,anon,authenticated;
grant execute on function public.staff_role_for_current_user() to authenticated;
grant execute on function public.staff_has_permission(text) to authenticated;

create policy "member reads own role or owner reads staff"
 on public.oportunia_staff_roles for select to authenticated
 using (user_id=(select auth.uid())
  or exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid())));
create policy "owner or auditor reads staff role changes"
 on public.oportunia_staff_audit for select to authenticated
 using(public.staff_has_permission('audit.read'));
create policy "owner or auditor reads changes to draws and reviews"
 on public.oportunia_admin_action_audit for select to authenticated
 using(public.staff_has_permission('audit.read'));

create function public.set_oportunia_staff_role(p_user_id uuid,p_role text)
returns text language plpgsql security definer set search_path='' as $staff$
declare v_actor uuid:=auth.uid();v_before text; v_role text:=lower(trim(coalesce(p_role,''))); v_action text;
begin
 if v_actor is null or not exists(select 1 from public.oportunia_admins a where a.user_id=v_actor) then
  raise exception 'Solo el propietario puede modificar roles';
 end if;
 if p_user_id is null then raise exception 'Selecciona una cuenta existente'; end if;
 if not exists(select 1 from auth.users u where u.id=p_user_id) then
  raise exception 'No existe la cuenta seleccionada';
 end if;
 if exists(select 1 from public.oportunia_admins a where a.user_id=p_user_id) then
  raise exception 'La cuenta propietaria no puede editarse desde esta pantalla';
 end if;
 if v_role<>'' and v_role not in ('treasury','support','draws','auditor') then
  raise exception 'Rol no reconocido';
 end if;
 perform pg_advisory_xact_lock(hashtext('oportunia-staff-role'),hashtext(p_user_id::text));
 select role into v_before from public.oportunia_staff_roles where user_id=p_user_id for update;
 if v_role='' then
  if v_before is null then return null; end if;
  delete from public.oportunia_staff_roles where user_id=p_user_id;
  v_action:='revoked';
 else
  if v_before=v_role then return v_role; end if;
  insert into public.oportunia_staff_roles(user_id,role,assigned_by)
   values(p_user_id,v_role,v_actor)
  on conflict(user_id) do update set role=excluded.role,assigned_by=excluded.assigned_by,assigned_at=now();
  v_action:=case when v_before is null then 'assigned' else 'changed' end;
 end if;
 insert into public.oportunia_staff_audit(actor_id,target_user_id,event_type,old_role,new_role)
 values(v_actor,p_user_id,v_action,v_before,nullif(v_role,''));
 return nullif(v_role,'');
end; $staff$;
revoke all on function public.set_oportunia_staff_role(uuid,text) from public,anon,authenticated;
grant execute on function public.set_oportunia_staff_role(uuid,text) to authenticated;

-- Distinct column-level audit for authenticated modifications to public catalog,
-- moderation and results. No personal data or sensitive bank details are copied.
create function public.audit_oportunia_content_mutation()
returns trigger language plpgsql security definer set search_path='' as $staff$
declare v_old jsonb:=case when tg_op='INSERT' then '{}'::jsonb else to_jsonb(old) end;
 v_new jsonb:=case when tg_op='DELETE' then '{}'::jsonb else to_jsonb(new) end;
begin
 insert into public.oportunia_admin_action_audit(
  actor_id,entity,record_id,action,old_status,new_status,details
 ) values (
  auth.uid(),tg_table_name,coalesce(v_new->>'id',v_old->>'id'),tg_op,
  coalesce(v_old->>'status',case when v_old ? 'verified_at' then
    case when v_old->>'verified_at' is null then 'pending' else 'verified' end end),
  coalesce(v_new->>'status',case when v_new ? 'verified_at' then
    case when v_new->>'verified_at' is null then 'pending' else 'verified' end end),
  jsonb_build_object('old_enabled',v_old->>'enabled','new_enabled',v_new->>'enabled')
 );
 return null;
end; $staff$;
revoke all on function public.audit_oportunia_content_mutation() from public,anon,authenticated;
create trigger oportunia_audit_draw_catalog after insert or update or delete on public.draw_catalog
 for each row execute function public.audit_oportunia_content_mutation();
create trigger oportunia_audit_draw_reviews after insert or update or delete on public.draw_reviews
 for each row execute function public.audit_oportunia_content_mutation();
create trigger oportunia_audit_draw_results after insert or update or delete on public.draw_results
 for each row execute function public.audit_oportunia_content_mutation();

-- Legacy owner's RLS policies remain intact. Additional policies grant minimum
-- module access to staff roles, with writes only where explicitly authorized.
create policy "staff module read bank_recon_claims" on public.bank_recon_claims for select to authenticated using (public.staff_has_permission('bank.read'));
create policy "staff module read bank_recon_claim_events" on public.bank_recon_claim_events for select to authenticated using (public.staff_has_permission('bank.read'));
create policy "staff module read bank_recon_movements" on public.bank_recon_movements for select to authenticated using (public.staff_has_permission('bank.read'));
create policy "staff module read bank_recon_audit" on public.bank_recon_audit for select to authenticated using (public.staff_has_permission('audit.read'));
create policy "staff module read customer_profiles" on public.customer_profiles for select to authenticated using (public.staff_has_permission('crm.read'));
create policy "staff module read customer_crm_notes" on public.customer_crm_notes for select to authenticated using (public.staff_has_permission('crm.read'));
create policy "staff module read crm_followups" on public.crm_followups for select to authenticated using (public.staff_has_permission('followups.read'));
create policy "staff module read crm_followup_events" on public.crm_followup_events for select to authenticated using (public.staff_has_permission('followups.read'));
create policy "staff module read draw_catalog" on public.draw_catalog for select to authenticated using (public.staff_has_permission('catalog.read'));
create policy "staff module read draw_reviews" on public.draw_reviews for select to authenticated using (public.staff_has_permission('reviews.read'));
create policy "staff module read draw_results" on public.draw_results for select to authenticated using (public.staff_has_permission('reviews.read'));
create policy "staff module read preview_reservations" on public.preview_reservations for select to authenticated using (public.staff_has_permission('preview.read'));
create policy "staff module read preview_reserved_numbers" on public.preview_reserved_numbers for select to authenticated using (public.staff_has_permission('preview.read'));
create policy "staff module read preview_reservation_events" on public.preview_reservation_events for select to authenticated using (public.staff_has_permission('preview.read'));
create policy "staff module read preview_extra_events" on public.preview_extra_events for select to authenticated using (public.staff_has_permission('preview.read'));
create policy "staff module read preview_claim_links" on public.preview_claim_links for select to authenticated using (public.staff_has_permission('preview.read'));
create policy "staff module insert customer_crm_notes" on public.customer_crm_notes for insert to authenticated with check(public.staff_has_permission('crm.write') and (author_user_id=(select auth.uid())));
create policy "staff module insert crm_followups" on public.crm_followups for insert to authenticated with check(public.staff_has_permission('followups.write') and (created_by=(select auth.uid()) and status='pending'));
create policy "staff module update crm_followups" on public.crm_followups for update to authenticated using(public.staff_has_permission('followups.write')) with check(public.staff_has_permission('followups.write'));
create policy "staff module insert draw_catalog" on public.draw_catalog for insert to authenticated with check(public.staff_has_permission('catalog.write'));
create policy "staff module update draw_catalog" on public.draw_catalog for update to authenticated using(public.staff_has_permission('catalog.write')) with check(public.staff_has_permission('catalog.write'));
create policy "staff module delete draw_catalog" on public.draw_catalog for delete to authenticated using(public.staff_has_permission('catalog.write'));
create policy "staff module update draw_reviews" on public.draw_reviews for update to authenticated using(public.staff_has_permission('reviews.write')) with check(public.staff_has_permission('reviews.write'));
create policy "staff module insert draw_results" on public.draw_results for insert to authenticated with check(public.staff_has_permission('reviews.write'));
create policy "staff module update draw_results" on public.draw_results for update to authenticated using(public.staff_has_permission('reviews.write')) with check(public.staff_has_permission('reviews.write'));
create policy "staff module delete draw_results" on public.draw_results for delete to authenticated using(public.staff_has_permission('reviews.write'));
create policy "staff followups update" on public.crm_followups for update to authenticated using(public.staff_has_permission('followups.write')) with check(public.staff_has_permission('followups.write'));

-- Harden privileged legacy RPC checks: banking actions require bank.write,
-- preview simulation requires preview.write, statistics require preview.read.
do $patch$
declare v_name text;v_oid oid;v_def text;v_old text;v_new text;
begin
 for v_name in select unnest(array[
   'close_bank_recon_item','create_bank_recon_claim','import_bank_recon_movements','match_bank_recon_movement'
 ]) loop
   select p.oid into v_oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname=v_name and p.prokind='f';
   if v_oid is null then raise exception 'Required bank function missing: %',v_name;end if;
   v_def:=pg_get_functiondef(v_oid);
   v_old:='not exists (select 1 from public.oportunia_admins where user_id=v_actor)';
   if position(v_old in v_def)=0 then raise exception 'Unknown authorization clause in %',v_name; end if;
   v_new:='not public.staff_has_permission(''bank.write'')';
   execute replace(v_def,v_old,v_new);
 end loop;
 select p.oid into v_oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='simulate_preview_extra_milestone' and p.prokind='f';
 if v_oid is null then raise exception 'Preview simulation function missing';end if;
 v_def:=pg_get_functiondef(v_oid);
 v_old:='not exists(select 1 from public.oportunia_admins a where a.user_id=v_actor)';
 if position(v_old in v_def)=0 then raise exception 'Preview simulation guard differs';end if;
 execute replace(v_def,v_old,'not public.staff_has_permission(''preview.write'')');
 select p.oid into v_oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='get_preview_admin_summary' and p.prokind='f';
 if v_oid is null then raise exception 'Preview summary function missing';end if;
 v_def:=pg_get_functiondef(v_oid);
 v_old:='not exists(\n   select 1 from public.oportunia_admins a where a.user_id=v_actor\n )';
 if position(v_old in v_def)=0 then raise exception 'Preview summary guard differs';end if;
 execute replace(v_def,v_old,'not public.staff_has_permission(''preview.read'')');
end; $patch$;
