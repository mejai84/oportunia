import test from "node:test";
import assert from "node:assert/strict";
import {
  displayPreviewNumber,parsePreviewNumber,validatePreviewSelection,effectivePreviewStatus,
  summarizePreviewReservations,type PreviewReservation,type PreviewNumber,
} from "../src/lib/previewReservations";

const date="2026-11-13T23:00:00.000Z";
const now=new Date(date);
const later="2026-11-14T23:00:00.000Z";
function sample(id:string,status:PreviewReservation["status"],draw_id="principal"):PreviewReservation {
  return {id,draw_id,user_id:"test-user",selection_mode:"manual",preferred_plan:"contado",
    status,created_at:date,expires_at:later,closed_at:status==="active"?null:date};
}
test("accepts 0000 and 9999 while rejecting malformed numbers",()=>{
  assert.equal(displayPreviewNumber(0),"0000");
  assert.equal(displayPreviewNumber(9999),"9999");
  assert.equal(parsePreviewNumber("0007"),7);
  assert.equal(parsePreviewNumber("9999"),9999);
  assert.equal(parsePreviewNumber("10000"),null);
  assert.equal(parsePreviewNumber("hello"),null);
  assert.equal(parsePreviewNumber("-1"),null);
  assert.throws(()=>displayPreviewNumber(-1));
});
test("exactly ten unique valid manual numbers are required",()=>{
  const numbers=Array.from({length:10},(_,i)=>i);
  assert.equal(validatePreviewSelection(numbers),null);
  assert.match(validatePreviewSelection(numbers.slice(1))||"",/diez/);
  assert.match(validatePreviewSelection([...numbers.slice(0,9),0])||"",/diferentes/);
  assert.match(validatePreviewSelection([...numbers.slice(0,9),10000])||"",/0000/);
});
test("effective status closes expired active records without rewriting history",()=>{
  assert.equal(effectivePreviewStatus(sample("1","active"),new Date("2026-11-14T22:59:00Z")),"active");
  assert.equal(effectivePreviewStatus(sample("1","active"),new Date(later)),"expired");
  assert.equal(effectivePreviewStatus(sample("2","cancelled"),new Date("2026-11-15T00:00:00Z")),"cancelled");
});
test("preview calculations are per draw and never count cancelled number locks",()=>{
  const reservations=[sample("r1","active"),sample("r2","cancelled"),
    sample("r3","active","second")];
  const numbers:PreviewNumber[]=[
    ...Array.from({length:10},(_,i)=>({draw_id:"principal",reservation_id:"r1",number:i,created_at:date})),
    ...Array.from({length:10},(_,i)=>({draw_id:"principal",reservation_id:"r2",number:i+10,created_at:date})),
    ...Array.from({length:10},(_,i)=>({draw_id:"second",reservation_id:"r3",number:i,created_at:date})),
  ];
  assert.deepEqual(summarizePreviewReservations(reservations,numbers,"principal",now),{
    active:1,expired:0,cancelled:1,selectedNumbers:10,freeNumbers:9990,opportunitiesRemaining:199,
  });
  assert.equal(summarizePreviewReservations(reservations,numbers,"second",now).active,1);
  assert.equal(summarizePreviewReservations([],[],"principal",now).freeNumbers,10000);
});
