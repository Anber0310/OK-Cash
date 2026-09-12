import { parseDate } from "./format";
import { makeId, type UserIncomeInput, type UserPaymentInput } from "./user-data";
import type { NessieAccountRaw, NessieRawRecord } from "@/lib/nessie.server";

/**
 * Capa de normalización: dato recibido → dato interpretado por OK cash.
 *
 * Nessie entrega registros con formas distintas (compras, depósitos, retiros,
 * recibos). Aquí se convierten a una forma única y de ahí al modelo financiero
 * de OK cash. Los datos crudos nunca se modifican: se copian.
 *
 * Regla: si un registro no tiene fecha o monto utilizable, se descarta en lugar
 * de inventar el dato que falta.
 */

export type MoneyDirection = "in" | "out";

export interface NormalizedTransaction {
  id: string;
  /** Fecha en formato YYYY-MM-DD, interpretada como día local. */
  date: string;
  description: string;
  /** Positivo = entra dinero, negativo = sale. */
  amount: number;
  direction: MoneyDirection;
  origin: NessieRawRecord["source"];
  accountId: string | null;
  /** Registro original del que proviene, para poder rastrear el dato. */
  rawId: string;
}

function toDayKey(value: string): string | null {
  const d = parseDate(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

const INCOMING: NessieRawRecord["source"][] = ["deposit"];

/** Paso 1: registros crudos → transacciones normalizadas. */
export function normalizeRawRecords(records: NessieRawRecord[]): NormalizedTransaction[] {
  const normalized: NormalizedTransaction[] = [];

  for (const record of records) {
    if (record.amount === null || record.amount === 0 || !record.date) continue;
    const date = toDayKey(record.date);
    if (!date) continue;

    const magnitude = Math.abs(record.amount);
    const direction: MoneyDirection = INCOMING.includes(record.source) ? "in" : "out";

    normalized.push({
      id: `nrm_${record.source}_${record.id || magnitude}`,
      date,
      description: record.description,
      amount: direction === "in" ? magnitude : -magnitude,
      direction,
      origin: record.source,
      accountId: record.accountId,
      rawId: record.id,
    });
  }

  return normalized.sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
}

/** Saldo disponible según las cuentas de Nessie (sin cuentas de crédito). */
export function availableFromAccounts(accounts: NessieAccountRaw[]): number {
  return accounts
    .filter((a) => (a.type ?? "").toLowerCase() !== "credit card")
    .reduce((sum, a) => sum + (a.balance ?? 0), 0);
}

export interface NessieImportSuggestion {
  availableMoney: number;
  incomes: UserIncomeInput[];
  payments: UserPaymentInput[];
  /** Movimientos ya ocurridos: contexto, no eventos futuros. */
  pastCount: number;
}

/**
 * Paso 2: transacciones normalizadas → modelo de OK cash.
 * Solo los movimientos con fecha futura se convierten en ingresos o pagos, ya
 * que el motor temporal coloca cada movimiento en su fecha.
 */
export function buildImportSuggestion(
  accounts: NessieAccountRaw[],
  normalized: NormalizedTransaction[],
  asOf: string = new Date().toISOString(),
): NessieImportSuggestion {
  const today = parseDate(asOf).setHours(0, 0, 0, 0);

  const incomes: UserIncomeInput[] = [];
  const payments: UserPaymentInput[] = [];
  let pastCount = 0;

  for (const tx of normalized) {
    const day = parseDate(tx.date).setHours(0, 0, 0, 0);
    if (day < today) {
      pastCount += 1;
      continue;
    }
    if (tx.direction === "in") {
      incomes.push({ id: makeId("inc"), name: tx.description, amount: Math.abs(tx.amount), date: tx.date });
    } else {
      payments.push({
        id: makeId("pay"),
        name: tx.description,
        amount: Math.abs(tx.amount),
        dueDate: tx.date,
        // Nessie no indica qué tan imprescindible es un movimiento: no lo inventamos.
        priority: "important",
        category: tx.origin === "bill" ? "Recibo" : "Movimiento",
      });
    }
  }

  return {
    availableMoney: Math.round(availableFromAccounts(accounts)),
    incomes,
    payments,
    pastCount,
  };
}
