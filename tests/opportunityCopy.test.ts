import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const files={
 landing:readFileSync("src/components/FunnelLanding.tsx","utf8"),
 header:readFileSync("src/components/SiteHeader.tsx","utf8"),
 metadata:readFileSync("src/app/layout.tsx","utf8"),
 cards:readFileSync("src/components/DrawCarousel.tsx","utf8"),
 results:readFileSync("src/components/SocialProofSections.tsx","utf8"),
 rules:readFileSync("src/app/reglas/page.tsx","utf8"),
};
test("public marketing uses opportunities and editions instead of sorts",()=>{
 assert.match(files.header,/Oportunidades/);
 assert.match(files.landing,/home\.heroEyebrow/);
 assert.match(files.landing,/home\.primaryButton/);
 assert.match(files.metadata,/Oportunidades de ganar premios/);
 assert.match(files.results,/Resultados y ganadores/);
 assert.match(files.cards,/Oportunidades y premios/);
 for(const [name,content] of Object.entries(files)){
  if(name==="rules")continue;
  assert.doesNotMatch(content,/>Sorteos</);
  assert.doesNotMatch(content,/Ver próximos sorteos|Explorar sorteos|SORTEO DESTACADO|Sorteos realizados y ganadores/);
 }
});
test("marketing remains truthful; actual chance mechanism and authorization remain disclosed",()=>{
 assert.match(files.rules,/reglamento específico/);
 assert.match(files.rules,/sorteo/);
 assert.match(files.rules,/reglamento autorizado|reglas aprobadas/);
 assert.match(files.rules,/comprobante/);
 assert.match(files.metadata,/autorizaciones aplicables/);
 assert.match(files.landing,/resultado oficial de lotería/);
 assert.doesNotMatch(files.landing,/Fecha por anunciar|PRÓXIMAMENTE/);
});
test("in-page targets for existing shared links remain backward compatible",()=>{
 assert.match(files.header,/href="#sorteos"/);
 assert.match(files.cards,/id="sorteos"/);
});
