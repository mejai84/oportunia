-- Oportunia: independent, non-commercial 40-number simulation + reference linkage.
-- The simulated milestones never consume a bank report, assert payment, or qualify a draw.
alter table public.preview_reserved_numbers
  add column category text not null default 'initial'
    check(category in ('initial','extra_demo')),
  add column milestone smallint not null default 0
    check(milestone between 0 and 4);
alter table public.preview_reserved_numbers
 add constraint preview_category_milestone_ck check (
  (category='initial' and milestone=0)
  or (category='extra_demo' and milestone between 1 and 4)
 );
comment on column public.preview_reserved_numbers.category is
 'initial = 10 chosen numbers; extra_demo = 40 non-commercial simulation allocations.';
create index preview_reserved_kind_idx on public.preview_reserved_numbers(reservation_id,category,milestone);

create table public.preview_extra_events (
 id bigint generated always as identity primary key,
 reservation_id uuid not null references public.preview_reservations(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 milestone smallint not null check(milestone between 1 and 4),
 numbers integer[] not null check(cardinality(numbers)=10),
 created_at timestamptz not null default now(),
 unique(reservation_id,milestone)
);
comment on table public.preview_extra_events is
 'Admin-only demo milestones. No transfers, bank verification, money or eligibility is involved.';
alter table public.preview_extra_events enable row level security;
revoke all on public.preview_extra_events from public,anon,authenticated;
grant select on public.preview_extra_events to authenticated;
create policy "preview owner or admin sees extra demo events"
 on public.preview_extra_events for select to authenticated using(
  exists(select 1 from public.preview_reservations r where r.id=reservation_id
   and (r.user_id=(select auth.uid())
   or exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid()))))
 );

create table public.preview_claim_links (
 id uuid primary key default gen_random_uuid(),
 reservation_id uuid not null references public.preview_reservations(id) on delete cascade,
 claim_id uuid not null unique references public.bank_recon_claims(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 unique(reservation_id,claim_id)
);
comment on table public.preview_claim_links is
 'Traceable association between customer-declared reference and DEMO selection, NOT payment confirmation or entitlement.';
create index preview_claim_links_reservation_idx on public.preview_claim_links(reservation_id);
alter table public.preview_claim_links enable row level security;
revoke all on public.preview_claim_links from public,anon,authenticated;
grant select on public.preview_claim_links to authenticated;
create policy "owner or admin sees declared reference association"
 on public.preview_claim_links for select to authenticated using (
  user_id=(select auth.uid()) or
  exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid()))
 );

-- Modify only expiry/cancellation to keep the 10 original-number audit intact.
-- Both operations release ALL locks, including the demo extras.
create or replace function public.create_preview_reservation(
  p_draw_id text,
  p_selection_mode text,
  p_numbers integer[],
  p_preferred_plan text default 'contado'
) returns uuid language plpgsql security definer set search_path='' as $func$
declare
 v_user uuid:=auth.uid();
 v_id uuid;
 v_numbers integer[];
 v_expired record;
 v_active int;
 v_count int;
 v_mode text:=lower(btrim(coalesce(p_selection_mode,'')));
 v_plan text:=lower(btrim(coalesce(p_preferred_plan,'')));
