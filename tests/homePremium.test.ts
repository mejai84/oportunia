import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const home=readFileSync("src/components/FunnelLanding.tsx","utf8");
const benefits=readFileSync("src/components/HomeMarketingSections.tsx","utf8");
const cards=readFileSync("src/components/DrawCarousel.tsx","utf8");
const reviews=readFileSync("src/components/SocialProofSections.tsx","utf8");
const payments=readFileSync("src/app/pagos/page.tsx","utf8");
const customerReports=readFileSync("src/components/CustomerBankReports.tsx","utf8");
const css=readFileSync("src/app/home-premium.css","utf8");

test("premium home preserves four benefits and four navigation steps",()=>{
 assert.match(home,/<HomeBenefits \/>/);
 assert.match(home,/<HomeParticipation \/>/);
 for(const label of ["Seguro y confiable","Fácil de participar","Opciones de pago","Seguimiento en tiempo real"])
   assert.ok(benefits.includes(label),label);
 for(const label of ["Regístrate","Elige tus números","Realiza tu pago","¡Listo!"])
   assert.ok(benefits.includes(label),label);
 assert.match(css,/\.o-home-benefits-grid/);
 assert.match(css,/@media\(max-width:680px\)/);
});
test("public hero and prize cards avoid repetitive disclaimers and invented progress",()=>{
 assert.doesNotMatch(home,/Premio ilustrativo|VISTA ILUSTRATIVA|ESTADO DE TU PAGO|¡Pago completo!/i);
 assert.doesNotMatch(home,/Avance de ventas no disponible/);
 assert.match(home,/Fecha por anunciar/);
 assert.match(home,/CALCULADORA DE NÚMEROS/);
 assert.match(home,/no procesa transferencias ni acredita pagos/);
 assert.match(cards,/IDEA DE PREMIO/);
 assert.doesNotMatch(cards,/CONCEPTO VISUAL|Solo propuesta de diseño|No hay porcentaje de ventas oficiales publicado/);
 assert.doesNotMatch(cards,/Avance: 68/);
});
test("genuine reviews take priority and samples are explicitly fictional",()=>{
 assert.match(reviews,/\.from\("draw_reviews"\)/);
 assert.match(reviews,/\.eq\("status","published"\)/);
 assert.match(reviews,/Opiniones de nuestra comunidad/);
 assert.match(reviews,/Así se verían las opiniones en Oportunia/);
 assert.match(reviews,/SAMPLE_REVIEWS/);
 assert.match(reviews,/Ejemplo ficticio/);
 assert.match(reviews,/no son reseñas enviadas por clientes/);
 assert.match(reviews,/featured.length===0/);
 assert.doesNotMatch(reviews,/COMENTARIO FICTICIO|VISTA ILUSTRATIVA|persona-ficticia/);
 assert.match(reviews,/Resultados y ganadores/);
 assert.doesNotMatch(reviews,/IMAGEN ILUSTRATIVA/);
});
test("customer payment page uses central reporting, never the browser-only mock checkout",()=>{
 assert.match(payments,/<CustomerBankReports mode="full"\s*\/>/);
 assert.doesNotMatch(payments,/sendPayment|HERRAMIENTA DE DEMOSTRACIÓN|Esta pantalla registra referencias de prueba/);
 assert.match(customerReports,/Una coincidencia con un extracto no equivale a confirmación bancaria/);
 assert.match(customerReports,/requiere verificación antes de cualquier acreditación/);
});
