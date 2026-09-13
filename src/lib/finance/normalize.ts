import { daysUntil } from "./format";
import { makeId, type UserIncomeInput, type UserPaymentInput } from "./user-data";

/**
 * Capa de normalización: RAW → modelo financiero de OK cash.
 *
 * Los movimientos externos (por ejemplo los de Capital One Nessie) llegan con
 * la forma del proveedor. Aquí se interpretan y se convierten en ingresos y
 * pagos que el motor temporal ya sabe leer. Nunca se inventan movimientos,
 * fechas ni categorías: si un movimiento no puede clasificarse con seguridad,
 * queda como "sin clasificar" y no entra al modelo.
 */

/** Movimiento tal como lo entregó la fuente externa, sin interpretar. */
export interface RawTransaction {
  id: string;
  date: string; // ISO (YYYY-MM-DD cuando la fuente lo entrega así)
  description: string;
  /** Positivo = entrada de dinero, negativo = salida. */
  amount: number;
  /** Tipo declarado por la fuente (deposit, withdrawal, purchase, bill...). */
  sourceType: string;
  accountId: string | null;
}

export type NormalizedKind = "income" | "payment" | "expense" | "unknown";

export interface NormalizedTransaction {
  raw: RawTransaction;
  kind: NormalizedKind;
  /** Motivo de la clasificación, para que sea auditable en pantalla. */
  reason: string;
}

/**
 * Clasifica un movimiento a partir de su signo y de su fecha.
 * Entrada de dinero → ingreso. Salida futura → pago comprometido.
 * Salida pasada → gasto ya ocurrido (no vuelve a restarse del saldo).
 */
export function classifyRawTransaction(raw: RawTransaction, asOf: string): NormalizedTransaction {
  if (!raw.date || Number.isNaN(new Date(raw.date).getTime()) || raw.amount === 0) {
    return { raw, kind: "unknown", reason: "Falta fecha o importe utilizable" };
  }

  const days = daysUntil(raw.date, asOf);

  if (raw.amount > 0) {
    return {
      raw,
      kind: "income",
      reason: days >= 0 ? "Entrada de dinero con fecha futura" : "Entrada de dinero ya recibida",
    };
  }

  if (days >= 0) {
    return { raw, kind: "payment", reason: "Salida de dinero con fecha por venir" };
  }

  return { raw, kind: "expense", reason: "Salida de dinero ya ocurrida" };
}

export function normalizeTransactions(raw: RawTransaction[], asOf: string): NormalizedTransaction[] {
  return raw.map((t) => classifyRawTransaction(t, asOf));
}

/**
 * "Calcular ingresos": interpreta los movimientos y suma únicamente las
 * entradas de dinero detectadas. No estima ni proyecta ingresos futuros.
 */
export function calculateIncome(
  normalized: NormalizedTransaction[],
  options: { onlyUpcoming?: boolean; asOf?: string } = {},
): number {
  const asOf = options.asOf ?? new Date().toISOString();
  return normalized
    .filter((n) => n.kind === "income")
    .filter((n) => (options.onlyUpcoming ? daysUntil(n.raw.date, asOf) >= 0 : true))
    .reduce((sum, n) => sum + n.raw.amount, 0);
}

export interface NormalizedForModel {
  incomes: UserIncomeInput[];
  payments: UserPaymentInput[];
  /** Movimientos ya ocurridos: se conservan como contexto, no como compromisos. */
  pastMovements: NormalizedTransaction[];
  unclassified: NormalizedTransaction[];
}

/**
 * Convierte movimientos ya clasificados en ingresos y pagos futuros del modelo.
 * Solo los movimientos con fecha por venir entran al motor temporal: un
 * movimiento pasado ya está reflejado en el saldo.
 */
export function toModelInputs(
  normalized: NormalizedTransaction[],
  asOf = new Date().toISOString(),
): NormalizedForModel {
  const incomes: UserIncomeInput[] = [];
  const payments: UserPaymentInput[] = [];
  const pastMovements: NormalizedTransaction[] = [];
  const unclassified: NormalizedTransaction[] = [];

  for (const item of normalized) {
    if (item.kind === "unknown") {
      unclassified.push(item);
      continue;
    }
    const days = daysUntil(item.raw.date, asOf);
    if (days < 0) {
      pastMovements.push(item);
      continue;
    }
    if (item.kind === "income") {
      incomes.push({
        id: makeId("inc"),
        name: item.raw.description || "Ingreso",
        amount: Math.round(item.raw.amount),
        date: item.raw.date.slice(0, 10),
      });
    } else {
      payments.push({
        id: makeId("pay"),
        name: item.raw.description || "Pago",
        amount: Math.round(Math.abs(item.raw.amount)),
        dueDate: item.raw.date.slice(0, 10),
        // La fuente externa no declara prioridad: se marca como necesario y la
        // persona puede ajustarlo en "Mis datos".
        priority: "important",
        category: item.raw.sourceType || "Movimiento",
      });
    }
  }

  return { incomes, payments, pastMovements, unclassified };
}
