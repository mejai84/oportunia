import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(path:string)=>readFileSync(path,"utf8");
const schema=read("supabase/migrations/20261115093000_commerce_legal_modes_countries.sql");
const rpc=read("supabase/migrations/20261115093100_commerce_legal_modes_rpc.sql");
const admin=read("src/app/admin/ventas/page.tsx");
const checkout=read("src/components/CommerceCustomer.tsx");
const rules=read("src/app/reglas/page.tsx");

test("both regulatory regimes are configured per edition with explicit ISO country",()=>{
 assert.ok(schema.includes("permit_required"));
 assert.ok(schema.includes("no_permit_required"));
 assert.ok(schema.includes("country_code"));
 assert.ok(admin.includes("Autorización requerida"));
 assert.ok(admin.includes("No requiere autorización específica"));
 assert.ok(admin.includes("p_country_code"));
 assert.ok(admin.includes("configure_commerce_draw_v2"));
});
test("Colombia cannot be labeled license-free and foreign exceptions require a legal basis",()=>{
 assert.ok(schema.includes("country_code <> 'CO'"));
 assert.ok(rpc.includes("c='CO' and mode='no_permit_required'"));
 assert.ok(rpc.includes("length(btrim(coalesce(p_legal_basis,'')))<100"));
 assert.ok(rpc.includes("p_legal_basis_url"));
 assert.ok(schema.includes("length(btrim(legal_basis))>=100"));
 assert.ok(schema.includes("legal_basis_url ~ '^https://[^ ]+$'"));
});
test("the old authorization-only RPC cannot bypass new jurisdiction protections",()=>{
 assert.ok(rpc.includes("revoke execute on function public.configure_commerce_draw("));
 assert.ok(schema.includes("commerce_jurisdiction_sales_guard"));
 assert.ok(schema.includes("commerce_country_immutable_after_orders"));
 assert.ok(schema.includes("No se puede cambiar el país ni la modalidad legal"));
});
test("a foreign user cannot self-declare a safe jurisdiction to place orders",()=>{
 assert.ok(schema.includes("commerce_country_verifications"));
 assert.ok(schema.includes("new.user_id"));
 assert.ok(schema.includes("v.expires_at>now()"));
 assert.ok(rpc.includes("review_commerce_country_request"));
 assert.ok(rpc.includes("request_commerce_country_review"));
 assert.ok(rpc.includes("Solo propietario revisa la residencia"));
 assert.ok(checkout.includes("!countryEligible"));
 assert.ok(checkout.includes("Solicitar revisión de mi país"));
});
test("customers see the correct evidence and international COP limitation",()=>{
 assert.ok(checkout.includes("activeDraw?.legal_mode"));
 assert.ok(checkout.includes("legal_basis_url"));
 assert.ok(checkout.includes("authorization_document_url"));
 assert.ok(checkout.includes("Bancolombia o Nequi"));
 assert.ok(rules.includes("modalidad legal"));
 assert.ok(rules.includes("no se ha habilitado una pasarela"));
});
