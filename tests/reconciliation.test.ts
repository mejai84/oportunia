import test from "node:test";
import assert from "node:assert/strict";
import {parseBankCsv,suggestedClaimForMovement,type ReconClaim,type ReconMovement} from "../src/lib/reconciliation";

const header = "banco;cuenta;fecha;tipo;valor;referencia;descripcion";
const base = "BANCOLOMBIA;AHORROS_PRINCIPAL;2026-11-13;ABONO;50000;ABC12345;\"Transferencia; Bre-B\"";

test("parses semicolon CSV with quoted description and normalizes references", () => {
  const rows = parseBankCsv("\uFEFF" + header + "\r\n" + base + "\r\n");
  assert.equal(rows.length,1);
  assert.equal(rows[0].bank,"BANCOLOMBIA");
  assert.equal(rows[0].amount_cop,50000);
  assert.equal(rows[0].description,"Transferencia; Bre-B");
});

test("accepts standard CSV credit with slash date and Nequi", () => {
  const rows = parseBankCsv(header + "\nNEQUI;NEQUI_PRINCIPAL;13/11/2026;CRÉDITO;20000;NEQ1234;PAGO");
  assert.equal(rows[0].movement_date, "2026-11-13");
});

test("rejects debit, negative, ambiguous amount and missing unique transaction reference", () => {
  const invalid = [
    base.replace(";ABONO;", ";DEBITO;"),
    base.replace(";50000;", ";-50000;"),
    base.replace(";50000;", ";50.000;"),
    base.replace("ABC12345", "ABC"),
    base.replace("2026-11-13", "2026-02-30"),
  ];
  for (const row of invalid) assert.throws(()=>parseBankCsv(header+"\n"+row));
});

test("rejects duplicate reference reused with different amount and malformed quotes", () => {
  assert.throws(() => parseBankCsv(header+"\n"+base+"\n"+base.replace(";50000;",";60000;")),/duplicada/);
  assert.throws(() => parseBankCsv(header+"\n"+base.replace('"; Bre-B"','; Bre-B"')+"\n"),/Comillas/);
});

test("only proposes one pending exact account, reference and amount match", () => {
  const movement: ReconMovement = {
    id:"1",bank:"NEQUI",account_alias:"CUENTA_PRINCIPAL",transaction_reference:"NEQ1234",
    movement_date:"2026-11-13",amount_cop:50000,description:"",
    source_label:"extracto",imported_at:"2026-11-13",status:"unmatched",matched_claim_id:null,
  };
  const claim: ReconClaim = {
    id:"2",bank:"NEQUI",account_alias:"CUENTA_PRINCIPAL",claimed_reference:"NEQ1234",
    customer_label:"Ejemplo",expected_amount_cop:50000,status:"pending",created_at:"2026-11-13",
  };
  assert.equal(suggestedClaimForMovement(movement,[claim])?.id,"2");
  assert.equal(suggestedClaimForMovement({...movement,amount_cop:20000},[claim]),null);
  assert.equal(suggestedClaimForMovement({...movement,transaction_reference:"NEQ9999"},[claim]),null);
  assert.equal(suggestedClaimForMovement({...movement,account_alias:"OTRA_CUENTA"},[claim]),null);
  assert.equal(suggestedClaimForMovement({...movement,status:"matched"},[claim]),null);
  assert.equal(suggestedClaimForMovement(movement,[claim,{...claim,id:"3"}]),null);
});
