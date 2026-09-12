import { formatMoney, formatShortDate, parseDate } from "./format";
import type { FinancialSnapshot, Scenario } from "./types";

/**
 * Explica por qué un escenario es mejor o peor.
 *
 * No calcula nada nuevo: solo lee lo que el motor temporal ya produjo
 * (saldo mínimo, su fecha y el margen respecto a la reserva) y lo cuenta en
 * lenguaje sencillo. Si falta un dato, no se inventa.
 */

/** Próximo ingreso registrado después de la fecha indicada. */
export function nextIncomeAfter(snapshot: FinancialSnapshot, isoDate: string | null) {
  const from = parseDate(isoDate ?? snapshot.asOf).setHours(0, 0, 0, 0);
  return (
    [...snapshot.incomes]
      .filter((i) => parseDate(i.date).setHours(0, 0, 0, 0) >= from)
      .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())[0] ?? null
  );
}

export interface DecisionReason {
  headline: string;
  detail: string;
  belowReserve: boolean;
}

export function buildDecisionReason(snapshot: FinancialSnapshot, scenario: Scenario): DecisionReason {
  const b = scenario.breakdown;
  const when = b.minimumBalanceDate ? ` el ${formatShortDate(b.minimumBalanceDate)}` : "";
  const income = nextIncomeAfter(snapshot, b.minimumBalanceDate);
  const incomeText = income
    ? ` Tu siguiente ingreso registrado es ${income.name} (${formatMoney(income.amount)}) el ${formatShortDate(income.date)}.`
    : " No tienes más ingresos registrados en este periodo.";

  if (b.minimumBalance < 0) {
    return {
      headline: "Te quedarías sin dinero",
      detail: `Tu saldo llegaría a ${formatMoney(b.minimumBalance)}${when}, así que no alcanzaría para cubrir todo.${incomeText}`,
      belowReserve: true,
    };
  }

  if (b.marginAtMinimum < 0) {
    return {
      headline: "Bajarías de tu reserva",
      detail: `Tu saldo bajaría a ${formatMoney(b.minimumBalance)}${when}, por debajo de tu reserva de ${formatMoney(b.reserve)}.${incomeText}`,
      belowReserve: true,
    };
  }

  return {
    headline: "Tu reserva quedaría intacta",
    detail: `Tu punto más bajo sería ${formatMoney(b.minimumBalance)}${when}, con ${formatMoney(b.marginAtMinimum)} por encima de tu reserva de ${formatMoney(b.reserve)}.${incomeText}`,
    belowReserve: false,
  };
}
