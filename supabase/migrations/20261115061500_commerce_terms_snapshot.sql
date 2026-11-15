-- Legal evidence: freeze which rules and authorization were active when each order was made.
alter table public.commerce_orders
 add column rules_url_at_purchase text,
 add column authorization_reference_at_purchase text,
 add column operator_name_at_purchase text;

create or replace function public.capture_commerce_order_terms()
returns trigger language plpgsql security definer set search_path='' as $$
declare c public.commerce_draws%rowtype;
begin
 select * into c from public.commerce_draws where draw_id=new.draw_id;
 if c.draw_id is null or not c.sales_enabled or c.rules_url=''
 or c.authorization_reference='' or c.operator_name=''
 then raise exception 'La edición no tiene documentación comercial completa';end if;
 new.rules_url_at_purchase:=c.rules_url;
 new.authorization_reference_at_purchase:=c.authorization_reference;
 new.operator_name_at_purchase:=c.operator_name;
 return new;
end $$;
create trigger commerce_order_terms_snapshot
 before insert on public.commerce_orders
 for each row execute function public.capture_commerce_order_terms();
revoke all on function public.capture_commerce_order_terms() from public,anon,authenticated;

comment on column public.commerce_orders.rules_url_at_purchase is
 'Immutable rules URL displayed and accepted at moment of reservation.';
comment on column public.commerce_orders.authorization_reference_at_purchase is
 'Authorization reference attested by owner at order creation.';