begin
 if v_user is null then raise exception 'Inicia sesión para crear una selección de prueba'; end if;
 if v_mode not in ('manual','automatic') or v_plan not in ('contado','dos-cuotas','tres-cuotas') then
   raise exception 'Modo o plan de demostración inválido';
 end if;
 perform 1 from public.draw_catalog d where d.id=p_draw_id and d.enabled=true
   and d.status='preview' for update;
 if not found then raise exception 'El sorteo no está habilitado para ensayos'; end if;

 -- Reclaim outdated locks and keep the original selections in immutable events.
 for v_expired in
   update public.preview_reservations
   set status='expired',closed_at=now()
   where draw_id=p_draw_id and status='active' and expires_at<=now()
   returning id,user_id
 loop
   insert into public.preview_reservation_events(reservation_id,actor_id,event_type,numbers)
   select v_expired.id,v_expired.user_id,'expired',array_agg(n.number order by n.number)
   from public.preview_reserved_numbers n where n.reservation_id=v_expired.id and n.category='initial'
   having count(*)=10;
 end loop;
 delete from public.preview_reserved_numbers n using public.preview_reservations r
 where n.reservation_id=r.id and r.draw_id=p_draw_id and r.status in ('expired','cancelled');

 if exists(select 1 from public.preview_reservations
           where draw_id=p_draw_id and user_id=v_user and status='active') then
   raise exception 'Ya tienes una selección de prueba vigente para esta edición';
 end if;
 if (select count(*) from public.preview_reservations
     where user_id=v_user and created_at>now()-interval '24 hours')>=5 then
   raise exception 'Límite de cinco ensayos por cuenta cada 24 horas';
 end if;
 select count(*) into v_active from public.preview_reservations
 where draw_id=p_draw_id and status='active';
 if v_active>=200 then raise exception 'El cupo de 200 oportunidades de prueba está completo'; end if;

 if v_mode='manual' then
   if cardinality(p_numbers) is distinct from 10
     or exists(select 1 from unnest(p_numbers) as x(n)
        where x.n is null or x.n<0 or x.n>9999)
     or (select count(distinct x.n) from unnest(p_numbers) as x(n))<>10 then
     raise exception 'Debes elegir exactamente diez números diferentes, entre 0000 y 9999';
   end if;
   v_numbers:=p_numbers;
   if exists(select 1 from public.preview_reserved_numbers n
             where n.draw_id=p_draw_id and n.number=any(v_numbers)) then
     raise exception 'Uno o varios números ya están ocupados. Actualiza la disponibilidad';
   end if;
 else
   if coalesce(cardinality(p_numbers),0)<>0 then
     raise exception 'La selección automática no admite números enviados manualmente';
   end if;
   select coalesce(array_agg(candidate.n order by candidate.n),'{}'::integer[])
   into v_numbers
   from (
     select g.n from generate_series(0,9999) as g(n)
     where not exists(select 1 from public.preview_reserved_numbers n
                      where n.draw_id=p_draw_id and n.number=g.n)
     order by random() limit 10
   ) candidate;
   if cardinality(v_numbers)<>10 then
     raise exception 'No quedan diez números libres para la selección automática';
   end if;
 end if;

 insert into public.preview_reservations(draw_id,user_id,selection_mode,preferred_plan,expires_at)
 values(p_draw_id,v_user,v_mode,v_plan,now()+interval '24 hours')
 returning id into v_id;
 insert into public.preview_reserved_numbers(draw_id,reservation_id,number)
 select p_draw_id,v_id,n from unnest(v_numbers) as x(n);
 get diagnostics v_count=row_count;
 if v_count<>10 then raise exception 'No se bloquearon exactamente diez números'; end if;
 insert into public.preview_reservation_events(reservation_id,actor_id,event_type,numbers)
 values(v_id,v_user,'created',v_numbers);
 return v_id;
end; $func$;


create or replace function public.cancel_preview_reservation(p_reservation_id uuid)
returns void language plpgsql security definer set search_path='' as $func$
declare
 v_user uuid:=auth.uid();
 v_draw text;
 v_res public.preview_reservations%rowtype;
 v_numbers integer[];
begin
 if v_user is null then raise exception 'Debes iniciar sesión'; end if;
 select r.draw_id into v_draw from public.preview_reservations r where r.id=p_reservation_id;
 if v_draw is null then raise exception 'Selección no encontrada'; end if;
 perform 1 from public.draw_catalog d where d.id=v_draw for update;
 select * into v_res from public.preview_reservations r
 where r.id=p_reservation_id for update;
 if v_res.user_id<>v_user then raise exception 'No puedes cancelar una selección ajena'; end if;
 if v_res.status<>'active' or v_res.expires_at<=now() then
   raise exception 'La selección ya terminó o venció';
 end if;
 select array_agg(n.number order by n.number) into v_numbers
 from public.preview_reserved_numbers n where n.reservation_id=p_reservation_id and n.category='initial';
 if cardinality(v_numbers)<>10 then raise exception 'La selección tiene datos inconsistentes'; end if;
 update public.preview_reservations set status='cancelled',closed_at=now()
 where id=p_reservation_id;
 delete from public.preview_reserved_numbers where reservation_id=p_reservation_id;
 insert into public.preview_reservation_events(reservation_id,actor_id,event_type,numbers)
 values(p_reservation_id,v_user,'cancelled',v_numbers);
