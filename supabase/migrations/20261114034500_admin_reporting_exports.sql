-- Oportunia: owner/auditor-only reporting. All numbers sourced from persisted PostgreSQL.
-- A bank-extract match is not a bank API confirmation, payment or company revenue.
create table public.admin_report_export_requests (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  report_type text not null check (report_type in ('summary','activity')),
  period_start date not null,
  period_end date not null,
  rows_requested integer not null check (rows_requested between 0 and 20000),
  requested_at timestamptz not null default now(),
  constraint report_period_order check(period_start<=period_end)
);
comment on table public.admin_report_export_requests is
 'Append-only request log, not proof that a CSV was saved or opened on the user device.';
alter table public.admin_report_export_requests enable row level security;
revoke all on public.admin_report_export_requests from public,anon,authenticated;
grant select on public.admin_report_export_requests to authenticated;
create policy "owner and auditor inspect report export requests"
  on public.admin_report_export_requests for select to authenticated
  using (public.staff_has_permission('audit.read'));

create function public.get_admin_reporting_summary(p_from date,p_to date)
returns jsonb language plpgsql stable security definer set search_path='' as $report$
declare v_out jsonb; v_first timestamptz; v_after timestamptz;
begin
 if auth.uid() is null or not public.staff_has_permission('audit.read') then
  raise exception 'No autorizado para consultar informes';
 end if;
 if p_from is null or p_to is null or p_from>p_to or p_to-p_from>365 then
  raise exception 'Selecciona un período válido de hasta 366 días';
 end if;
 v_first:=p_from::timestamp at time zone 'America/Bogota';
 v_after:=(p_to+1)::timestamp at time zone 'America/Bogota';
 with
  profiles as materialized (
    select p.created_at from public.customer_profiles p where p.created_at>=v_first and p.created_at<v_after
  ),
  claims as materialized (
    select c.created_at,c.status,c.expected_amount_cop
    from public.bank_recon_claims c where c.created_at>=v_first and c.created_at<v_after
  ),
  movements as materialized (
    select m.imported_at,m.status,m.amount_cop
    from public.bank_recon_movements m where m.imported_at>=v_first and m.imported_at<v_after
  ),
  previews as materialized (
    select r.created_at,r.status,r.expires_at
    from public.preview_reservations r where r.created_at>=v_first and r.created_at<v_after
  ),
  extras as materialized (
    select e.created_at from public.preview_extra_events e
    where e.created_at>=v_first and e.created_at<v_after
  ),
  followups as materialized (
    select f.created_at,f.status from public.crm_followups f where f.created_at>=v_first and f.created_at<v_after
  ),
  activity_audit as materialized (
    select x.created_at from public.oportunia_admin_action_audit x
    where x.created_at>=v_first and x.created_at<v_after
  ),
  role_audit as materialized (
    select x.created_at from public.oportunia_staff_audit x
    where x.created_at>=v_first and x.created_at<v_after
  ),
  bank_audit as materialized (
    select x.created_at from public.bank_recon_audit x
    where x.created_at>=v_first and x.created_at<v_after
  ),
  date_axis as (select g.d::date as day from generate_series(p_from,p_to,interval '1 day') as g(d))
 select jsonb_build_object(
  'period',jsonb_build_object('from',p_from,'to',p_to,'time_zone','America/Bogota','status_basis','Estado actual de registros creados o importados dentro del período'),
  'customers',jsonb_build_object('new_accounts',(select count(*) from profiles)),
  'bank_claims',(select jsonb_build_object(
    'total',count(*),'pending',count(*) filter(where status='pending'),
    'matched',count(*) filter(where status='matched'),
    'rejected',count(*) filter(where status='rejected'),
    'amount_declared_cop',coalesce(sum(expected_amount_cop),0),
    'amount_matched_claims_cop',coalesce(sum(expected_amount_cop) filter(where status='matched'),0))
    from claims),
  'bank_movements',(select jsonb_build_object(
    'total',count(*),'matched',count(*) filter(where status='matched'),
    'unmatched',count(*) filter(where status='unmatched'),
    'ignored',count(*) filter(where status='ignored'),
    'amount_imported_cop',coalesce(sum(amount_cop),0),
    'amount_matched_file_cop',coalesce(sum(amount_cop) filter(where status='matched'),0))
    from movements),
  'preview',(select jsonb_build_object(
    'created',count(*),'active_now',count(*) filter(where status='active' and expires_at>now()),
    'expired_now',count(*) filter(where status='expired' or (status='active' and expires_at<=now())),
    'cancelled',count(*) filter(where status='cancelled'),
    'extra_demo_blocks',(select count(*) from extras),
    'extra_demo_numbers',(select count(*)*10 from extras))
    from previews),
  'followups',(select jsonb_build_object(
    'created',count(*),'pending',count(*) filter(where status='pending'),
    'done',count(*) filter(where status='done'),
    'cancelled',count(*) filter(where status='cancelled'))
    from followups),
  'audit',jsonb_build_object(
    'role_changes',(select count(*) from role_audit),
    'content_changes',(select count(*) from activity_audit),
    'bank_actions',(select count(*) from bank_audit)),
  'daily',coalesce((select jsonb_agg(jsonb_build_object(
    'day',d.day,
    'reports',(select count(*) from claims c where (c.created_at at time zone 'America/Bogota')::date=d.day),
    'movements',(select count(*) from movements m where (m.imported_at at time zone 'America/Bogota')::date=d.day),
    'previews',(select count(*) from previews r where (r.created_at at time zone 'America/Bogota')::date=d.day)
  ) order by d.day) from date_axis d),'[]'::jsonb)
 ) into v_out;
 return v_out;
end; $report$;

