/**
 * Acceso a Capital One Nessie (datos bancarios de sandbox).
 *
 * Este archivo solo se ejecuta en el servidor: la llave nunca llega al
 * navegador. Se lee `NESSIE_API_KEY` desde el entorno dentro de cada función,
 * nunca en el ámbito del módulo.
 *
 * Aquí no se interpreta nada: solo se traen los datos tal como los entrega
 * Nessie y se quitan los campos sensibles (números de cuenta completos).
 * La interpretación ocurre en la capa de normalización.
 */

const BASE_URL = "https://api.nessieisreal.com";

export interface NessieAccountRaw {
  id: string;
  type: string | null;
  nickname: string | null;
  balance: number | null;
  /** Solo los últimos 4 dígitos. El número completo nunca sale del servidor. */
  maskedNumber: string;
  customerId: string | null;
}

export type NessieRecordSource = "purchase" | "deposit" | "withdrawal" | "bill";

/** Registro crudo, tal como llega de Nessie (sin transformar montos ni fechas). */
export interface NessieRawRecord {
  id: string;
  source: NessieRecordSource;
  date: string | null;
  description: string;
  amount: number | null;
  status: string | null;
  medium: string | null;
  accountId: string | null;
}

export interface NessieRawPayload {
  /** false = no hay llave configurada; la aplicación sigue con datos manuales. */
  configured: boolean;
  fetchedAt: string;
  accounts: NessieAccountRaw[];
  records: NessieRawRecord[];
  error: string | null;
}

function apiKey(): string | null {
  const key = process.env["NESSIE_API_KEY"];
  return key && key.trim().length > 0 ? key.trim() : null;
}

async function get<T>(path: string, key: string): Promise<T> {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`${BASE_URL}${path}${separator}key=${encodeURIComponent(key)}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    // No registramos la llave ni el cuerpo de la respuesta.
    throw new Error(`Nessie respondió ${response.status} en ${path}`);
  }
  return (await response.json()) as T;
}

function maskNumber(value: unknown): string {
  const text = typeof value === "string" ? value : "";
  const digits = text.replace(/\D/g, "");
  return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : "";
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

type Dict = Record<string, unknown>;

function mapAccount(raw: Dict): NessieAccountRaw {
  return {
    id: String(raw["_id"] ?? ""),
    type: str(raw["type"]),
    nickname: str(raw["nickname"]),
    balance: num(raw["balance"]),
    maskedNumber: maskNumber(raw["account_number"]),
    customerId: str(raw["customer_id"]),
  };
}

function mapRecord(raw: Dict, source: NessieRecordSource, accountId: string): NessieRawRecord {
  const date =
    str(raw["purchase_date"]) ??
    str(raw["transaction_date"]) ??
    str(raw["payment_date"]) ??
    str(raw["upcoming_payment_date"]) ??
    str(raw["creation_date"]);

  const amount = num(raw["amount"]) ?? num(raw["payment_amount"]);

  return {
    id: String(raw["_id"] ?? ""),
    source,
    date,
    description: str(raw["description"]) ?? str(raw["nickname"]) ?? str(raw["payee"]) ?? "Movimiento",
    amount,
    status: str(raw["status"]),
    medium: str(raw["medium"]),
    accountId,
  };
}

async function recordsForAccount(accountId: string, key: string): Promise<NessieRawRecord[]> {
  const endpoints: { path: string; source: NessieRecordSource }[] = [
    { path: `/accounts/${accountId}/purchases`, source: "purchase" },
    { path: `/accounts/${accountId}/deposits`, source: "deposit" },
    { path: `/accounts/${accountId}/withdrawals`, source: "withdrawal" },
    { path: `/accounts/${accountId}/bills`, source: "bill" },
  ];

  const results = await Promise.all(
    endpoints.map(async ({ path, source }) => {
      try {
        const list = await get<Dict[]>(path, key);
        return Array.isArray(list) ? list.map((item) => mapRecord(item, source, accountId)) : [];
      } catch {
        // Un endpoint sin datos no debe romper el resto de la carga.
        return [];
      }
    }),
  );

  return results.flat();
}

/** Trae cuentas y movimientos crudos. Nunca lanza: informa el problema en `error`. */
export async function fetchNessieRaw(accountIdFilter?: string): Promise<NessieRawPayload> {
  const key = apiKey();
  const base: NessieRawPayload = {
    configured: key !== null,
    fetchedAt: new Date().toISOString(),
    accounts: [],
    records: [],
    error: null,
  };

  if (!key) return base;

  try {
    const rawAccounts = await get<Dict[]>("/accounts", key);
    const accounts = (Array.isArray(rawAccounts) ? rawAccounts : []).map(mapAccount).filter((a) => a.id);
    const selected = accountIdFilter ? accounts.filter((a) => a.id === accountIdFilter) : accounts.slice(0, 3);

    const records = (await Promise.all(selected.map((a) => recordsForAccount(a.id, key)))).flat();

    return { ...base, accounts, records };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo conectar con Nessie";
    return { ...base, error: message };
  }
}
