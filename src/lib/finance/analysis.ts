import { daysUntil } from "./format";
import type {
  CalendarEvent,
  FinancialSnapshot,
  Payment,
  PaymentPlanOption,
  PaymentPriority,
  RiskLevel,
} from "./types";

/**
 * Motor de análisis: convierte una fotografía financiera en indicadores
 * comprensibles. No conoce React ni componentes.
 */

const PRIORITY_WEIGHT: Record<PaymentPriority, number> = {
  critical: 0,
  important: 1,
  flexible: 2,
};

export const PRIORITY_LABEL: Record<PaymentPriority, string> = {
  critical: "Imprescindible",
  important: "Necesario",
  flexible: "Puede esperar",
};

export interface FinancialOverview {
  balance: number;
  /** Ingresos previstos dentro del horizonte. */
  expectedIncome: number;
  /** Suma de pagos próximos dentro del horizonte. */
  committed: number;
  /** Gastos necesarios prorrateados al horizonte. */
  essentialExpenses: number;
  reserve: number;
  /** Dinero que puede usarse razonablemente para una decisión. */
  availableToDecide: number;
  safety: { level: RiskLevel; score: number; label: string };
  nextPayment: Payment | null;
  goalsProgress: { id: string; name: string; progress: number }[];
  horizonDays: number;
}

export const DEFAULT_HORIZON_DAYS = 30;

export function totalBalance(snapshot: FinancialSnapshot): number {
  return snapshot.accounts
    .filter((a) => a.kind !== "credit")
    .reduce((sum, a) => sum + a.balance, 0);
}

export function upcomingPayments(
  snapshot: FinancialSnapshot,
  horizonDays = DEFAULT_HORIZON_DAYS,
): Payment[] {
  return snapshot.payments
    .filter((p) => {
      const d = daysUntil(p.dueDate, snapshot.asOf);
      return d >= 0 && d <= horizonDays;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export function expectedIncomeForHorizon(
  snapshot: FinancialSnapshot,
  horizonDays = DEFAULT_HORIZON_DAYS,
): number {
  return snapshot.incomes
    .filter((i) => {
      const d = daysUntil(i.date, snapshot.asOf);
      return d >= 0 && d <= horizonDays;
    })
    .reduce((sum, i) => sum + i.amount, 0);
}

export function essentialExpensesForHorizon(
  snapshot: FinancialSnapshot,
  horizonDays = DEFAULT_HORIZON_DAYS,
): number {
  const monthly = snapshot.expenses
    .filter((e) => e.essential)
    .reduce((sum, e) => sum + e.monthlyAmount, 0);
  return Math.round((monthly / 30) * horizonDays);
}

export function safetyFromMargin(margin: number, reference: number): { level: RiskLevel; score: number; label: string } {
  const ratio = reference > 0 ? margin / reference : margin > 0 ? 1 : 0;
  const score = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  if (margin < 0) return { level: "risky", score: 0, label: "En riesgo" };
  if (ratio < 0.1) return { level: "tight", score, label: "Muy ajustada" };
  if (ratio < 0.25) return { level: "watch", score, label: "Con cuidado" };
  return { level: "safe", score, label: "Holgada" };
}

export function buildOverview(
  snapshot: FinancialSnapshot,
  horizonDays = DEFAULT_HORIZON_DAYS,
): FinancialOverview {
  const balance = totalBalance(snapshot);
  const payments = upcomingPayments(snapshot, horizonDays);
  const committed = payments.reduce((sum, p) => sum + p.amount, 0);
  const essentials = essentialExpensesForHorizon(snapshot, horizonDays);
  const reserve = snapshot.user.minimumReserve;
  const income = expectedIncomeForHorizon(snapshot, horizonDays);
  const availableToDecide = Math.max(0, balance + income - committed - essentials - reserve);

  return {
    balance,
    expectedIncome: income,
    committed,
    essentialExpenses: essentials,
    reserve,
    availableToDecide,
    safety: safetyFromMargin(availableToDecide, Math.max(1, committed + essentials)),
    nextPayment: payments[0] ?? null,
    goalsProgress: snapshot.goals.map((g) => ({
      id: g.id,
      name: g.name,
      progress: g.targetAmount > 0 ? Math.min(1, g.savedAmount / g.targetAmount) : 0,
    })),
    horizonDays,
  };
}

/** Orden recomendado de pagos: prioridad primero, luego fecha de vencimiento. */
export function prioritizePayments(payments: Payment[]): Payment[] {
  return [...payments].sort((a, b) => {
    const byPriority = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (byPriority !== 0) return byPriority;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

/**
 * Combinaciones posibles de pagos y cuánto dinero quedaría con cada una.
 * No recomienda: describe alternativas para que la persona compare.
 */
export function paymentPlanOptions(payments: Payment[], balance: number): PaymentPlanOption[] {
  const ordered = prioritizePayments(payments);
  const critical = ordered.filter((p) => p.priority === "critical");
  const essential = ordered.filter((p) => p.priority !== "flexible");

  const build = (id: string, title: string, subset: Payment[]): PaymentPlanOption => {
    const total = subset.reduce((sum, p) => sum + p.amount, 0);
    const ids = new Set(subset.map((p) => p.id));
    return {
      id,
      title,
      paymentIds: subset.map((p) => p.id),
      total,
      remainingAfter: balance - total,
      coversCritical: critical.every((p) => ids.has(p.id)),
      deferred: ordered.filter((p) => !ids.has(p.id)),
    };
  };

  const options = [
    build("all", "Cubrir todos los pagos", ordered),
    build("essential", "Solo lo imprescindible y necesario", essential),
    build("critical", "Solo lo imprescindible", critical),
  ];

  return options.filter(
    (option, index, arr) => arr.findIndex((o) => o.paymentIds.join() === option.paymentIds.join()) === index,
  );
}

export function calendarEvents(snapshot: FinancialSnapshot): CalendarEvent[] {
  const fromPayments: CalendarEvent[] = snapshot.payments.map((p) => ({
    id: `pay_${p.id}`,
    date: p.dueDate,
    title: p.name,
    amount: p.amount,
    kind: "payment",
    priority: p.priority,
  }));

  // Solo se incluyen metas con fecha objetivo definida por la persona.
  const fromGoals: CalendarEvent[] = snapshot.goals
    .filter((g) => Boolean(g.targetDate))
    .map((g) => ({
      id: `goal_${g.id}`,
      date: g.targetDate,
      title: `Meta: ${g.name}`,
      amount: g.targetAmount - g.savedAmount,
      kind: "goal",
      priority: null,
    }));

  const fromIncomes: CalendarEvent[] = snapshot.incomes.map((i) => ({
    id: `inc_${i.id}`,
    date: i.date,
    title: i.name,
    amount: i.amount,
    kind: "income",
    priority: null,
  }));

  return [...fromPayments, ...fromGoals, ...fromIncomes].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}
