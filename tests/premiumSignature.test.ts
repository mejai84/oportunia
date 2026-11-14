import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const layout=readFileSync("src/app/layout.tsx","utf8");
const signature=readFileSync("src/app/oportunia-signature.css","utf8");
const carousel=readFileSync("src/components/DrawCarousel.tsx","utf8");
const reviews=readFileSync("src/components/SocialProofSections.tsx","utf8");

test("signature styles load after all legacy CSS",()=>{
 const finalImport='import "./oportunia-signature.css";';
 assert.ok(layout.includes(finalImport));
 assert.equal(layout.trim().match(/import "\.\/[^"]+\.css";/g)?.at(-1),finalImport);
});
test("Oportunia branding is tokenized and screen-size aware",()=>{
 for(const token of ["--op-forest","--op-emerald","--op-gold","--op-ivory","--op-ink","--op-stroke"]){
  assert.ok(signature.includes(token),`missing ${token}`);
 }
 for(const breakpoint of ["max-width:1100px","max-width:900px","max-width:680px","max-width:390px"]){
  assert.ok(signature.includes(breakpoint),`missing ${breakpoint}`);
 }
 assert.match(signature,/prefers-reduced-motion:reduce/);
 assert.match(signature,/focus-visible/);
 assert.match(signature,/\.funnel \.draw-mini-art/);
 assert.match(signature,/\.admin-module-link/);
});
test("public-facing marketing avoids emoji filler and demo testimonials",()=>{
 assert.doesNotMatch(reviews,/<h2>⭐/);
 assert.doesNotMatch(reviews,/Ejemplo ficticio|Perfil de ejemplo|SAMPLE_REVIEWS/);
 assert.match(reviews,/status","published"/);
 assert.doesNotMatch(carousel,/OPCIÓN DE PREMIO|IDEA DE PREMIO|PRÓXIMAMENTE/);
});
