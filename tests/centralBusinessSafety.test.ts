import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(p:string)=>readFileSync(p,"utf8");
const numbers=read("src/app/numeros/page.tsx");
const checkout=read("src/components/CommerceCustomer.tsx");
const central=read("src/app/ensayo-reservas/page.tsx");
const account=read("src/app/mi-cuenta/page.tsx");
const admin=read("src/app/admin/numeros/page.tsx");
const access=read("src/app/acceso/page.tsx");
const password=read("src/app/actualizar-contrasena/page.tsx");
const reviews=read("src/components/MyReviews.tsx");
const results=read("src/app/admin/opiniones/page.tsx");

test("commercial checkout and isolated free preview use separate PostgreSQL tables",()=>{
 assert.match(numbers,/<CommerceCustomer\s*\/>/);
 for(const rpc of ["create_commerce_order","get_commerce_taken_numbers","submit_commerce_receipt","cancel_commerce_order"])
  assert.ok(checkout.includes(rpc),rpc);
 assert.match(central,/create_preview_reservation/);
 assert.doesNotMatch(checkout,/create_preview_reservation/);
 assert.match(admin,/export \{ default \} from "\.\.\/reservas\/page"/);
});
test("customer account reads real payments and preserves legacy local records separately",()=>{
 assert.match(account,/<CommerceCustomer accountOnly\s*\/>/);
 assert.match(account,/<CustomerPreviewReservations\s*\/>/);
 assert.match(account,/<CustomerBankReports mode="history"\s*\/>/);
 assert.doesNotMatch(account,/\bisEligible\(|\bapprovePayment\(|\bdrawProgress\(/);
 assert.match(account,/Se conservan sin borrar/);
});
test("password reset remains available with a real update-password route",()=>{
 assert.match(access,/resetPasswordForEmail/);
 assert.match(password,/client\.auth\.updateUser\(\{password\}\)/);
 assert.match(password,/client\.auth\.signOut\(\)/);
});
test("unverified testimonials and manually attested winners remain blocked",()=>{
 assert.doesNotMatch(reviews,/\.from\("draw_reviews"\)\.(insert|update)/);
 assert.doesNotMatch(results,/\.from\("draw_results"\)\.insert/);
 const sql=read("supabase/migrations/20261114234000_guard_noncommercial_social_proof.sql");
 assert.match(sql,/enforce_noncommercial_draw_reviews/);
 assert.match(sql,/enforce_noncommercial_draw_results/);
});
test("commercial orders protect submitted receipts until treasury makes a decision",()=>{
 const ddl=read("supabase/migrations/20261115061000_commerce_manual_schema.sql");
 const create=read("supabase/migrations/20261115061100_commerce_checkout_rpc.sql");
 const review=read("supabase/migrations/20261115061200_commerce_review_whatsapp_rpc.sql");
 assert.match(ddl,/proof_pending/);
 assert.match(create,/now\(\)\+interval '24 hours'/);
 assert.match(create,/now\(\)\+interval '72 hours'/);
 assert.match(create,/status='reserved' and paid_cop=0 and expires_at<=now\(\)/);
 assert.match(create,/status in \('proof_pending','part_paid','paid'\)/);
 assert.match(create,/storage\.objects/);
 assert.match(review,/review_commerce_receipt/);
 assert.match(review,/insert into public\.commerce_confirmed_credits/);
 assert.match(ddl,/unique\(bank,bank_transaction_reference\)/);
});
