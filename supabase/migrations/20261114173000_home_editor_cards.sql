-- Editorial content only. No payments, reservations or eligible numbers are changed.
create table public.home_content (
 id text primary key check (id='homepage'),
 content jsonb not null check(jsonb_typeof(content)='object' and octet_length(content::text)<=18000),
 updated_at timestamptz not null default now()
);
insert into public.home_content(id,content) values('homepage',jsonb_build_object(
 'heroEyebrow','OPORTUNIDAD DESTACADA',
 'heroPrefix','¡Descubre el próximo',
 'heroDescription','Descubre premios, conoce cómo elegir tus números y sigue las novedades de cada edición.',
 'primaryButton','Explorar oportunidades',
 'secondaryButton','Cómo funciona',
 'carouselKicker','EXPLORA OPORTUNIA',
 'carouselTitle','Premios que emocionan.',
 'carouselDescription','Descubre los premios y las ideas para futuras ediciones.',
 'trustLabels',jsonb_build_array('Reglas claras','Elige tus números','Mantente informado'),
 'benefits',jsonb_build_array(
  jsonb_build_object('title','Seguro y confiable','detail','Historial de tus reportes y acceso protegido a tu cuenta.'),
  jsonb_build_object('title','Fácil de participar','detail','Conoce las reglas y descubre cómo elegir tus números.'),
  jsonb_build_object('title','Opciones de pago','detail','Explora las modalidades de pago definidas para cada edición.'),
  jsonb_build_object('title','Seguimiento en tiempo real','detail','Revisa los cambios registrados en tu cuenta y tus avisos.')
 )
));
create table public.home_cards (
 id text primary key check(id ~ '^[a-z0-9][a-z0-9-]{2,60}$'),
 title text not null check (length(trim(title)) between 3 and 90),
 description text not null default '' check(length(description)<=240),
 image_url text check(image_url is null or length(image_url)<=1200),
 display_order integer not null default 10 check(display_order between 0 and 10000),
 enabled boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
comment on table public.home_cards is 'Editorial ideas for homepage only; NEVER entries in a real paid draw or reservation catalog.';
insert into public.home_cards(id,title,description,display_order) values
('concepto-consola','Consola de videojuegos','Una propuesta de premio para quienes disfrutan jugar.',2),
('concepto-televisor','Smart TV 55″','Una idea para futuras ediciones de entretenimiento en casa.',3),
('concepto-moto','Motocicleta urbana','Una idea de premio para disfrutar de nuevas aventuras.',4),
('concepto-portatil','Computador portátil','Una idea de premio para estudiar, crear o trabajar.',5),
('concepto-tablet','Tablet de última generación','Una propuesta para una futura edición.',6);
create index home_cards_order_idx on public.home_cards(display_order,id);
alter table public.home_content enable row level security;
alter table public.home_cards enable row level security;
revoke all on public.home_content,public.home_cards from public,anon,authenticated;
grant select on public.home_content,public.home_cards to anon,authenticated;
grant insert,update,delete on public.home_cards to authenticated;
grant update(content,updated_at) on public.home_content to authenticated;
create policy "public reads homepage copy" on public.home_content for select to anon,authenticated using(true);
create policy "staff updates homepage copy" on public.home_content for update to authenticated
 using(public.staff_has_permission('catalog.write'))
 with check(public.staff_has_permission('catalog.write') and id='homepage');
create policy "visitors see enabled marketing cards" on public.home_cards for select to anon
 using(enabled);
create policy "staff sees all marketing cards" on public.home_cards for select to authenticated
 using(enabled or public.staff_has_permission('catalog.read'));
create policy "staff creates marketing cards" on public.home_cards for insert to authenticated
 with check(public.staff_has_permission('catalog.write'));
create policy "staff updates marketing cards" on public.home_cards for update to authenticated
 using(public.staff_has_permission('catalog.write'))
 with check(public.staff_has_permission('catalog.write'));
create policy "staff deletes marketing cards" on public.home_cards for delete to authenticated
 using(public.staff_has_permission('catalog.write'));
