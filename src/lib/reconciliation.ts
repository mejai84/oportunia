/** Parses a normalized Colombian bank credit-export CSV. No private banking credentials. */
export type ReconBank = "BANCOLOMBIA" | "NEQUI";
export type ImportRow = {
  bank: ReconBank;
  account_alias: string;
  movement_date: string;
  transaction_reference: string;
  amount_cop: number;
  description: string;
};
export type ReconClaim = {
  id: string; bank: ReconBank; account_alias: string;
  customer_label: string; claimed_reference: string;
  customer_user_id?: string | null;
  origin_channel?: string;
  customer_order_reference?: string | null;
  expected_amount_cop: number; status: "pending" | "matched" | "rejected";
  created_at: string;
};
export type ReconMovement = ImportRow & {
  id: string; status: "unmatched" | "matched" | "ignored";
  source_label: string; imported_at: string;
  matched_claim_id: string | null;
};
export type ReconAudit = {
  id: number; actor_id: string; action: string;
  claim_id: string | null; movement_id: string | null;
  detail: Record<string, unknown>; created_at: string;
};

export function normalizeReference(value: string): string {
  return value.trim().toUpperCase();
}
export function normalizeAlias(value: string): string {
  return value.trim().toUpperCase();
}
export function parseBankCsv(text: string): ImportRow[] {
  if (text.length > 350_000) throw new Error("Archivo demasiado grande (máximo 350 KB).");
  const csv = text.replace(/^\uFEFF/, "").trim();
  if (!csv) throw new Error("El CSV está vacío.");
  const first = csv.split(/\r?\n/, 1)[0];
  const sep = first.includes(";") ? ";" : ",";
  const lines: string[][] = [];
  let field = ""; let row: string[] = []; let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') {
      if (quoted && csv[i + 1] === '"') { field += '"'; i++; }
      else if (quoted) quoted = false;
      else if (field.length === 0) quoted = true;
      else throw new Error("Comillas mal ubicadas en el CSV.");
    } else if (ch === sep && !quoted) {
      row.push(field.trim()); field = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && csv[i + 1] === "\n") i++;
      row.push(field.trim()); field = "";
      if (row.some(cell => cell !== "")) lines.push(row);
      row = [];
    } else field += ch;
  }
  if (quoted) throw new Error("Hay comillas sin cerrar en el archivo.");
  row.push(field.trim());
  if (row.some(cell => cell !== "")) lines.push(row);
  if (lines.length < 2 || lines.length > 301) throw new Error("El archivo debe tener de 1 a 300 movimientos.");
  const expected = ["banco", "cuenta", "fecha", "tipo", "valor", "referencia", "descripcion"];
  const header = lines[0].map(value => value.trim().toLowerCase());
  if (header.length !== expected.length || header.some((item, i) => item !== expected[i])) {
    throw new Error("Encabezados esperados: banco;cuenta;fecha;tipo;valor;referencia;descripcion.");
  }
  const seen = new Map<string, ImportRow>();
  return lines.slice(1).map((cells, i) => {
    const line = i + 2;
    if (cells.length !== 7) throw new Error("Fila " + line + ": deben existir 7 columnas.");
    const [bankRaw, accountRaw, dateRaw, typeRaw, amountRaw, refRaw, description] = cells;
    const bank = normalizeAlias(bankRaw);
    const account_alias = normalizeAlias(accountRaw);
    const transaction_reference = normalizeReference(refRaw);
    if (bank !== "BANCOLOMBIA" && bank !== "NEQUI") throw new Error("Fila " + line + ": banco no reconocido.");
    if (!/^[A-Z0-9_-]{3,40}$/.test(account_alias)) throw new Error("Fila " + line + ": alias de cuenta inválido.");
    if (!/^[A-Z0-9][A-Z0-9._/-]{3,99}$/.test(transaction_reference)) throw new Error("Fila " + line + ": referencia bancaria única requerida (4 a 100 caracteres).");
    if (!["CREDITO", "CRÉDITO", "ABONO", "INGRESO"].includes(normalizeAlias(typeRaw))) {
      throw new Error("Fila " + line + ": solo se admiten ABONOS; no importes débitos ni salidas.");
    }
    const movement_date = /^\d{2}\/\d{2}\/\d{4}$/.test(dateRaw)
      ? dateRaw.slice(6,10) + "-" + dateRaw.slice(3,5) + "-" + dateRaw.slice(0,2) : dateRaw;
    const day = new Date(movement_date + "T12:00:00Z");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(movement_date) || Number.isNaN(day.getTime()) ||
      day.toISOString().slice(0,10) !== movement_date) {
      throw new Error("Fila " + line + ": fecha inválida. Usa AAAA-MM-DD o DD/MM/AAAA.");
    }
    if (!/^[1-9][0-9]{3,8}$/.test(amountRaw)) {
      throw new Error("Fila " + line + ": valor debe ser un entero COP sin separadores (mínimo 1.000).");
    }
    const amount_cop = Number(amountRaw);
    if (amount_cop > 100_000_000) throw new Error("Fila " + line + ": importe fuera de rango.");
    if (description.length > 300) throw new Error("Fila " + line + ": descripción demasiado larga.");
    const entry: ImportRow = {bank,account_alias,movement_date,transaction_reference,amount_cop,description};
    const key = bank + "|" + account_alias + "|" + transaction_reference;
    const previous = seen.get(key);
    if (previous && (previous.amount_cop !== amount_cop || previous.movement_date !== movement_date)) {
      throw new Error("Fila " + line + ": referencia duplicada con importe o fecha diferente.");
    }
    seen.set(key, entry);
    return entry;
  });
}

/** Only exact account/reference/amount matches are proposed; no fuzzy matching. */
export function suggestedClaimForMovement(movement: ReconMovement, claims: ReconClaim[]): ReconClaim | null {
  if (movement.status !== "unmatched") return null;
  const matches = claims.filter(claim => claim.status === "pending"
    && claim.bank === movement.bank
    && claim.account_alias === movement.account_alias
    && claim.claimed_reference === movement.transaction_reference
    && claim.expected_amount_cop === movement.amount_cop);
  return matches.length === 1 ? matches[0] : null;
}
