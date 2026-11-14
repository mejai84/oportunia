import test from "node:test";
import assert from "node:assert/strict";
import {paymentControlStats,paymentEvidenceLabels,type PaymentControlCase} from "../src/lib/paymentControl";

function sample(evidence_status:PaymentControlCase["evidence_status"]):PaymentControlCase{
 return {id:"1",claim_link_id:null,claim_id:"3",reservation_id:null,customer_user_id:"5",
  declared_amount_cop:50000,bank_account_alias:"NEQUI_PRINCIPAL",
  evidence_status,authenticity:"not_verified",bank_provider_event_id:null,
  commercial_eligible:false,created_at:"2026-11-13",updated_at:"2026-11-13"};
}
test("payments remain unverified regardless of imported-file status",()=>{
 for(const status of ["reported","file_matched","rejected"] as const){
  const c=sample(status);
  assert.equal(c.authenticity,"not_verified");
  assert.equal(c.commercial_eligible,false);
  assert.equal(paymentControlStats([c]).authenticated,0);
  assert.equal(paymentControlStats([c]).commercialEntries,0);
 }
 assert.match(paymentEvidenceLabels.file_matched,/no verificada/);
});
test("payment summary classifies reported, matched and rejected separately",()=>{
 assert.deepEqual(paymentControlStats([sample("reported"),sample("file_matched"),sample("rejected")]),{
  total:3,reported:1,fileMatched:1,rejected:1,authenticated:0,commercialEntries:0,
 });
});
