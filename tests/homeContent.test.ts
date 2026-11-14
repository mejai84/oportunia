import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {defaultHomeContent,normalizeHomeContent,fallbackHomeCards} from "../src/lib/homeContent";

test("CMS defaults preserve clear copy and 3 aligned trust labels",()=>{
 assert.equal(defaultHomeContent.trustLabels.length,3);
 assert.equal(defaultHomeContent.benefits.length,4);
 assert.equal(fallbackHomeCards.length,5);
 assert.equal(normalizeHomeContent(null).heroPrefix,defaultHomeContent.heroPrefix);
});
test("CMS client safely limits text lengths and fills missing benefits",()=>{
 const c=normalizeHomeContent({...defaultHomeContent,heroPrefix:"X".repeat(1000),benefits:[{title:"Changed",detail:"New detail"}]});
 assert.equal(c.heroPrefix.length,85);
 assert.equal(c.benefits.length,4);
 assert.equal(c.benefits[0].title,"Changed");
 assert.equal(c.benefits[2].title,defaultHomeContent.benefits[2].title);
});
test("carousel runs every 4500ms, loops to the first, pauses on gestures and respects reduced motion",()=>{
 const carousel=readFileSync("src/components/DrawCarousel.tsx","utf8");
 assert.match(carousel,/setInterval/);
 assert.match(carousel,/4500/);
 assert.match(carousel,/\(activeRef\.current\+1\)%cards\.length/);
 assert.match(carousel,/onPointerDown/);
 assert.match(carousel,/prefers-reduced-motion/);
 assert.match(carousel,/aria-current/);
 assert.doesNotMatch(carousel,/PRÓXIMAMENTE|Próximamente/);
});
test("both real edition and marketing ideas can be edited from dashboard, with fixed media frames",()=>{
 const admin=readFileSync("src/app/admin/contenido/page.tsx","utf8");
 const css=readFileSync("src/app/home-premium.css","utf8");
 const nav=readFileSync("src/lib/staffPermissions.ts","utf8");
 assert.match(admin,/requiredPermission="catalog.write"/);
 assert.match(admin,/home_content/);
 assert.match(admin,/home_cards/);
 assert.match(admin,/draw_catalog/);
 assert.match(admin,/storage\.from\("draw-media"\)/);
 assert.match(admin,/Guardar y publicar textos/);
 assert.match(nav,/\/admin\/contenido/);
 assert.match(css,/aspect-ratio:4\s*\/\s*5/);
 assert.match(css,/\.o-hero-trust-grid/);
});
