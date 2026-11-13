import test from "node:test";
import assert from "node:assert/strict";
import { EMPTY_STATE, createOpportunity, reportPayment, approvePayment, createDraw, setDrawEnabled } from "../src/lib/domain";
import { buildLocalNumberAudit, numbersWithStatus } from "../src/lib/numberAudit";
import { crmSummary, filterCrmProfiles, type CrmProfile, type CrmClaim } from "../src/lib/crm";

const now=new Date("2026-11-13T18:00:00.000Z");
const selected=Array.from({length:10},(_,i)=>String(i).padStart(4,"0"));
const customer={name:"Cliente demo",phone:"3001234567",email:""};
function initial(){
  return createOpportunity(EMPTY_STATE,{customer,selected,plan:"contado",termsAccepted:true},"order-1",now);
}
test("inventory starts with exactly 10,000 free local numbers",()=>{
  const audit=buildLocalNumberAudit(EMPTY_STATE,"principal",now);
  assert.equal(audit.totals.libre,10_000);
  assert.equal(audit.count,0);
  assert.equal(audit.anomalies.length,0);
  assert.equal(numbersWithStatus(audit,"todos","").length,10_000);
  assert.deepEqual(numbersWithStatus(audit,"todos","0000"),["0000"]);
});
test("unpaid orders reserve 10 numbers and expire after 24 hours",()=>{
  const audit=buildLocalNumberAudit(initial(),"principal",now);
  assert.equal(audit.totals.reservado,10);
  assert.equal(audit.totals.libre,9990);
  assert.equal(audit.entries.get("0000")?.origin,"elegido");
  const expired=buildLocalNumberAudit(initial(),"principal",new Date(now.getTime()+25*3600000));
  assert.equal(expired.count,0);
});
test("partial simulated payments do not make entries eligible",()=>{
  let state=initial();
  state=reportPayment(state,{orderId:"order-1",method:"Nequi",amount:20000,reference:"demo"},"pay-1",now);
  state=approvePayment(state,"pay-1",()=>0.5,now);
  const audit=buildLocalNumberAudit(state,"principal",now);
  assert.equal(audit.totals.parcial,20);
  assert.equal(audit.totals.habilitado,0);
  assert.equal(audit.totals.libre,9980);
});
test("fully-paid local demo marks 50 assigned numbers but remains local-only",()=>{
  let state=initial();
  state=reportPayment(state,{orderId:"order-1",method:"Nequi",amount:50000,reference:"demo"},"pay-1",now);
  state=approvePayment(state,"pay-1",()=>0.5,now);
  const audit=buildLocalNumberAudit(state,"principal",now);
  assert.equal(audit.totals.habilitado,50);
  assert.equal(audit.totals.libre,9950);
  assert.equal(audit.anomalies.length,0);
});
test("draw counts stay isolated and detect manually corrupted duplicate allocations",()=>{
  let state=createDraw(EMPTY_STATE,{title:"Otro sorteo demo",prize:"Tablet",description:""},"segundo",now);
  state=setDrawEnabled(state,"segundo",true);
  state=createOpportunity(state,{customer,selected,plan:"contado",termsAccepted:true,drawId:"segundo"},"order-2",now);
  assert.equal(buildLocalNumberAudit(state,"principal",now).count,0);
  assert.equal(buildLocalNumberAudit(state,"segundo",now).count,10);
  const corrupted={...state,opportunities:[...state.opportunities,{...state.opportunities[0],id:"duplicate-order"}]};
  const audit=buildLocalNumberAudit(corrupted,"segundo",now);
  assert.equal(audit.count,10);
  assert.equal(audit.anomalies.filter(x=>x.includes("duplicado")).length,10);
});
test("CRM metrics do not pretend bank-claims are verified sales",()=>{
  const profiles:CrmProfile[]=[
    {user_id:"u1",email:"cliente1@example.com",display_name:"Cliente Uno",phone:"3001112222",marketing_consent:false,created_at:"2026-11-13",updated_at:"2026-11-13"},
    {user_id:"u2",email:"cliente2@example.com",display_name:"Cliente Dos",phone:"3003334444",marketing_consent:true,created_at:"2026-11-13",updated_at:"2026-11-13"},
  ];
  const claims:CrmClaim[]=[
    {id:"a",customer_user_id:"u1",bank:"NEQUI",origin_channel:"BRE-B",claimed_reference:"REFERENCIA1",expected_amount_cop:50000,status:"pending",created_at:"2026-11-13"},
    {id:"b",customer_user_id:"u1",bank:"NEQUI",origin_channel:"NEQUI",claimed_reference:"REFERENCIA2",expected_amount_cop:20000,status:"matched",created_at:"2026-11-13"},
  ];
  assert.deepEqual(crmSummary(profiles,claims),{registered:2,optedIn:1,withPaymentReports:1,pendingReports:1,matchedToStatement:1});
  assert.equal(filterCrmProfiles(profiles,claims,"", "reported").length,1);
  assert.equal(filterCrmProfiles(profiles,claims,"REFERENCIA2", "all")[0].user_id,"u1");
  assert.equal(filterCrmProfiles(profiles,claims,"", "consented")[0].user_id,"u2");
});
