import type {
  Currency,
  ExpectedIncome,
  FinancialSnapshot,
  Goal,
  Payment,
  PaymentPriority,
} from "./types";

/**
 * Datos introducidos por la persona durante la configuración inicial.
 *
 * Esta es la única fuente de verdad de la experiencia real: Dashboard,
 * Simulador, Pagos, Metas y Calendario leen de aquí (convertido a
 * `FinancialSnapshot`). Cuando exista la API externa, bastará con producir un
 * `FinancialSnapshot` desde esa API en lugar de desde este almacenamiento.
 */

export interface UserIncomeInput {
  id: string;
  name: string;
  amount: number;
  /** Fecha en la que llegará (ISO). Un ingreso futuro no es dinero de hoy. */
  date: string;
}

export interface UserPaymentInput {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // ISO
  priority: PaymentPriority;
  category: string;
}

export interface UserGoalInput {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  monthlyContribution: number;
  /** Opcional: si la persona no la define, queda en null. */
  targetDate: string | null;
}

/**
 * Registro de una disposición de dinero apartado en una meta hacia el dinero
 * disponible. Sirve para que el movimiento quede trazado y no parezca dinero
 * creado de la nada.
 */
export interface GoalWithdrawal {
  id: string;
  goalId: string;
  goalName: string;
  amount: number;
  date: string; // ISO
}

export interface UserFinancialData {
  version: 1;
  createdAt: string;
  name: string;
  currency: Currency;
  /** Dinero disponible hoy. No incluye el dinero apartado en metas. */
  availableMoney: number;
  /** Reserva definida por la persona. */
  reserve: number;
  incomes: UserIncomeInput[];
  payments: UserPaymentInput[];
  goals: UserGoalInput[];
  /** Historial de disposiciones desde el apartado de una meta. */
  goalWithdrawals?: GoalWithdrawal[];
}

const STORAGE_KEY = "okcash.userData.v1";

export function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyUserData(): UserFinancialData {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    name: "",
    currency: "MXN",
    availableMoney: 0,
    reserve: 0,
    incomes: [],
    payments: [],
    goals: [],
    goalWithdrawals: [],
  };
}

/** Dinero apartado en metas. Es un apartado aparte del dinero disponible. */
export function totalSetAsideInGoals(data: UserFinancialData): number {
  return data.goals.reduce((sum, g) => sum + Math.max(0, g.savedAmount), 0);
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "OK";
  const letters = parts.slice(0, 2).map((p) => p[0]!.toUpperCase());
  return letters.join("");
}

function firstNameFrom(name: string): string {
  return name.trim().split(/\s+/)[0] || "";
}

/** Convierte los datos introducidos al modelo que consume el motor financiero. */
export function toSnapshot(data: UserFinancialData, asOf = new Date().toISOString()): FinancialSnapshot {
  const incomes: ExpectedIncome[] = data.incomes.map((i) => ({
    id: i.id,
    name: i.name,
    amount: i.amount,
    date: i.date,
  }));

  const payments: Payment[] = data.payments.map((p) => ({
    id: p.id,
    name: p.name,
    amount: p.amount,
    dueDate: p.dueDate,
    priority: p.priority,
    category: p.category,
    // No inventamos consecuencias por retrasar un pago.
    consequence: null,
    consequenceSource: null,
  }));

  const goals: Goal[] = data.goals.map((g) => ({
    id: g.id,
    name: g.name,
    targetAmount: g.targetAmount,
    savedAmount: g.savedAmount,
    monthlyContribution: g.monthlyContribution,
    targetDate: g.targetDate ?? "",
  }));

  const parts = data.name.trim().split(/\s+/).filter(Boolean);

  return {
    asOf,
    user: {
      id: "local_user",
      firstName: firstNameFrom(data.name),
      lastName: parts.slice(1).join(" "),
      initials: initialsFrom(data.name),
      currency: data.currency,
      minimumReserve: data.reserve,
    },
    accounts: [
      {
        id: "acc_available",
        name: "Dinero disponible",
        kind: "checking",
        balance: data.availableMoney,
        maskedNumber: "",
      },
    ],
    transactions: [],
    // Los gastos recurrentes aún no se piden en la configuración inicial.
    expenses: [],
    incomes,
    payments,
    goals,
  };
}

/* ---------- Persistencia local ---------- */

let cache: UserFinancialData | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function read(): UserFinancialData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserFinancialData;
    if (!parsed || parsed.version !== 1) return null;
    // Normalizamos listas ausentes de versiones anteriores del guardado.
    return {
      ...parsed,
      incomes: parsed.incomes ?? [],
      payments: parsed.payments ?? [],
      goals: parsed.goals ?? [],
      goalWithdrawals: parsed.goalWithdrawals ?? [],
    };
  } catch {
    return null;
  }
}

export function getUserData(): UserFinancialData | null {
  if (typeof window === "undefined") return null;
  if (!loaded) {
    cache = read();
    loaded = true;
  }
  return cache;
}

export function saveUserData(data: UserFinancialData): void {
  if (typeof window === "undefined") return;
  cache = data;
  loaded = true;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  listeners.forEach((l) => l());
}

export function clearUserData(): void {
  if (typeof window === "undefined") return;
  cache = null;
  loaded = true;
  window.localStorage.removeItem(STORAGE_KEY);
  listeners.forEach((l) => l());
}

export function subscribeUserData(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Actualiza solo las partes indicadas de los datos guardados.
 * Permite editar un dato sin volver a capturar todos los demás.
 */
export function updateUserData(patch: Partial<UserFinancialData>): UserFinancialData | null {
  const current = getUserData();
  if (!current) return null;
  const next: UserFinancialData = { ...current, ...patch };
  saveUserData(next);
  return next;
}

/**
 * Mueve dinero del apartado de una meta al dinero disponible.
 * No crea dinero: baja el apartado exactamente lo mismo que sube el disponible
 * y deja registro del movimiento.
 */
export function withdrawFromGoal(goalId: string, amount: number): UserFinancialData | null {
  const current = getUserData();
  if (!current) return null;
  const goal = current.goals.find((g) => g.id === goalId);
  if (!goal) return null;

  const moved = Math.min(Math.max(0, Math.round(amount)), Math.max(0, goal.savedAmount));
  if (moved <= 0) return current;

  const withdrawal: GoalWithdrawal = {
    id: makeId("wdr"),
    goalId: goal.id,
    goalName: goal.name,
    amount: moved,
    date: new Date().toISOString(),
  };

  const next: UserFinancialData = {
    ...current,
    availableMoney: current.availableMoney + moved,
    goals: current.goals.map((g) => (g.id === goalId ? { ...g, savedAmount: g.savedAmount - moved } : g)),
    goalWithdrawals: [...(current.goalWithdrawals ?? []), withdrawal],
  };
  saveUserData(next);
  return next;
}
