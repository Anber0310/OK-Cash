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

/* ---------- Perfiles (demo / pruebas) ---------- */

/**
 * Cada perfil guarda sus propios datos por separado. No es autenticación:
 * es una forma sencilla de mantener escenarios independientes para la demo
 * y para pruebas, sin mezclar el dinero de uno con el de otro.
 */
export interface ProfileInfo {
  id: string;
  name: string;
  createdAt: string;
  kind: "demo" | "personal";
}

interface ProfileRegistry {
  version: 1;
  activeId: string | null;
  profiles: ProfileInfo[];
}

const PROFILES_KEY = "okcash.profiles.v1";

function dataKeyFor(profileId: string): string {
  return `${STORAGE_KEY}::${profileId}`;
}

function emptyRegistry(): ProfileRegistry {
  return { version: 1, activeId: null, profiles: [] };
}

function readRegistry(): ProfileRegistry {
  if (typeof window === "undefined") return emptyRegistry();
  try {
    const raw = window.localStorage.getItem(PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProfileRegistry;
      if (parsed && Array.isArray(parsed.profiles)) return parsed;
    }
  } catch {
    /* registro ilegible: se reconstruye */
  }

  // Migración de la versión anterior (un solo conjunto de datos sin perfiles).
  const registry = emptyRegistry();
  const legacy = window.localStorage.getItem(STORAGE_KEY);
  if (legacy) {
    const profile: ProfileInfo = {
      id: "personal",
      name: "Mis datos",
      createdAt: new Date().toISOString(),
      kind: "personal",
    };
    registry.profiles.push(profile);
    registry.activeId = profile.id;
    window.localStorage.setItem(dataKeyFor(profile.id), legacy);
  }
  writeRegistry(registry);
  return registry;
}

function writeRegistry(registry: ProfileRegistry): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILES_KEY, JSON.stringify(registry));
}

export function listProfiles(): ProfileInfo[] {
  return readRegistry().profiles;
}

export function getActiveProfile(): ProfileInfo | null {
  const registry = readRegistry();
  return registry.profiles.find((p) => p.id === registry.activeId) ?? null;
}

/** Crea un perfil nuevo (opcionalmente con datos iniciales) y lo activa. */
export function createProfile(
  name: string,
  options: { kind?: ProfileInfo["kind"]; data?: UserFinancialData } = {},
): ProfileInfo | null {
  if (typeof window === "undefined") return null;
  const registry = readRegistry();
  const profile: ProfileInfo = {
    id: makeId("prof"),
    name: name.trim() || "Perfil sin nombre",
    createdAt: new Date().toISOString(),
    kind: options.kind ?? "personal",
  };
  registry.profiles.push(profile);
  registry.activeId = profile.id;
  writeRegistry(registry);
  if (options.data) {
    window.localStorage.setItem(dataKeyFor(profile.id), JSON.stringify(options.data));
  }
  invalidate();
  return profile;
}

export function switchProfile(profileId: string): void {
  const registry = readRegistry();
  if (!registry.profiles.some((p) => p.id === profileId)) return;
  registry.activeId = profileId;
  writeRegistry(registry);
  invalidate();
}

/** Borra los datos del perfil indicado sin afectar a los demás perfiles. */
export function resetProfileData(profileId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(dataKeyFor(profileId));
  invalidate();
}

export function deleteProfile(profileId: string): void {
  if (typeof window === "undefined") return;
  const registry = readRegistry();
  registry.profiles = registry.profiles.filter((p) => p.id !== profileId);
  if (registry.activeId === profileId) {
    registry.activeId = registry.profiles[0]?.id ?? null;
  }
  writeRegistry(registry);
  window.localStorage.removeItem(dataKeyFor(profileId));
  invalidate();
}

/* ---------- Persistencia local ---------- */

let cache: UserFinancialData | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function invalidate(): void {
  cache = null;
  loaded = false;
  listeners.forEach((l) => l());
}

/** Perfil activo; si no existe ninguno se crea uno para los datos manuales. */
function activeDataKey(): string | null {
  if (typeof window === "undefined") return null;
  const registry = readRegistry();
  if (registry.activeId) return dataKeyFor(registry.activeId);
  const profile: ProfileInfo = {
    id: "personal",
    name: "Mis datos",
    createdAt: new Date().toISOString(),
    kind: "personal",
  };
  registry.profiles.push(profile);
  registry.activeId = profile.id;
  writeRegistry(registry);
  return dataKeyFor(profile.id);
}

function read(): UserFinancialData | null {
  if (typeof window === "undefined") return null;
  const key = activeDataKey();
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(key);
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
  const key = activeDataKey();
  if (!key) return;
  cache = data;
  loaded = true;
  window.localStorage.setItem(key, JSON.stringify(data));
  listeners.forEach((l) => l());
}

export function clearUserData(): void {
  if (typeof window === "undefined") return;
  const key = activeDataKey();
  cache = null;
  loaded = true;
  if (key) window.localStorage.removeItem(key);
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
