/** Registro de interés del embudo. No crea compras, reservas ni oportunidades. */
export type LeadRecord = {
  full_name: string;
  phone: string;
  email: string | null;
  contact_consent: true;
  marketing_consent: boolean;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  landing_path: "/" | "/embudo";
};
export type LeadResult = { ok: true; lead: LeadRecord } | { ok: false; error: string };

function optionalString(value: unknown, limit = 120): string | null {
  return typeof value === "string" ? value.trim().slice(0, limit) || null : null;
}

export function campaignFromSearch(search: string) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return {
    utmSource: optionalString(params.get("utm_source")),
    utmMedium: optionalString(params.get("utm_medium")),
    utmCampaign: optionalString(params.get("utm_campaign")),
    utmContent: optionalString(params.get("utm_content")),
    utmTerm: optionalString(params.get("utm_term")),
  };
}

export function parseLead(input: unknown): LeadResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Solicitud inválida." };
  }
  const data = input as Record<string, unknown>;
  const fullName = typeof data.fullName === "string" ? data.fullName.trim().replace(/\s+/g, " ") : "";
  const phone = typeof data.phone === "string" ? data.phone.replace(/[\s()\-]/g, "") : "";
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";

  if (fullName.length < 3 || fullName.length > 100) {
    return { ok: false, error: "Ingresa un nombre válido (3 a 100 caracteres)." };
  }
  if (!/^\+?[0-9]{7,15}$/.test(phone)) {
    return { ok: false, error: "Ingresa un celular válido." };
  }
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { ok: false, error: "Ingresa un correo electrónico válido." };
  }
  if (data.contactConsent !== true) {
    return { ok: false, error: "Debes autorizar el contacto para enviar la solicitud." };
  }
  const landingPath = data.landingPath === "/" ? "/" : "/embudo";
  return {
    ok: true,
    lead: {
      full_name: fullName,
      phone,
      email: email || null,
      contact_consent: true,
      marketing_consent: data.marketingConsent === true,
      utm_source: optionalString(data.utmSource),
      utm_medium: optionalString(data.utmMedium),
      utm_campaign: optionalString(data.utmCampaign),
      utm_content: optionalString(data.utmContent),
      utm_term: optionalString(data.utmTerm),
      landing_path: landingPath,
    },
  };
}
