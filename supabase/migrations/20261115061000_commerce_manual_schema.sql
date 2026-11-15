-- Oportunia: real orders with explicit authorization gate and manual banking validation.
-- Do not merge legacy preview reservations, claims or credits into these tables.
create table public.commerce_draws(
 draw_id text primary key references public.draw_catalog(id) on delete restrict,
 authority_name text not null default '',
 operator_name text not null default '',
 authorization_reference text not null default '',
 authorization_document_url text not null default '',
 rules_url text not null default '',
 authorized_from date,
 authorized_until date,
 scheme_10_40_authorized boolean not null default false,
 legal_checked_at timestamptz,
 legal_checked_by uuid references auth.users(id),
 sales_enabled boolean not null default false,
 price_cop bigint not null default 50000 check(price_cop=50000),
 max_orders int not null default 200 check(max_orders between 1 and 200),
 updated_at timestamptz not null default now(),
 constraint permit_required_before_sales check (
   not sales_enabled or (
     legal_checked_at is not null and legal_checked_by is not null
     and scheme_10_40_authorized
     and length(btrim(authority_name))>=3 and length(btrim(operator_name))>=3
     and length(btrim(authorization_reference))>=5
     and authorization_document_url ~ '^https://[^ ]+$'
     and rules_url ~ '^https://[^ ]+$'
     and authorized_from is not null and authorized_until is not null
     and authorized_until>=authorized_from
   )
 )
);
create table public.commerce_orders(
 id uuid primary key default gen_random_uuid(),
 draw_id text not null references public.commerce_draws(draw_id),
 user_id uuid not null references auth.users(id),
 selection_mode text not null check(selection_mode in ('manual','automatic')),
 payment_plan text not null check(payment_plan in ('contado','dos-cuotas','tres-cuotas')),
 price_cop bigint not null default 50000 check(price_cop=50000),
 paid_cop bigint not null default 0 check(paid_cop between 0 and 50000),
 status text not null default 'reserved'
   check(status in ('reserved','proof_pending','part_paid','paid','expired','cancelled')),
 terms_accepted_at timestamptz not null,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 review_due_at timestamptz,
 updated_at timestamptz not null default now(),
 unique(id,draw_id),
 constraint commerce_consistent_payment check(
   (status='reserved' and paid_cop=0)
   or (status='proof_pending' and paid_cop<price_cop)
   or (status='part_paid' and paid_cop>0 and paid_cop<price_cop)
   or (status='paid' and paid_cop=price_cop)
   or (status in ('expired','cancelled') and paid_cop=0)
 )
);
create unique index commerce_one_pending_order on public.commerce_orders(draw_id,user_id)
 where status in ('reserved','proof_pending','part_paid');
create index commerce_orders_draw_status on public.commerce_orders(draw_id,status,expires_at);
create index commerce_orders_user on public.commerce_orders(user_id,created_at desc);
create table public.commerce_numbers(
 draw_id text not null,
 number int not null check(number between 0 and 9999),
 order_id uuid not null,
 category text not null check(category in ('initial','extra')),
 created_at timestamptz not null default now(),
 primary key(draw_id,number),
 foreign key(order_id,draw_id) references public.commerce_orders(id,draw_id),
 unique(order_id,number)
);
create index commerce_numbers_order on public.commerce_numbers(order_id);

create table public.commerce_receipts(
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.commerce_orders(id),
 user_id uuid not null references auth.users(id),
 destination_bank text not null check(destination_bank in ('BANCOLOMBIA','NEQUI')),
 origin_channel text not null check(origin_channel in ('BANCOLOMBIA','NEQUI','BRE-B','DAVIPLATA','OTRO')),
 claimed_reference text not null check(claimed_reference ~ '^[A-Z0-9][A-Z0-9._/-]{3,99}$'),
 receipt_path text not null,
 amount_cop bigint not null check(amount_cop between 1000 and 50000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id),
 rejection_reason text,
 created_at timestamptz not null default now(),
 unique(destination_bank,claimed_reference),
 constraint commerce_review_fields check(
   (status='pending' and reviewed_at is null and reviewed_by is null)
   or (status in ('approved','rejected') and reviewed_at is not null and reviewed_by is not null)
 )
);
create unique index commerce_one_receipt_awaiting_review
 on public.commerce_receipts(order_id) where status='pending';
