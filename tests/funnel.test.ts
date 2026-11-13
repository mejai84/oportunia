import assert from "node:assert/strict";
import test from "node:test";
import { campaignFromSearch, parseLead } from "../src/lib/funnel";

const valid = {
  fullName: "María   Pérez",
  phone: "300 123-4567",
  email: "Maria@Example.com",
  contactConsent: true,
  marketingConsent: false,
  landingPath: "/embudo",
  utmSource: "facebook",
  utmCampaign: "iphone",
};

test("normaliza datos y mantiene consentimiento promocional opcional", () => {
  const result = parseLead(valid);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.lead.full_name, "María Pérez");
  assert.equal(result.lead.phone, "3001234567");
  assert.equal(result.lead.email, "maria@example.com");
  assert.equal(result.lead.marketing_consent, false);
  assert.equal(result.lead.utm_source, "facebook");
});

test("rechaza solicitudes sin autorización de contacto", () => {
  const result = parseLead({ ...valid, contactConsent: false });
  assert.equal(result.ok, false);
});

test("rechaza teléfonos y correos inválidos", () => {
  assert.equal(parseLead({ ...valid, phone: "123" }).ok, false);
  assert.equal(parseLead({ ...valid, email: "no-es-email" }).ok, false);
});

test("rechaza nombre demasiado largo y entrada inesperada", () => {
  assert.equal(parseLead({ ...valid, fullName: "A".repeat(101) }).ok, false);
  assert.equal(parseLead([]).ok, false);
});

test("lee atribución UTM y limita longitudes", () => {
  const campaign = campaignFromSearch("?utm_source=facebook&utm_medium=paid&utm_campaign=" + "a".repeat(200));
  assert.equal(campaign.utmSource, "facebook");
  assert.equal(campaign.utmMedium, "paid");
  assert.equal(campaign.utmCampaign?.length, 120);
  assert.equal(campaign.utmTerm, null);
});

test("no acepta rutas arbitrarias ni metadatos adicionales en el registro", () => {
  const result = parseLead({ ...valid, landingPath: "https://malicioso.example", role: "admin" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.lead.landing_path, "/embudo");
  assert.equal("role" in result.lead, false);
});
