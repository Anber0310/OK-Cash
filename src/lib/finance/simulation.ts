import {
  DEFAULT_HORIZON_DAYS,
  essentialExpensesForHorizon,
  safetyFromMargin,
  totalBalance,
  upcomingPayments,
} from "./analysis";
import { formatMoney } from "./format";
import type {
  FinancialSnapshot,
  GoalImpact,
  ProposedAction,
  Scenario,
  ScenarioBreakdown,
  ScenarioComparison,
} from "./types";

/**
 * Motor de simulación.
 *
 * Entrada: fotografía financiera + acción propuesta.
 * Salida: escenario con desglose, riesgo, impacto en metas y explicación.
 * Es una función pura: no depende de la interfaz ni del origen de los datos.
 */

export interface SimulationOptions {
  horizonDays?: number;
  /** Ingreso esperado dentro del horizonte (0 si no se conoce). */
  expectedIncome?: number;
}

function goalImpacts(
  snapshot: FinancialSnapshot,
  amountUsed: number,
  marginBefore: number,
): GoalImpact[] {
  if (amountUsed <= 0) {
    return snapshot.goals.map((g) => {
      const progress = g.targetAmount > 0 ? Math.min(1, g.savedAmount / g.targetAmount) : 0;
      return {
        goalId: g.id,
        goalName: g.name,
        progressBefore: progress,
        progressAfter: progress,
        monthsDelayed: 0,
      };
    });
  }

  // El dinero usado que excede el margen disponible se cubre reduciendo aportes.
  const shortfall = Math.max(0, amountUsed - Math.max(0, marginBefore));
  const totalContribution = snapshot.goals.reduce((s, g) => s + g.monthlyContribution, 0) || 1;

  return snapshot.goals.map((g) => {
    const share = (g.monthlyContribution / totalContribution) * shortfall;
    const progressBefore = g.targetAmount > 0 ? Math.min(1, g.savedAmount / g.targetAmount) : 0;
    const savedAfter = Math.max(0, g.savedAmount - share);
    const progressAfter = g.targetAmount > 0 ? Math.min(1, savedAfter / g.targetAmount) : 0;
    const monthsDelayed = g.monthlyContribution > 0 ? Math.round((share / g.monthlyContribution) * 10) / 10 : 0;
    return { goalId: g.id, goalName: g.name, progressBefore, progressAfter, monthsDelayed };
  });
}

function explain(
  action: ProposedAction,
  breakdown: ScenarioBreakdown,
  safetyLabel: string,
  impacts: GoalImpact[],
): string {
  const remaining = formatMoney(breakdown.remaining);
  const margin = formatMoney(breakdown.marginForSurprises);
  const delayed = impacts.find((i) => i.monthsDelayed > 0);

  if (action.kind === "none") {
    return `Hoy, después de cubrir tus pagos previstos y tus gastos necesarios, te quedarían alrededor de ${remaining}. Tu margen para un gasto inesperado es de ${margin}.`;
  }

  if (breakdown.marginForSurprises < 0) {
    return `Con esta decisión no alcanzaría para cubrir todo: te faltarían ${formatMoney(Math.abs(breakdown.marginForSurprises))} después de tus pagos y tu reserva de ${formatMoney(breakdown.reserve)}.`;
  }

  const base =
    action.kind === "wait"
      ? `Si esperas, después de cubrir tus compromisos te quedarían aproximadamente ${remaining} y tu margen para imprevistos sería de ${margin}.`
      : action.kind === "split"
        ? `Si pagas ${formatMoney(breakdown.amountUsed)} ahora y el resto después, te quedarían aproximadamente ${remaining}, con ${margin} de margen para imprevistos.`
        : `Puedes hacerlo: después de cubrir tus compromisos te quedarían aproximadamente ${remaining}, y tu margen para un gasto inesperado bajaría a ${margin}.`;

  const tail =
    delayed && action.kind !== "wait"
      ? ` Tu meta "${delayed.goalName}" avanzaría más despacio.`
      : ` Tu situación quedaría ${safetyLabel.toLowerCase()}.`;

  return base + tail;
}

export function simulate(
  snapshot: FinancialSnapshot,
  action: ProposedAction,
  options: SimulationOptions = {},
): Scenario {
  const horizonDays = options.horizonDays ?? DEFAULT_HORIZON_DAYS;
  const income = options.expectedIncome ?? 0;

  const startingBalance = totalBalance(snapshot);
  const payments = upcomingPayments(snapshot, horizonDays);
  const upcoming = payments.reduce((sum, p) => sum + p.amount, 0);
  const essentials = essentialExpensesForHorizon(snapshot, horizonDays);
  const reserve = snapshot.user.minimumReserve;

  const amountUsed =
    action.kind === "none" || action.kind === "wait"
      ? 0
      : action.kind === "split"
        ? (action.upfrontAmount ?? Math.round(action.amount / 2))
        : action.amount;

  const remaining = startingBalance + income - amountUsed - upcoming - essentials;
  const marginForSurprises = remaining - reserve;

  const breakdown: ScenarioBreakdown = {
    startingBalance,
    amountUsed,
    upcomingPayments: upcoming,
    essentialExpenses: essentials,
    reserve,
    remaining,
    marginForSurprises,
  };

  const marginBefore = startingBalance + income - upcoming - essentials - reserve;
  const impacts = goalImpacts(snapshot, amountUsed, marginBefore);
  const safety = safetyFromMargin(marginForSurprises, Math.max(1, upcoming + essentials));

  return {
    id: `${action.kind}_${amountUsed}`,
    title: action.label,
    kind: action.kind,
    action,
    breakdown,
    risk: safety.level,
    safetyScore: safety.score,
    goalImpacts: impacts,
    explanation: explain(action, breakdown, safety.label, impacts),
  };
}

/**
 * Compara el escenario actual, el escenario con la decisión y una alternativa.
 * La alternativa se construye a partir de la misma acción (esperar o dividir),
 * nunca inventando datos nuevos.
 */
export function compareScenarios(
  snapshot: FinancialSnapshot,
  action: ProposedAction,
  options: SimulationOptions = {},
): ScenarioComparison {
  const current = simulate(snapshot, { kind: "none", label: "Escenario actual", amount: 0 }, options);

  const withPurchase = simulate(
    snapshot,
    { ...action, kind: "purchase", label: action.label || "Si realizo la compra" },
    options,
  );

  const half = Math.round(action.amount / 2);
  const alternative =
    action.amount > 0 && withPurchase.breakdown.marginForSurprises < 0
      ? simulate(
          snapshot,
          { kind: "wait", label: "Si espero", amount: action.amount, delayDays: 15 },
          options,
        )
      : simulate(
          snapshot,
          {
            kind: "split",
            label: "Si lo divido en dos partes",
            amount: action.amount,
            upfrontAmount: half,
          },
          options,
        );

  const scenarios = [current, withPurchase, alternative].map((s, i) => ({ ...s, id: `${s.id}_${i}` }));
  const safest = scenarios.reduce((best, s) =>
    s.breakdown.marginForSurprises > best.breakdown.marginForSurprises ? s : best,
  );

  return { action, scenarios, safestScenarioId: safest.id };
}
