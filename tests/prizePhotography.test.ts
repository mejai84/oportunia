import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {prizePhotography,selectPrizeImage} from "../src/lib/prizePhotography";

test("six specific free-license photographic sources replace SVG placeholders",()=>{
 assert.equal(Object.keys(prizePhotography).length,6);
 for(const [id,photo] of Object.entries(prizePhotography)){
  assert.match(photo.src,/^https:\/\/images\.unsplash\.com\/photo-/);
  assert.match(photo.source,/^https:\/\/unsplash\.com\/photos\//);
  assert.ok(photo.photographer);
  const selected=selectPrizeImage(id,"/raffles/example.svg","/raffles/example.svg");
  assert.equal(selected.src,photo.src);
  assert.equal(selected.isStockPhoto,true);
 }
});
test("owner-supplied real prize images take precedence over stock",()=>{
 const x=selectPrizeImage("principal","https://example.org/organizer-actual-prize.webp","/raffles/iphone18-hero.svg");
 assert.equal(x.src,"https://example.org/organizer-actual-prize.webp");
 assert.equal(x.isStockPhoto,false);
});
test("the iPhone stock photo is not claimed to be an authentic iPhone 18",()=>{
 assert.match(prizePhotography.principal.description,/no corresponde necesariamente al modelo iPhone 18/);
 const hero=readFileSync("src/components/FunnelLanding.tsx","utf8");
 const cards=readFileSync("src/components/DrawCarousel.tsx","utf8");
 assert.match(hero,/Fotografía de referencia/);
 assert.match(cards,/Fotografía de referencia/);
 assert.match(hero,/onError=/);
 assert.match(cards,/onError=/);
});
test("sample comments are not falsely presented as paying customers",()=>{
 const c=readFileSync("src/components/SocialProofSections.tsx","utf8");
 const samples=c.match(/id:"ejemplo-\d+"/g) || [];
 assert.equal(samples.length,10);
 assert.match(c,/Ejemplo ficticio/);
 assert.match(c,/no son reseñas enviadas por clientes/);
 assert.match(c,/sin compra verificada/);
 assert.match(c,/\.eq\("status","published"\)/);
});
