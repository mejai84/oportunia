-- Limit receipt uploads to an actual owned, still payable order.
drop policy if exists "oportunia customer writes own receipt" on storage.objects;
create policy "oportunia customer writes own receipt" on storage.objects
 for insert to authenticated
 with check (
  bucket_id='oportunia-receipts'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists(
   select 1 from public.commerce_orders o
   where o.user_id=(select auth.uid())
   and o.id::text=(storage.foldername(name))[2]
   and o.status in ('reserved','part_paid')
   and (o.status='part_paid' or o.expires_at>now())
  )
 );

-- Database users cannot call helper trigger functions as arbitrary RPCs.
revoke all on function public.prevent_unconfigured_commerce_draw() from public,anon,authenticated;
revoke all on function public.guard_noncommercial_social_proof() from public,anon,authenticated;

-- Replace the pre-commerce static health diagnostic with operational facts.
-- A human-attested permit is not asserted to be independently legally validated.
create or replace function public.get_operational_readiness()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare role_name text; summary jsonb;
begin
 if auth.uid() is null or not public.staff_has_permission('audit.read') then
 raise exception 'Acceso denegado al diagnóstico';end if;
 role_name:=public.staff_role_for_current_user();
 select jsonb_build_object(
  'mode',case when exists(select 1 from public.commerce_draws c where c.sales_enabled
    and (now() at time zone 'America/Bogota')::date between c.authorized_from and c.authorized_until)
     then 'commerce_manual_review' else 'non_commercial_preview' end,
  'owner_count',(select count(*) from public.oportunia_admins),
  'owner_auto_email_grant_enabled',false,
  'bank_provider_connection_available',false,
  'bank_files_uploaded',(select count(*) from public.bank_recon_movements),
  'bank_file_matches',(select count(*) from public.bank_recon_movements where status='matched'),
  'bank_provider_verified_movements',0,
  'customer_reports',(select count(*) from public.bank_recon_claims),
  'customer_reports_verified',0,
  'preview_reservations',(select count(*) from public.preview_reservations),
  'official_sales_enabled',(select count(*)>0 from public.commerce_draws c
    where c.sales_enabled and (now() at time zone 'America/Bogota')::date
    between c.authorized_from and c.authorized_until),
  'official_draw_entries_enabled',false,
  'legal_authorization_verified_in_app',false,
  'commerce_owner_authorizations_recorded',(select count(*) from public.commerce_draws where legal_checked_at is not null),
  'commerce_active_editions',(select count(*) from public.commerce_draws where sales_enabled),
  'commerce_manual_confirmed_credits',(select count(*) from public.commerce_confirmed_credits),
  'commerce_pending_receipts',(select count(*) from public.commerce_receipts where status='pending'),
  'commerce_published_bank_accounts',(select count(*) from public.commerce_payment_channels where enabled),
  'password_leak_protection','requires_console_review',
  'vercel_deployment','requires_external_status_check',
  'viewer_role',role_name
 ) into summary;
 return summary;
end $$;
