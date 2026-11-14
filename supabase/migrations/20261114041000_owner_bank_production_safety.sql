-- Oportunia · hard stop for accidental privilege escalation and bank "verified" claims.
-- Preserves the currently authorized owner; no customer/payment/sortee state is mutated.
do $owner$
declare v_owners int; v_trigger record;
begin
 select count(*) into v_owners from public.oportunia_admins;
 if v_owners<>1 then
   raise exception 'Expected exactly one pre-existing owner before removing the auto-owner trigger, got %',v_owners;
 end if;
 select t.tgname, p.proname as function_name into v_trigger
 from pg_trigger t join pg_proc p on p.oid=t.tgfoid
 where t.tgrelid='auth.users'::regclass and t.tgname='oportunia_owner_verified_email';
 if v_trigger.tgname is null or v_trigger.function_name<>'authorize_oportunia_owner_after_email_verification' then
   raise exception 'Unexpected owner trigger, no automatic change made';
 end if;
end $owner$;
drop trigger oportunia_owner_verified_email on auth.users;
drop function public.authorize_oportunia_owner_after_email_verification();
comment on table public.oportunia_admins is
 'Owner allowlist managed through controlled administrative process only. Never grant ownership automatically based on an email string.';

-- All existing and future imported bank records are operator-provided.
-- This schema blocks interpreting a customer declaration or a CSV match
-- as authoritative confirmation from a bank. Real provider integration will
-- require an explicit, reviewed schema migration.
alter table public.bank_recon_movements
  add column source_verification text not null default 'operator_uploaded_unverified'
  constraint bank_movement_source_verification_check check
  (source_verification='operator_uploaded_unverified');

alter table public.bank_recon_claims
  add column payment_verification text not null default 'not_verified'
  constraint bank_claim_payment_verification_check check
  (payment_verification='not_verified');

comment on column public.bank_recon_movements.source_verification is
 'Operator-loaded extract only. Matching a declared reference does not prove the movement originated from the bank or confirm a credit.';
comment on column public.bank_recon_claims.payment_verification is
 'Always not_verified until an authorized external banking provider attestation is separately integrated; neither pending nor matched means paid.';

create function public.get_operational_readiness()
returns jsonb language plpgsql stable security definer set search_path='' as $readiness$
declare v_role text; v_summary jsonb;
begin
 if auth.uid() is null or not public.staff_has_permission('audit.read') then
   raise exception 'Acceso denegado al diagnóstico de producción';
 end if;
 v_role:=public.staff_role_for_current_user();
 select jsonb_build_object(
  'mode','non_commercial_preview',
  'owner_count',(select count(*) from public.oportunia_admins),
  'owner_auto_email_grant_enabled',false,
  'bank_provider_connection_available',false,
  'bank_files_uploaded',(select count(*) from public.bank_recon_movements),
  'bank_file_matches',(select count(*) from public.bank_recon_movements where status='matched'),
  'bank_provider_verified_movements',0,
  'customer_reports',(select count(*) from public.bank_recon_claims),
  'customer_reports_verified',0,
  'preview_reservations',(select count(*) from public.preview_reservations),
  'official_sales_enabled',false,
  'official_draw_entries_enabled',false,
  'legal_authorization_verified_in_app',false,
  'password_leak_protection','requires_console_review',
  'vercel_deployment','requires_external_status_check',
  'viewer_role',v_role
 ) into v_summary;
 return v_summary;
end; $readiness$;
revoke all on function public.get_operational_readiness() from public,anon,authenticated;
grant execute on function public.get_operational_readiness() to authenticated;