create function public.get_admin_reporting_activity(
 p_from date,p_to date,p_offset integer default 0,p_limit integer default 100
) returns jsonb language plpgsql stable security definer set search_path='' as $report$
declare v_first timestamptz;v_after timestamptz;v_out jsonb;
begin
 if auth.uid() is null or not public.staff_has_permission('audit.read') then
  raise exception 'No autorizado para consultar eventos';
 end if;
 if p_from is null or p_to is null or p_from>p_to or p_to-p_from>365 then
  raise exception 'Selecciona un período válido de hasta 366 días';
 end if;
 if p_offset is null or p_offset<0 or p_offset>200000 or p_limit is null or p_limit<1 or p_limit>200 then
  raise exception 'Paginación inválida (máximo 200 eventos por consulta)';
 end if;
 v_first:=p_from::timestamp at time zone 'America/Bogota';
 v_after:=(p_to+1)::timestamp at time zone 'America/Bogota';
 with events as materialized (
  select a.created_at as happened_at,'roles'::text as category,a.event_type::text as action,
    coalesce(left(a.actor_id::text,8),'—') as actor,
    coalesce(left(a.target_user_id::text,8),'—') as reference,
    coalesce(a.old_role,'Sin rol')||' → '||coalesce(a.new_role,'Sin rol') as detail,
    'oportunia_staff_audit'::text as source,a.id::text as source_id
   from public.oportunia_staff_audit a where a.created_at>=v_first and a.created_at<v_after
  union all
  select a.created_at,'contenido',a.action||' · '||a.entity,
    coalesce(left(a.actor_id::text,8),'—'),left(a.record_id,24),
    coalesce(a.old_status,'—')||' → '||coalesce(a.new_status,'—'),
    'oportunia_admin_action_audit',a.id::text
   from public.oportunia_admin_action_audit a where a.created_at>=v_first and a.created_at<v_after
  union all
  select a.created_at,'banco',a.action,
    coalesce(left(a.actor_id::text,8),'—'),
    coalesce(left(a.claim_id::text,8),left(a.movement_id::text,8),'—'),
    'Acción sobre referencia o extracto cargado; no es confirmación bancaria automática.',
    'bank_recon_audit',a.id::text
   from public.bank_recon_audit a where a.created_at>=v_first and a.created_at<v_after
  union all
  select a.created_at,'reportes',a.event_type,
    coalesce(left(a.actor_id::text,8),'—'),left(a.claim_id::text,8),
    'Evento de reporte declarado por cliente; no acredita dinero.',
    'bank_recon_claim_events',a.id::text
   from public.bank_recon_claim_events a where a.created_at>=v_first and a.created_at<v_after
  union all
  select a.created_at,'seguimiento',a.event_type,
    coalesce(left(a.actor_id::text,8),'—'),left(a.followup_id::text,8),
    coalesce(a.old_status,'—')||' → '||coalesce(a.new_status,'—'),
    'crm_followup_events',a.id::text
   from public.crm_followup_events a where a.created_at>=v_first and a.created_at<v_after
  union all
  select a.created_at,'ensayos',a.event_type,
    coalesce(left(a.actor_id::text,8),'—'),left(a.reservation_id::text,8),
    'Reserva de prueba · 10 números iniciales, sin pago.',
    'preview_reservation_events',a.id::text
   from public.preview_reservation_events a where a.created_at>=v_first and a.created_at<v_after
  union all
  select a.created_at,'ensayos','Hito extra '||a.milestone::text,
    coalesce(left(a.actor_id::text,8),'—'),left(a.reservation_id::text,8),
    'Diez números adicionales de simulación · sin pago ni participación.',
    'preview_extra_events',a.id::text
   from public.preview_extra_events a where a.created_at>=v_first and a.created_at<v_after
 ), page as (
  select e.* from events e order by e.happened_at desc,e.source,e.source_id desc
  offset p_offset limit p_limit
 )
 select jsonb_build_object(
   'total',(select count(*) from events),
   'offset',p_offset,'limit',p_limit,
   'items',coalesce((select jsonb_agg(
       jsonb_build_object('created_at',p.happened_at,'category',p.category,'action',p.action,
         'actor',p.actor,'reference',p.reference,'detail',p.detail,'source',p.source,'id',p.source||'/'||p.source_id)
       order by p.happened_at desc,p.source,p.source_id desc) from page p),'[]'::jsonb)
 ) into v_out;
 return v_out;
end; $report$;

create function public.register_admin_report_export(
 p_type text,p_from date,p_to date,p_rows integer
) returns bigint language plpgsql security definer set search_path='' as $report$
declare v_id bigint;
begin
 if auth.uid() is null or not public.staff_has_permission('audit.read') then
  raise exception 'No autorizado para solicitar exportaciones';
 end if;
 if p_from is null or p_to is null or p_from>p_to or p_to-p_from>365
    or p_type not in ('summary','activity') or p_rows is null or p_rows<0 or p_rows>20000 then
   raise exception 'Datos de exportación inválidos';
 end if;
 insert into public.admin_report_export_requests(actor_id,report_type,period_start,period_end,rows_requested)
 values(auth.uid(),p_type,p_from,p_to,p_rows) returning id into v_id;
 return v_id;
end; $report$;

revoke all on function public.get_admin_reporting_summary(date,date) from public,anon,authenticated;
revoke all on function public.get_admin_reporting_activity(date,date,integer,integer) from public,anon,authenticated;
revoke all on function public.register_admin_report_export(text,date,date,integer) from public,anon,authenticated;
grant execute on function public.get_admin_reporting_summary(date,date) to authenticated;
grant execute on function public.get_admin_reporting_activity(date,date,integer,integer) to authenticated;
grant execute on function public.register_admin_report_export(text,date,date,integer) to authenticated;
