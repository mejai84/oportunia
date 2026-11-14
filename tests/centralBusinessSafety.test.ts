import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(p:string)=>readFileSync(p,"utf8");
const numbers=read("src/app/numeros/page.tsx");
const central=read("src/app/ensayo-reservas/page.tsx");
const admin=read("src/app/admin/numeros/page.tsx");
const account=read("src/app/mi-cuenta/page.tsx");
const review=read("src/components/MyReviews.tsx");
const moderation=read("src/app/admin/opiniones/page.tsx");
const access=read("src/app/acceso/page.tsx");
const password=read("src/app/actualizar-contrasena/page.tsx");
const guard=read("supabase/migrations/20261114234000_guard_noncommercial_social_proof.sql");

test("public and admin number pages reuse the central PostgreSQL reservation implementation",()=>{
 assert.match(numbers,/export \{ default \} from "\.\.\/ensayo-reservas\/page"/);
 assert.match(admin,/export \{ default \} from "\.\.\/reservas\/page"/);
 assert.match(central,/client\.rpc\("create_preview_reservation"/);
 assert.match(central,/client\.rpc\("get_preview_occupied_numbers"/);
 assert.match(central,/client\.rpc\("cancel_preview_reservation"/);
 assert.doesNotMatch(central,/href="\/numeros" className="btn btn-secondary">Ver otras opciones/);
});
test("customer account never converts local demo money into a real balance or eligibility",()=>{
 assert.match(account,/<CustomerPreviewReservations\s*\/>/);
 assert.match(account,/<CustomerPaymentControl\s*\/>/);
 assert.match(account,/<CustomerBankReports mode="history"\s*\/>/);
 assert.doesNotMatch(account,/\bisEligible\(|\bdrawProgress\(|\bapprovePayment\(|\bsalesProgressStatus\(/);
 assert.match(account,/se conservan sin borrar/);
});
test("password reset emails return to working update-password form",()=>{
 assert.match(access,/resetPasswordForEmail\(email,\{redirectTo:window\.location\.origin\+"\/actualizar-contrasena"\}\)/);
 assert.match(password,/client\.auth\.updateUser\(\{password\}\)/);
 assert.match(password,/client\.auth\.signOut\(\)/);
 assert.match(password,/password\.length<12/);
});
test("there are no public unverified testimonials or manually verified winners",()=>{
 assert.doesNotMatch(review,/draw_reviews"\)\.insert|draw_reviews"\)\.update/);
 assert.doesNotMatch(moderation,/verified_at:new Date\(|\.from\("draw_results"\)\.insert/);
 assert.match(guard,/CREATE TRIGGER enforce_noncommercial_draw_reviews/);
 assert.match(guard,/CREATE TRIGGER enforce_noncommercial_draw_results/);
 assert.match(guard,/NEW\.verified_at IS NOT NULL/);
 assert.match(guard,/DROP POLICY IF EXISTS "authenticated submits own reviews"/);
});