end; $func$;



create function public.simulate_preview_extra_milestone(p_reservation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare
  v_actor uuid:=auth.uid();
  v_draw text;
  v_res public.preview_reservations%rowtype;
  v_milestone smallint;
  v_number_count integer;
  v_numbers integer[];
  v_count integer;
begin
  if v_actor is null or not exists(select 1 from public.oportunia_admins a where a.user_id=v_actor) then
    raise exception 'Solo administración puede simular números adicionales';
  end if;
  select r.draw_id into v_draw from public.preview_reservations r where r.id=p_reservation_id;
  if v_draw is null then raise exception 'Selección de ensayo inexistente'; end if;
  perform 1 from public.draw_catalog d where d.id=v_draw and d.enabled=true
    and d.status='preview' for update;
  if not found then raise exception 'La edición no admite nuevos ensayos'; end if;
  select * into v_res from public.preview_reservations r where r.id=p_reservation_id for update;
  if v_res.id is null or v_res.status<>'active' or v_res.expires_at<=now() then
    raise exception 'La selección terminó o está vencida';
  end if;
  select count(*) into v_number_count from public.preview_reserved_numbers n
   where n.reservation_id=p_reservation_id and n.category='initial';
  if v_number_count<>10 then raise exception 'La selección inicial está incompleta'; end if;
  select count(*) into v_count from public.preview_reserved_numbers n
   where n.reservation_id=p_reservation_id and n.category='extra_demo';
  if v_count>=40 or mod(v_count,10)<>0 then
    raise exception 'Los cuatro hitos de demostración ya fueron completados o el registro tiene inconsistencias';
  end if;
  v_milestone:=v_count/10+1;
  select coalesce(array_agg(candidate.n order by candidate.n),'{}'::integer[]) into v_numbers
  from (
    select g.n from generate_series(0,9999) as g(n)
    where not exists(select 1 from public.preview_reserved_numbers used
      where used.draw_id=v_draw and used.number=g.n)
    order by random() limit 10
  ) candidate;
  if cardinality(v_numbers)<>10 then raise exception 'No quedan diez números libres para el ensayo'; end if;
  insert into public.preview_reserved_numbers(draw_id,reservation_id,number,category,milestone)
  select v_draw,p_reservation_id,n,'extra_demo',v_milestone from unnest(v_numbers) as x(n);
  get diagnostics v_number_count=row_count;
  if v_number_count<>10 then raise exception 'No fue posible asignar el hito completo'; end if;
  insert into public.preview_extra_events(reservation_id,actor_id,milestone,numbers)
  values(p_reservation_id,v_actor,v_milestone,v_numbers);
  return jsonb_build_object('milestone',v_milestone,'numbers',v_numbers,'simulation',true);
end; $function$;

create function public.link_preview_claim_for_tracking(p_reservation_id uuid,p_claim_id uuid)
returns uuid language plpgsql security definer set search_path='' as $function$
declare
 v_actor uuid:=auth.uid();
 v_res public.preview_reservations%rowtype;
 v_claim public.bank_recon_claims%rowtype;
 v_id uuid;
begin
 if v_actor is null then raise exception 'Inicia sesión para registrar seguimiento'; end if;
 select * into v_res from public.preview_reservations r where r.id=p_reservation_id;
 if v_res.id is null or v_res.user_id<>v_actor or v_res.status<>'active'
    or v_res.expires_at<=now() then
   raise exception 'La selección no existe, venció o pertenece a otra cuenta';
 end if;
 select * into v_claim from public.bank_recon_claims c where c.id=p_claim_id;
 if v_claim.id is null or v_claim.customer_user_id<>v_actor or v_claim.status='rejected' then
   raise exception 'No se puede vincular un reporte ajeno, rechazado o inexistente';
 end if;
 if (select count(*) from public.preview_claim_links
     where reservation_id=p_reservation_id)>=4 then
   raise exception 'Máximo cuatro referencias de seguimiento por selección';
 end if;
 insert into public.preview_claim_links(reservation_id,claim_id,user_id)
 values(p_reservation_id,p_claim_id,v_actor) returning id into v_id;
 return v_id;
end; $function$;

revoke all on function public.simulate_preview_extra_milestone(uuid) from public,anon,authenticated;
revoke all on function public.link_preview_claim_for_tracking(uuid,uuid) from public,anon,authenticated;
grant execute on function public.simulate_preview_extra_milestone(uuid) to authenticated;
grant execute on function public.link_preview_claim_for_tracking(uuid,uuid) to authenticated;

-- An array result is one JSON value; PostgREST's maximum row limit cannot truncate
-- the global occupancy and silently display taken numbers as free.
create function public.get_preview_occupied_numbers(p_draw_id text)
returns jsonb language plpgsql stable security definer set search_path='' as $function$
declare v_out jsonb;
begin
 if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
 if not exists(select 1 from public.draw_catalog d where d.id=p_draw_id
       and d.enabled=true and d.status='preview') then
   raise exception 'La edición de ensayo no está disponible';
 end if;
 select coalesce(jsonb_agg(n.number order by n.number),'[]'::jsonb)
 into v_out
 from public.preview_reserved_numbers n
 join public.preview_reservations r on r.id=n.reservation_id
 where n.draw_id=p_draw_id and r.status='active' and r.expires_at>now();
 return v_out;
end; $function$;

-- Administrative aggregates are computed over ALL rows, never a page-limited sample.
create function public.get_preview_admin_summary(p_draw_id text)
returns jsonb language plpgsql stable security definer set search_path='' as $function$
declare v_actor uuid:=auth.uid(); v_summary jsonb;
begin
 if v_actor is null or not exists(
   select 1 from public.oportunia_admins a where a.user_id=v_actor
 ) then raise exception 'Solo administración puede ver estadísticas completas'; end if;
 if not exists(select 1 from public.draw_catalog d where d.id=p_draw_id) then
   raise exception 'Edición inexistente';
 end if;
 with counts as (
  select
    (select count(*) from public.preview_reservations r
     where r.draw_id=p_draw_id and r.status='active' and r.expires_at>now()) as active,
    (select count(*) from public.preview_reservations r
     where r.draw_id=p_draw_id and
       (r.status='expired' or (r.status='active' and r.expires_at<=now()))) as expired,
    (select count(*) from public.preview_reservations r
     where r.draw_id=p_draw_id and r.status='cancelled') as cancelled,
    (select count(*) from public.preview_reserved_numbers n
     join public.preview_reservations r on r.id=n.reservation_id
     where n.draw_id=p_draw_id and r.status='active' and r.expires_at>now()) as occupied,
    (select count(*) from public.preview_reserved_numbers n
     join public.preview_reservations r on r.id=n.reservation_id
     where n.draw_id=p_draw_id and n.category='extra_demo'
       and r.status='active' and r.expires_at>now()) as extra
 )
 select jsonb_build_object(
  'active',active, 'expired',expired, 'cancelled',cancelled,
  'occupied',occupied, 'extra',extra,
  'free',10000-occupied, 'remaining',greatest(0,200-active)
 ) into v_summary from counts;
 return v_summary;
end; $function$;

revoke all on function public.get_preview_occupied_numbers(text) from public,anon,authenticated;
revoke all on function public.get_preview_admin_summary(text) from public,anon,authenticated;
grant execute on function public.get_preview_occupied_numbers(text) to authenticated;
grant execute on function public.get_preview_admin_summary(text) to authenticated;
