import {
  DEFAULT_HORIZON_DAYS,
  essentialExpensesForHorizon,
  expectedIncomeForHorizon,
  totalBalance,
  upcomingPayments,
} from "./analysis";
import { daysUntil, formatMoney, formatShortDate, parseDate } from "./format";
import type {
  FinancialSnapshot,
  GoalImpact,
  ProposedAction,
  RiskLevel,
  Scenario,
  ScenarioBreakdown,
  ScenarioComparison,
  TimelineEvent,
  TimelinePoint,
} from "./types";

/**
 * Motor de simulación basado en el tiempo.
 *
 * Entrada: fotografía financiera + acción propuesta.
 * Salida: escenario con línea de tiempo, desglose, riesgo, impacto en metas y
 * explicación. Es una función pura: no depende de la interfaz ni del origen de
 * los datos.
 *
 * Regla fundamental: el dinero futuro no está disponible hoy. Cada movimiento
 * se coloca en su fecha y el saldo se recalcula día por día.
 */

export interface SimulationOptions {
  horizonDays?: number;
  /** Ingreso esperado dentro del horizonte (0 si no se conoce). */
  expectedIncome?: number;
}

const DEFAULT_DELAY_DAYS = 15;

/* ---------- Utilidades de fechas ---------- */

function dayKey(iso: string): string {
  const d = parseDate(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

/* ---------- Construcción de la línea de tiempo ---------- */

/** Movimientos de la acción propuesta, colocados en su fecha real. */
function actionEvents(action: ProposedAction, asOf: string): TimelineEvent[] {
  const today = dayKey(asOf);

  if (action.kind === "none" || action.amount <= 0) return [];

  if (action.kind === "wait") {
    const date = addDays(asOf, action.delayDays ?? DEFAULT_DELAY_DAYS);
    return [
      { id: "act_wait", date, type: "purchase", description: action.label || "Compra", amount: -action.amount },
    ];
  }

  if (action.kind === "split") {
    const upfront = Math.min(action.amount, action.upfrontAmount ?? Math.round(action.amount / 2));
    const rest = Math.max(0, action.amount - upfront);
    const secondDate = action.secondPaymentDate
      ? dayKey(action.secondPaymentDate)
      : addDays(asOf, action.delayDays ?? DEFAULT_DELAY_DAYS);
    const events: TimelineEvent[] = [
      { id: "act_split_1", date: today, type: "purchase", description: "Primera parte", amount: -upfront },
    ];
    if (rest > 0) {
      events.push({
        id: "act_split_2",
        date: secondDate,
        type: "purchase",
        description: "Segunda parte",
        amount: -rest,
      });
    }
    return events;
  }

  return [
    { id: "act_purchase", date: today, type: "purchase", description: action.label || "Compra", amount: -action.amount },
  ];
}

function snapshotEvents(snapshot: FinancialSnapshot, horizonDays: number): TimelineEvent[] {
  const events: TimelineEvent[] = upcomingPayments(snapshot, horizonDays).map((p) => ({
    id: `pay_${p.id}`,
    date: dayKey(p.dueDate),
    type: "payment",
    description: p.name,
    amount: -p.amount,
  }));

  for (const income of snapshot.incomes) {
    const d = daysUntil(income.date, snapshot.asOf);
    if (d < 0 || d > horizonDays) continue;
    events.push({
      id: `inc_${income.id}`,
      date: dayKey(income.date),
      type: "income",
      description: income.name,
      amount: income.amount,
    });
  }

  // Gastos necesarios: solo si la persona los registró (puede ser 0).
  const essentials = essentialExpensesForHorizon(snapshot, horizonDays);
  if (essentials > 0) {
    events.push({
      id: "exp_essentials",
      date: addDays(snapshot.asOf, horizonDays),
      type: "expense",
      description: "Gastos necesarios del periodo",
      amount: -essentials,
    });
  }

  return events;
}

function buildTimeline(events: TimelineEvent[], startingBalance: number): TimelinePoint[] {
  const byDate = new Map<string, TimelineEvent[]>();
  for (const event of events) {
    const list = byDate.get(event.date);
    if (list) list.push(event);
    else byDate.set(event.date, [event]);
  }

  const dates = [...byDate.keys()].sort((a, b) => parseDate(a).getTime() - parseDate(b).getTime());

  let balance = startingBalance;
  return dates.map((date) => {
    const dayEvents = byDate.get(date)!;
    const netAmount = dayEvents.reduce((sum, e) => sum + e.amount, 0);
    balance += netAmount;
    return { date, events: dayEvents, netAmount, balanceAfter: balance };
  });
}

/* ---------- Riesgo ---------- */

function riskFromTimeline(
  minimumBalance: number,
  reserve: number,
  reference: number,
): { level: RiskLevel; score: number; label: string } {
  const margin = minimumBalance - reserve;
  const base = Math.max(1, reference);
  const score = Math.max(0, Math.min(100, Math.round((margin / base) * 100)));

  if (minimumBalance < 0) return { level: "risky", score: 0, label: "En riesgo" };
  if (minimumBalance < reserve) return { level: "tight", score, label: "Muy ajustada" };
  if (margin / base < 0.2) return { level: "watch", score, label: "Con cuidado" };
  return { level: "safe", score, label: "Holgada" };
}

/* ---------- Metas ---------- */

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

  // Lo que excede el margen disponible se traduce en aportaciones futuras que
  // no se podrían hacer: nunca en retiros del dinero ya ahorrado.
  const shortfall = Math.max(0, amountUsed - Math.max(0, marginBefore));
  const totalContribution = snapshot.goals.reduce((s, g) => s + g.monthlyContribution, 0) || 1;

  return snapshot.goals.map((g) => {
    const share = (g.monthlyContribution / totalContribution) * shortfall;
    const progressBefore = g.targetAmount > 0 ? Math.min(1, g.savedAmount / g.targetAmount) : 0;
    const missedProgress = g.targetAmount > 0 ? share / g.targetAmount : 0;
    const progressAfter = Math.max(0, progressBefore - missedProgress);
    const monthsDelayed = g.monthlyContribution > 0 ? Math.round((share / g.monthlyContribution) * 10) / 10 : 0;
    return { goalId: g.id, goalName: g.name, progressBefore, progressAfter, monthsDelayed };
  });
}

/* ---------- Explicación ---------- */

function explain(
  action: ProposedAction,
  breakdown: ScenarioBreakdown,
  safetyLabel: string,
  impacts: GoalImpact[],
): string {
  const remaining = formatMoney(breakdown.remaining);
  const minimum = formatMoney(breakdown.minimumBalance);
  const whenLow = breakdown.minimumBalanceDate ? ` (alrededor del ${formatShortDate(breakdown.minimumBalanceDate)})` : "";
  const delayed = impacts.find((i) => i.monthsDelayed > 0);

  if (action.kind === "none") {
    return `Siguiendo tus fechas, tu punto más bajo sería de ${minimum}${whenLow} y terminarías el periodo con alrededor de ${remaining}.`;
  }

  if (breakdown.minimumBalance < 0) {
    return `Con esta decisión te quedarías sin dinero antes de cubrir todo: tu punto más bajo sería de ${minimum}${whenLow}.`;
  }

  if (breakdown.marginAtMinimum < 0) {
    return `Con esta decisión tu punto más bajo sería de ${minimum}${whenLow}, por debajo de la reserva de ${formatMoney(breakdown.reserve)} que quieres conservar. Al final del periodo tendrías cerca de ${remaining}.`;
  }

  const base =
    action.kind === "wait"
      ? `Si esperas, tu punto más bajo sería de ${minimum}${whenLow} y cerrarías el periodo con cerca de ${remaining}.`
      : action.kind === "split"
        ? `Si pagas ${formatMoney(breakdown.amountUsed)} en dos partes, tu punto más bajo sería de ${minimum}${whenLow} y cerrarías con cerca de ${remaining}.`
        : `Puedes hacerlo: tu punto más bajo sería de ${minimum}${whenLow} y cerrarías el periodo con cerca de ${remaining}.`;

  const tail =
    delayed && action.kind !== "wait"
      ? ` Tu meta "${delayed.goalName}" avanzaría más despacio.`
      : ` Tu situación quedaría ${safetyLabel.toLowerCase()}.`;

  return base + tail;
}

/* ---------- Simulación ---------- */

export function simulate(
  snapshot: FinancialSnapshot,
  action: ProposedAction,
  options: SimulationOptions = {},
): Scenario {
  const horizonDays = options.horizonDays ?? DEFAULT_HORIZON_DAYS;
  const income = options.expectedIncome ?? expectedIncomeForHorizon(snapshot, horizonDays);

  const startingBalance = totalBalance(snapshot);
  const payments = upcomingPayments(snapshot, horizonDays);
  const upcoming = payments.reduce((sum, p) => sum + p.amount, 0);
  const essentials = essentialExpensesForHorizon(snapshot, horizonDays);
  const reserve = snapshot.user.minimumReserve;

  const events = [...snapshotEvents(snapshot, horizonDays), ...actionEvents(action, snapshot.asOf)];
  const timeline = buildTimeline(events, startingBalance);

  const amountUsed = actionEvents(action, snapshot.asOf).reduce((sum, e) => sum + Math.abs(e.amount), 0);

  const remaining = timeline.length > 0 ? timeline[timeline.length - 1]!.balanceAfter : startingBalance;
  const lowest = timeline.reduce<TimelinePoint | null>(
    (low, point) => (low === null || point.balanceAfter < low.balanceAfter ? point : low),
    null,
  );
  const minimumBalance = lowest ? Math.min(startingBalance, lowest.balanceAfter) : startingBalance;
  const minimumBalanceDate = lowest && lowest.balanceAfter <= startingBalance ? lowest.date : null;

  const breakdown: ScenarioBreakdown = {
    startingBalance,
    expectedIncome: income,
    amountUsed,
    upcomingPayments: upcoming,
    essentialExpenses: essentials,
    reserve,
    remaining,
    // Margen real durante todo el periodo: usa el punto más bajo, no solo el cierre.
    marginForSurprises: Math.min(remaining, minimumBalance) - reserve,
    minimumBalance,
    minimumBalanceDate,
    marginAtMinimum: minimumBalance - reserve,
  };

  const marginBefore = startingBalance - upcoming - essentials - reserve;
  const impacts = goalImpacts(snapshot, amountUsed, marginBefore);
  const safety = riskFromTimeline(minimumBalance, reserve, Math.max(1, upcoming + essentials));

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
    timeline,
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
    action.amount > 0 && withPurchase.breakdown.marginAtMinimum < 0
      ? simulate(
          snapshot,
          { kind: "wait", label: "Si espero", amount: action.amount, delayDays: DEFAULT_DELAY_DAYS },
          options,
        )
      : simulate(
          snapshot,
          {
            kind: "split",
            label: "Si lo divido en dos partes",
            amount: action.amount,
            upfrontAmount: half,
            delayDays: DEFAULT_DELAY_DAYS,
          },
          options,
        );

  const currentScenario: Scenario = { ...current, id: `${current.id}_0` };
  const actionScenario: Scenario = { ...withPurchase, id: `${withPurchase.id}_1` };
  const alternativeScenario: Scenario = { ...alternative, id: `${alternative.id}_2` };

  const scenarios = [currentScenario, actionScenario, alternativeScenario];
  const safest = scenarios.reduce((best, s) => {
    if (s.breakdown.marginAtMinimum !== best.breakdown.marginAtMinimum) {
      return s.breakdown.marginAtMinimum > best.breakdown.marginAtMinimum ? s : best;
    }
    return s.breakdown.remaining > best.breakdown.remaining ? s : best;
  });

  return {
    action,
    scenarios,
    current: currentScenario,
    withAction: actionScenario,
    alternative: alternativeScenario,
    safestScenarioId: safest.id,
  };
}
