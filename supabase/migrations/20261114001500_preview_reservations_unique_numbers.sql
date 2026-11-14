-- Oportunia: selección centralizada de PREVISUALIZACIÓN, sin ventas ni sorteos reales.
-- PostgreSQL serializa cada sorteo y garantiza números únicos por edición.
create table public.preview_reservations (
  id uuid primary key default gen_random_uuid(),
  draw_id text not null references public.draw_catalog(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  selection_mode text not null check(selection_mode in ('manual','automatic')),
  preferred_plan text not null check(preferred_plan in ('contado','dos-cuotas','tres-cuotas')),
  status text not null default 'active' check(status in ('active','expired','cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  closed_at timestamptz,
  constraint preview_closure_consistent check (
    (status='active' and closed_at is null)
    or (status<>'active' and closed_at is not null)
  ),
  constraint preview_reservation_draw_pair unique (id,draw_id)
);
comment on table public.preview_reservations is 'Selecciones DEMO no comerciales. No son ventas, participaciones ni reservas oficiales de un sorteo.';
create unique index preview_one_active_per_draw_user on public.preview_reservations(draw_id,user_id)
  where status='active';
create index preview_reservations_expiration_idx on public.preview_reservations(draw_id,status,expires_at);
create index preview_reservations_owner_idx on public.preview_reservations(user_id,created_at desc);

create table public.preview_reserved_numbers (
  draw_id text not null,
  reservation_id uuid not null,
  number integer not null check(number between 0 and 9999),
  created_at timestamptz not null default now(),
  primary key(draw_id,number),
  unique(reservation_id,number),
  constraint preview_number_reservation_fk foreign key(reservation_id,draw_id)
    references public.preview_reservations(id,draw_id) on delete cascade
);
comment on table public.preview_reserved_numbers is 'Bloqueo global de 10 números iniciales por selección demo vigente. No representa participaciones pagadas.';
create index preview_reserved_numbers_reservation_idx on public.preview_reserved_numbers(reservation_id);

create table public.preview_reservation_events (
  id bigint generated always as identity primary key,
  reservation_id uuid not null references public.preview_reservations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check(event_type in ('created','expired','cancelled')),
  numbers integer[] not null,
  created_at timestamptz not null default now(),
  constraint preview_event_numbers_ten check(cardinality(numbers)=10)
);
comment on table public.preview_reservation_events is 'Historial inmutable de selecciones de prueba, con sus 10 números y responsable.';

alter table public.preview_reservations enable row level security;
alter table public.preview_reserved_numbers enable row level security;
alter table public.preview_reservation_events enable row level security;
revoke all on public.preview_reservations,public.preview_reserved_numbers,public.preview_reservation_events
 from public,anon,authenticated;
grant select on public.preview_reservations,public.preview_reserved_numbers,public.preview_reservation_events
 to authenticated;

create policy "own or admin preview reservations"
 on public.preview_reservations for select to authenticated using (
   user_id=(select auth.uid()) or
   exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid()))
 );
create policy "own or admin preview numbers" on public.preview_reserved_numbers for select to authenticated using (
  exists(select 1 from public.preview_reservations r
    where r.id=reservation_id and
    (r.user_id=(select auth.uid()) or
     exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid()))))
);
create policy "own or admin preview events" on public.preview_reservation_events for select to authenticated using (
  exists(select 1 from public.preview_reservations r
    where r.id=reservation_id and
    (r.user_id=(select auth.uid()) or
     exists(select 1 from public.oportunia_admins a where a.user_id=(select auth.uid()))))
);

-- Only expose occupied number values. Never reveal third-party identities or reservation ids.
create function public.list_preview_taken_numbers(p_draw_id text)
returns table(number integer)
language plpgsql stable security definer set search_path='' as $func$
begin
 if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
 if not exists(select 1 from public.draw_catalog d
               where d.id=p_draw_id and d.enabled=true and d.status='preview') then
   raise exception 'Edición de vista previa no disponible';
 end if;
 return query
 select n.number from public.preview_reserved_numbers n
 join public.preview_reservations r on r.id=n.reservation_id
 where n.draw_id=p_draw_id and r.status='active' and r.expires_at>now()
 order by n.number;
end; $func$;

-- One transaction handles expiration, capacity and exclusive number assignment.
-- Locking the draw catalog row serializes simultaneous attempts for the same edition.
create function public.create_preview_reservation(
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
   from public.preview_reserved_numbers n where n.reservation_id=v_expired.id
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

create function public.cancel_preview_reservation(p_reservation_id uuid)
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
 from public.preview_reserved_numbers n where n.reservation_id=p_reservation_id;
 if cardinality(v_numbers)<>10 then raise exception 'La selección tiene datos inconsistentes'; end if;
 update public.preview_reservations set status='cancelled',closed_at=now()
 where id=p_reservation_id;
 delete from public.preview_reserved_numbers where reservation_id=p_reservation_id;
 insert into public.preview_reservation_events(reservation_id,actor_id,event_type,numbers)
 values(p_reservation_id,v_user,'cancelled',v_numbers);
end; $func$;

revoke all on function public.list_preview_taken_numbers(text) from public,anon,authenticated;
revoke all on function public.create_preview_reservation(text,text,integer[],text) from public,anon,authenticated;
revoke all on function public.cancel_preview_reservation(uuid) from public,anon,authenticated;
grant execute on function public.list_preview_taken_numbers(text) to authenticated;
grant execute on function public.create_preview_reservation(text,text,integer[],text) to authenticated;
grant execute on function public.cancel_preview_reservation(uuid) to authenticated;
