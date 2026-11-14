import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const home=readFileSync("src/components/FunnelLanding.tsx","utf8");
const benefits=readFileSync("src/components/HomeMarketingSections.tsx","utf8");
const cards=readFileSync("src/components/DrawCarousel.tsx","utf8");
const reviews=readFileSync("src/components/SocialProofSections.tsx","utf8");
const css=readFileSync("src/app/home-premium.css","utf8");

test("home shows benefit strip and one four-step guide, not a duplicate process section",()=>{
 assert.match(home,/<HomeBenefits \/>/);
 assert.match(home,/<HomeParticipation \/>/);
 assert.doesNotMatch(home,/className="f-steps"/);
 for(const label of ["Seguro y confiable","Fácil de participar","Opciones de pago","Seguimiento en tiempo real"])
  assert.ok(benefits.includes(label),label);
 for(const label of ["Regístrate","Elige tus números","Realiza tu pago","¡Listo!"])
  assert.ok(benefits.includes(label),label);
 assert.match(css,/\.o-home-benefits-grid/);
 assert.match(css,/@media\(max-width:680px\)/);
});
test("featured prize and cards never invent sales, progress, deadlines, or a winner",()=>{
 assert.match(home,/Inscripciones sin abrir/);
 assert.match(home,/Fecha por anunciar/);
 assert.match(home,/Premio ilustrativo/);
 assert.match(cards,/Participaciones oficiales aún no habilitadas/);
 assert.match(cards,/No hay porcentaje de ventas oficiales publicado/);
 assert.match(cards,/IDEA DE PREMIO/);
 assert.doesNotMatch(cards,/Avance: 68/);
});
test("ten fictional reviews with varied ratings remain explicitly labeled and separate from real reviews",()=>{
 const items=reviews.match(/id:"ejemplo-\d+"/g)||[];
 assert.equal(items.length,10);
 assert.match(reviews,/COMENTARIO FICTICIO/);
 assert.match(reviews,/Perfil ficticio/);
 assert.match(reviews,/no proceden de clientes/);
 assert.match(reviews,/rating:4/);
 assert.match(reviews,/rating:5/);
 assert.match(reviews,/No fue posible consultar las opiniones reales/);
 assert.doesNotMatch(reviews,/Compra verificada/);
});
