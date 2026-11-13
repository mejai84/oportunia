export type CrmProfile = {
  user_id: string;
  email: string;
  display_name: string;
  phone: string;
  marketing_consent: boolean;
  created_at: string;
  updated_at: string;
};
export type CrmNote = {
  id: number;
  customer_user_id: string;
  author_user_id: string;
  category: "seguimiento" | "soporte" | "pagos" | "otro";
  body: string;
  created_at: string;
};
export type CrmClaim = {
  id: string;
  customer_user_id: string | null;
  bank: string;
  origin_channel: string;
  claimed_reference: string;
  expected_amount_cop: number;
  status: "pending" | "matched" | "rejected";
  created_at: string;
};
export function crmSummary(profiles: CrmProfile[], claims: CrmClaim[]) {
  const owners = new Set(profiles.map(p => p.user_id));
  const linked = claims.filter(c => c.customer_user_id && owners.has(c.customer_user_id));
  return {
    registered: profiles.length,
    optedIn: profiles.filter(p => p.marketing_consent).length,
    withPaymentReports: new Set(linked.map(c => c.customer_user_id)).size,
    pendingReports: linked.filter(c => c.status === "pending").length,
    matchedToStatement: linked.filter(c => c.status === "matched").length,
  };
}
export function filterCrmProfiles(
  profiles: CrmProfile[], claims: CrmClaim[], term: string,
  segment: "all" | "reported" | "pending" | "consented",
) {
  const q = term.trim().toLocaleLowerCase("es-CO");
  return profiles.filter(profile => {
    const related = claims.filter(c => c.customer_user_id === profile.user_id);
    const selected = segment === "all" || (
      segment === "reported" ? related.length > 0 :
      segment === "pending" ? related.some(c => c.status === "pending") :
      profile.marketing_consent
    );
    const matched = !q || [profile.email, profile.display_name, profile.phone,
      ...related.map(c => c.claimed_reference)].some(value => value.toLocaleLowerCase("es-CO").includes(q));
    return selected && matched;
  });
}
