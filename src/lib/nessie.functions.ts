import { createServerFn } from "@tanstack/react-start";
import type { RawTransaction } from "@/lib/finance/normalize";

/**
 * Integración OPCIONAL con Capital One Nessie.
 *
 * La llave se lee en el servidor desde la variable de entorno NESSIE_API_KEY y
 * nunca se envía al navegador ni se muestra en la interfaz. Si la variable no
 * está configurada, esta función responde `not-configured` y la aplicación
 * sigue funcionando por completo con los datos introducidos a mano.
 *
 * Esta capa solo trae movimientos y los entrega como RAW: no interpreta, no
 * clasifica y no inventa datos. La interpretación ocurre en la capa de
 * normalización (`src/lib/finance/normalize.ts`).
 */

export type NessieStatus = "ok" | "not-configured" | "error";

export interface NessieRawResult {
  status: NessieStatus;
  /** Mensaje para la persona. Nunca contiene credenciales. */
  message: string;
  accounts: { id: string; nickname: string; type: string; balance: number }[];
  transactions: RawTransaction[];
}

const BASE_URL = "http://api.nessieisreal.com";

function pickDate(record: Record<string, unknown>): string {
  const candidates = [
    "transaction_date",
    "purchase_date",
    "payment_date",
    "upcoming_payment_date",
    "creation_date",
    "date",
  ];
  for (const key of candidates) {
    const value = record[key];
    if (typeof value === "string" && value.length >= 8) return value.slice(0, 10);
  }
  return "";
}

function pickAmount(record: Record<string, unknown>): number {
  const candidates = ["amount", "payment_amount"];
  for (const key of candidates) {
    const value = record[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  }
  return 0;
}

function pickDescription(record: Record<string, unknown>): string {
  const candidates = ["description", "payee", "merchant_id", "nickname", "type"];
  for (const key of candidates) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return "";
}

export const fetchNessieRawTransactions = createServerFn({ method: "GET" }).handler(
  async (): Promise<NessieRawResult> => {
    const key = process.env["NESSIE_API_KEY"];

    if (!key) {
      return {
        status: "not-configured",
        message:
          "La conexión con Capital One no está configurada en este entorno. OK cash funciona igual con los datos que tú registras.",
        accounts: [],
        transactions: [],
      };
    }

    const get = async (path: string): Promise<unknown> => {
      const url = `${BASE_URL}${path}${path.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}`;
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`La fuente de datos respondió ${response.status}`);
      return response.json();
    };

    try {
      const rawAccounts = (await get("/accounts")) as Record<string, unknown>[];
      const accounts = (Array.isArray(rawAccounts) ? rawAccounts : []).map((a) => ({
        id: String(a["_id"] ?? ""),
        nickname: typeof a["nickname"] === "string" ? a["nickname"] : "Cuenta",
        type: typeof a["type"] === "string" ? a["type"] : "",
        balance: typeof a["balance"] === "number" ? a["balance"] : 0,
      }));

      const transactions: RawTransaction[] = [];

      // Solo las primeras cuentas, para no traer más datos de los necesarios.
      for (const account of accounts.slice(0, 3)) {
        if (!account.id) continue;
        const groups: { path: string; sourceType: string; sign: 1 | -1 }[] = [
          { path: `/accounts/${account.id}/deposits`, sourceType: "deposit", sign: 1 },
          { path: `/accounts/${account.id}/withdrawals`, sourceType: "withdrawal", sign: -1 },
          { path: `/accounts/${account.id}/purchases`, sourceType: "purchase", sign: -1 },
          { path: `/accounts/${account.id}/bills`, sourceType: "bill", sign: -1 },
        ];

        for (const group of groups) {
          let items: Record<string, unknown>[] = [];
          try {
            const data = await get(group.path);
            items = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
          } catch {
            // Un grupo sin datos o no disponible no debe romper la lectura.
            continue;
          }
          for (const item of items) {
            const amount = pickAmount(item);
            if (amount === 0) continue;
            transactions.push({
              id: String(item["_id"] ?? `${group.sourceType}_${transactions.length}`),
              date: pickDate(item),
              description: pickDescription(item) || group.sourceType,
              amount: Math.abs(amount) * group.sign,
              sourceType: group.sourceType,
              accountId: account.id,
            });
          }
        }
      }

      transactions.sort((a, b) => a.date.localeCompare(b.date));

      return {
        status: "ok",
        message:
          transactions.length > 0
            ? `Se recibieron ${transactions.length} movimientos de la fuente de datos.`
            : "La conexión funcionó, pero no llegaron movimientos.",
        accounts,
        transactions,
      };
    } catch (error) {
      return {
        status: "error",
        message:
          error instanceof Error
            ? `No se pudieron leer los movimientos: ${error.message}`
            : "No se pudieron leer los movimientos.",
        accounts: [],
        transactions: [],
      };
    }
  },
);
