/**
 * Modelo de dominio financiero.
 *
 * Estos tipos son la frontera entre los datos (mock hoy, API externa mañana)
 * y el motor de análisis/simulación. La interfaz nunca define su propia forma
 * de datos: siempre consume estos tipos.
 */

export type Currency = "MXN" | "USD";

export type PaymentPriority = "critical" | "important" | "flexible";

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  currency: Currency;
  /** Reserva mínima que la persona quiere conservar siempre. */
  minimumReserve: number;
}

export interface Account {
  id: string;
  name: string;
  kind: "checking" | "savings" | "credit";
  balance: number;
  maskedNumber: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string; // ISO
  description: string;
  category: string;
  /** Negativo = salida de dinero, positivo = entrada. */
  amount: number;
}

export interface Payment {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // ISO
  priority: PaymentPriority;
  category: string;
  /**
   * Consecuencia de retrasar el pago.
   * Solo se muestra cuando la fuente de datos la provee: nunca se infiere
   * ni se inventa dentro de la aplicación.
   */
  consequence: string | null;
  /** Origen del dato de consecuencia (regla configurada, contrato, API...). */
  consequenceSource: string | null;
}

export interface RecurringExpense {
  id: string;
  name: string;
  monthlyAmount: number;
  essential: boolean;
  category: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string; // ISO
  monthlyContribution: number;
}

export interface CalendarEvent {
  id: string;
  date: string; // ISO
  title: string;
  amount: number | null;
  kind: "payment" | "goal" | "income";
  priority: PaymentPriority | null;
}

/** Fotografía completa de la situación financiera en un momento dado. */
export interface FinancialSnapshot {
  user: UserProfile;
  accounts: Account[];
  transactions: Transaction[];
  payments: Payment[];
  expenses: RecurringExpense[];
  goals: Goal[];
  asOf: string; // ISO
}

/* ---------- Simulación ---------- */

export type ActionKind = "none" | "purchase" | "wait" | "split";

export interface ProposedAction {
  kind: ActionKind;
  label: string;
  amount: number;
  /** Días de espera antes de ejecutar la acción (para escenarios alternativos). */
  delayDays?: number;
  /** Porción que se paga hoy en un escenario dividido. */
  upfrontAmount?: number;
}

export type RiskLevel = "safe" | "watch" | "tight" | "risky";

export interface GoalImpact {
  goalId: string;
  goalName: string;
  progressBefore: number; // 0..1
  progressAfter: number; // 0..1
  monthsDelayed: number;
}

export interface ScenarioBreakdown {
  startingBalance: number;
  amountUsed: number;
  upcomingPayments: number;
  essentialExpenses: number;
  reserve: number;
  remaining: number;
  marginForSurprises: number;
}

export interface Scenario {
  id: string;
  title: string;
  kind: ActionKind;
  action: ProposedAction;
  breakdown: ScenarioBreakdown;
  risk: RiskLevel;
  /** Puntaje 0..100 de holgura financiera; sirve para comparar alternativas. */
  safetyScore: number;
  goalImpacts: GoalImpact[];
  /** Explicación en lenguaje humano de lo que pasaría. */
  explanation: string;
}

export interface ScenarioComparison {
  action: ProposedAction;
  scenarios: Scenario[];
  /** Escenario con mayor holgura, para señalarlo (no para ordenar al usuario). */
  safestScenarioId: string;
}

export interface PaymentPlanOption {
  id: string;
  title: string;
  paymentIds: string[];
  total: number;
  remainingAfter: number;
  coversCritical: boolean;
  deferred: Payment[];
}