create index commerce_receipts_review_queue on public.commerce_receipts(status,created_at desc);
create table public.commerce_confirmed_credits(
 id uuid primary key default gen_random_uuid(),
 receipt_id uuid not null unique references public.commerce_receipts(id),
 order_id uuid not null references public.commerce_orders(id),
 bank text not null check(bank in ('BANCOLOMBIA','NEQUI')),
 bank_transaction_reference text not null,
 bank_credit_date date not null,
 amount_cop bigint not null check(amount_cop>0),
 verified_by uuid not null references auth.users(id),
 verification_note text not null check(length(btrim(verification_note))>=20),
 verified_at timestamptz not null default now(),
 unique(bank,bank_transaction_reference)
);
create index commerce_credits_order on public.commerce_confirmed_credits(order_id);
create table public.commerce_events(
 id bigint generated always as identity primary key,
 order_id uuid not null references public.commerce_orders(id),
 actor_id uuid references auth.users(id),
 event_type text not null,
 detail jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index commerce_events_order on public.commerce_events(order_id,created_at desc);
create table public.commerce_group_consent(
 order_id uuid primary key references public.commerce_orders(id),
 user_id uuid not null references auth.users(id),
 consented_at timestamptz,
 revoked_at timestamptz,
 updated_at timestamptz not null default now()
);
create table public.commerce_whatsapp_groups(
 draw_id text primary key references public.commerce_draws(draw_id),
 group_name text not null check(length(btrim(group_name)) between 3 and 120),
 invite_url text not null check(invite_url ~ '^https://chat[.]whatsapp[.]com/[A-Za-z0-9]+$'),
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now()
);
-- Receipts are private; no public URL. Supabase Storage enforces MIME and max size.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('oportunia-receipts','oportunia-receipts',false,5242880,
 array['image/jpeg','image/png','image/webp','application/pdf'])
 on conflict(id) do update set public=false,file_size_limit=5242880,
 allowed_mime_types=array['image/jpeg','image/png','image/webp','application/pdf'];
create policy "oportunia customer writes own receipt" on storage.objects
 for insert to authenticated
 with check(bucket_id='oportunia-receipts' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "oportunia receipts private to owner or treasury" on storage.objects
 for select to authenticated
 using(bucket_id='oportunia-receipts' and
 ((storage.foldername(name))[1]=(select auth.uid())::text or
 public.staff_has_permission('bank.read')));
do $$
declare t text;
begin
 foreach t in array array['commerce_draws','commerce_orders','commerce_numbers','commerce_receipts',
 'commerce_confirmed_credits','commerce_events','commerce_group_consent','commerce_whatsapp_groups']
 loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
create policy "commerce draw visible to authenticated" on public.commerce_draws
 for select to authenticated using(true);
create policy "commerce orders private" on public.commerce_orders
 for select to authenticated
 using(user_id=(select auth.uid()) or public.staff_has_permission('bank.read'));
create policy "commerce numbers own or staff" on public.commerce_numbers
 for select to authenticated using(
 exists(select 1 from public.commerce_orders o where o.id=order_id
 and (o.user_id=(select auth.uid()) or public.staff_has_permission('bank.read'))));
create policy "commerce receipts own or staff" on public.commerce_receipts
 for select to authenticated
 using(user_id=(select auth.uid()) or public.staff_has_permission('bank.read'));
create policy "commerce verified credits own or staff" on public.commerce_confirmed_credits
 for select to authenticated using(
 exists(select 1 from public.commerce_orders o where o.id=order_id
 and (o.user_id=(select auth.uid()) or public.staff_has_permission('bank.read'))));
create policy "commerce audit own or staff" on public.commerce_events
 for select to authenticated using(exists(select 1 from public.commerce_orders o
 where o.id=order_id and (o.user_id=(select auth.uid()) or public.staff_has_permission('bank.read'))));
create policy "commerce consent own or staff" on public.commerce_group_consent
 for select to authenticated
 using(user_id=(select auth.uid()) or public.staff_has_permission('bank.read'));
create policy "commerce WhatsApp invite only after payment and consent" on public.commerce_whatsapp_groups
 for select to authenticated using(public.staff_has_permission('bank.read') or
 exists(select 1 from public.commerce_orders o
 join public.commerce_group_consent c on c.order_id=o.id
 where o.draw_id=commerce_whatsapp_groups.draw_id and o.user_id=(select auth.uid())
 and o.status='paid' and c.user_id=o.user_id and c.consented_at is not null
 and c.revoked_at is null));
-- Operational row mutations may ONLY occur in approved SECURITY DEFINER functions below.
comment on table public.commerce_orders is 'Real checkout holds. Pending proof blocks numbers until manual review; never auto-approves payment.';
comment on table public.commerce_confirmed_credits is 'Attested manual bank verification; NOT a bank-API certification.';
