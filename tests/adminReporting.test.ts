import test from "node:test";
import assert from "node:assert/strict";
import {reportPeriodError,bogotaIsoDate,writeCsv,summaryCsv,eventsCsv,metricValue,
  isValidActivity,isValidReportSummary,type ReportSummary} from "../src/lib/adminReporting";
import {visibleStaffModules} from "../src/lib/staffPermissions";

const example:ReportSummary={
 period:{from:"2026-11-01",to:"2026-11-13",time_zone:"America/Bogota",status_basis:"Estado actual"},
 customers:{new_accounts:1},
 bank_claims:{total:0,pending:0,matched:0,rejected:0,amount_declared_cop:0,amount_matched_claims_cop:0},
 bank_movements:{total:0,matched:0,unmatched:0,ignored:0,amount_imported_cop:0,amount_matched_file_cop:0},
 preview:{created:0,active_now:0,expired_now:0,cancelled:0,extra_demo_blocks:0,extra_demo_numbers:0},
 followups:{created:0,pending:0,done:0,cancelled:0},
 audit:{role_changes:0,content_changes:0,bank_actions:0},
 daily:[{day:"2026-11-13",reports:0,movements:0,previews:0}],
};

test("Colombia date formatter respects timezone without browser locale assumptions",()=>{
 assert.equal(bogotaIsoDate(new Date("2026-11-14T02:00:00Z")),"2026-11-13");
});
test("report periods validate calendar dates and maximum 366-day scope",()=>{
 assert.equal(reportPeriodError("2026-01-01","2026-12-31"),null);
 assert.equal(reportPeriodError("2024-02-29","2024-02-29"),null);
 assert.match(reportPeriodError("2026-02-30","2026-03-01")||"",/válidas/);
 assert.match(reportPeriodError("2026-11-20","2026-11-13")||"",/posterior/);
 assert.match(reportPeriodError("2025-01-01","2026-11-13")||"",/366/);
});
test("CSV quotes separators/newlines, and neutralizes spreadsheet formulas",()=>{
 const csv=writeCsv(["Valor"],[
  ["=HYPERLINK(\"https://attacker.invalid\")"],
  ["+SUM(A1:A2)"],[" -99"],["@alias"],["texto;prueba"],
  ["fila\nsiguiente"],["normal"],
 ]);
 assert.match(csv,/'=HYPERLINK/);
 assert.match(csv,/'\+SUM/);
 assert.match(csv,/' -99/);
 assert.match(csv,/'@alias/);
 assert.match(csv,/"texto;prueba"/);
 assert.ok(!csv.includes("fila\nsiguiente"));
 assert.match(csv,/fila siguiente/);
});
test("summary export reports empty bank amounts and never calls them received income",()=>{
 const csv=summaryCsv(example);
 assert.match(csv,/Cuentas nuevas/);
 assert.match(csv,/NO ingresos/);
 assert.match(csv,/Supabase/);
 assert.equal(metricValue(example,"bank_movements.amount_matched_file_cop"),0);
 assert.equal(metricValue(example,"customers.new_accounts"),1);
 assert.equal(isValidReportSummary(example),true);
});
test("activity contract validates stable IDs and writes only limited fields",()=>{
 const event={id:"bank_recon_audit/1",created_at:"2026-11-13T22:00:00Z",
  category:"banco",action:"import",actor:"abcdef12",reference:"87654321",detail:"Sin verificación automática",source:"bank_recon_audit"};
 assert.equal(isValidActivity({total:1,offset:0,limit:100,items:[event]}),true);
 assert.equal(isValidActivity({total:1,offset:0,items:[{category:"bank"}]}),false);
 const csv=eventsCsv([event]);
 assert.match(csv,/Sin verificación automática/);
 assert.ok(!csv.includes("email"));
});
test("only owner and auditor have the reports menu entry",()=>{
 for(const role of ["owner","auditor"] as const)
   assert.ok(visibleStaffModules(role).some(m=>m.href==="/admin/informes"));
 for(const role of ["support","treasury","draws"] as const)
   assert.ok(!visibleStaffModules(role).some(m=>m.href==="/admin/informes"));
});
