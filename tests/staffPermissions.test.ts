import test from "node:test";
import assert from "node:assert/strict";
import {
 canStaffRole,parseStaffRole,visibleStaffModules,staffRoleCapabilities,staffModules,type StaffRole,
} from "../src/lib/staffPermissions";

test("unassigned or spoofed roles never receive a module",()=>{
 assert.equal(parseStaffRole("admin"),null);
 assert.equal(parseStaffRole("superuser"),null);
 assert.equal(parseStaffRole(null),null);
 assert.equal(visibleStaffModules(null).length,0);
 assert.equal(canStaffRole(null,"staff.manage"),false);
});
test("only owner can manage team and see the owner dashboard",()=>{
 const roles:StaffRole[]=["owner","treasury","support","draws","auditor"];
 for(const role of roles){
  assert.equal(canStaffRole(role,"staff.manage"),role==="owner");
  assert.equal(canStaffRole(role,"admin.dashboard"),role==="owner");
  assert.equal(canStaffRole(role,"admin.menu"),true);
 }
});
test("treasury cannot modify draws or read CRM notes",()=>{
 assert.equal(canStaffRole("treasury","bank.write"),true);
 assert.equal(canStaffRole("treasury","catalog.write"),false);
 assert.equal(canStaffRole("treasury","crm.read"),false);
 assert.deepEqual(visibleStaffModules("treasury").map(m=>m.href),["/admin/control-pagos","/admin/conciliacion"]);
});
test("support has customer management and followups, not finance or raffle changes",()=>{
 assert.equal(canStaffRole("support","crm.write"),true);
 assert.equal(canStaffRole("support","followups.write"),true);
 assert.equal(canStaffRole("support","bank.write"),false);
 assert.equal(canStaffRole("support","preview.write"),false);
});
test("draw manager can edit content and preview drafts but not treasury",()=>{
 assert.equal(canStaffRole("draws","catalog.write"),true);
 assert.equal(canStaffRole("draws","reviews.write"),true);
 assert.equal(canStaffRole("draws","preview.write"),true);
 assert.equal(canStaffRole("draws","bank.write"),false);
});
test("auditor can inspect, never write, and only receives one audit screen",()=>{
 assert.equal(canStaffRole("auditor","audit.read"),true);
 for(const permission of staffRoleCapabilities.auditor){
  assert.equal(permission.endsWith(".write"),false);
 }
 assert.deepEqual(visibleStaffModules("auditor").map(m=>m.href),
   ["/admin/control-pagos","/admin/seguridad","/admin/informes","/admin/auditoria","/admin/numeros"]);
});
test("every module and permission corresponds to the server role names",()=>{
 const paths=staffModules.map(item=>item.href);
 assert.equal(new Set(paths).size,paths.length);
 for(const module of staffModules){
  assert.ok(staffRoleCapabilities.owner.includes(module.permission));
  assert.equal(module.href.startsWith("/admin"),true);
 }
});

test("production readiness is visible to owner and auditor only",()=>{
  for(const role of ["owner","auditor"] as const)
    assert.ok(visibleStaffModules(role).some(item=>item.href==="/admin/seguridad"));
  for(const role of ["treasury","support","draws"] as const)
    assert.ok(!visibleStaffModules(role).some(item=>item.href==="/admin/seguridad"));
});

test("payment workflows are owner-only and bank ledger is visible to treasury and auditor",()=>{
 for(const role of ["owner","treasury","auditor"] as const)
  assert.ok(visibleStaffModules(role).some(item=>item.href==="/admin/control-pagos"));
 for(const role of ["support","draws"] as const)
  assert.ok(!visibleStaffModules(role).some(item=>item.href==="/admin/control-pagos"));
 for(const role of ["treasury","support","draws","auditor"] as const)
  assert.ok(!visibleStaffModules(role).some(item=>item.href==="/admin/automatizaciones"));
 assert.ok(visibleStaffModules("owner").some(item=>item.href==="/admin/automatizaciones"));
});
