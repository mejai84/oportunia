/** Payment audit data - no bank provider is integrated, no recorded payment is authentic. */
export type PaymentEvidenceStatus = "reported"|"file_matched"|"rejected";
export type PaymentControlCase = {
 id:string;claim_link_id:string;claim_id:string;reservation_id:string;
 customer_user_id:string;declared_amount_cop:number;bank_account_alias:string;
 evidence_status:PaymentEvidenceStatus;authenticity:"not_verified";bank_provider_event_id:null;
 commercial_eligible:false;created_at:string;updated_at:string;
};
export type PaymentControlEvent = {
 id:number;case_id:string;actor_id:string|null;event_type:string;
 previous_status:PaymentEvidenceStatus|null;current_status:PaymentEvidenceStatus;created_at:string;
};
export type PaymentWorkflow = {
 workflow_key:"reference_linked"|"reference_file_matched"|"reference_rejected";
 label:string;description:string;enabled:boolean;channel:"in_app";delivery_mode:"in_app_only";
 updated_by:string|null;updated_at:string;
};
export type PaymentWorkflowRun = {
 id:number;workflow_key:PaymentWorkflow["workflow_key"];case_event_id:number;
 case_id:string;customer_user_id:string;result:"in_app_created"|"disabled";
 external_sent:false;created_at:string;
};
export type PaymentInboxNotice = {
 id:string;run_id:number;customer_user_id:string;case_id:string;
 title:string;message:string;created_at:string;read_at:string|null;
};

export const paymentEvidenceLabels:Record<PaymentEvidenceStatus,string>={
 reported:"Referencia declarada · sin comprobar",
 file_matched:"Coincide con un archivo · no verificada por el banco",
 rejected:"Referencia rechazada",
};
export function paymentControlStats(cases:readonly PaymentControlCase[]){
 return {
   total:cases.length,
   reported:cases.filter(c=>c.evidence_status==="reported").length,
   fileMatched:cases.filter(c=>c.evidence_status==="file_matched").length,
   rejected:cases.filter(c=>c.evidence_status==="rejected").length,
   authenticated:0,
   commercialEntries:0,
 };
}
export function paymentCOP(value:number){return new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(value);}
