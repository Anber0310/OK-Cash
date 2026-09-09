import { mockSnapshot } from "./mock-data";
import { getUserData, toSnapshot } from "./user-data";
import type { Account, FinancialSnapshot, Goal, Payment, Transaction } from "./types";

/**
 * Capa de servicios / abstracción de datos.
 *
 * Toda la aplicación consume un `FinancialSnapshot`. Hoy ese snapshot se
 * construye con los datos que la persona introdujo en la configuración inicial.
 * Para conectar la API externa (por ejemplo la de Capital One) basta escribir
 * otro objeto que implemente `FinanceDataProvider` y registrarlo en
 * `setFinanceProvider()`. No se inventan endpoints ni autenticación aquí.
 */
export interface FinanceDataProvider {
  readonly id: string;
  getSnapshot(): Promise<FinancialSnapshot | null>;
  getAccounts(): Promise<Account[]>;
  getTransactions(): Promise<Transaction[]>;
  getPayments(): Promise<Payment[]>;
  getGoals(): Promise<Goal[]>;
}

const delay = <T>(value: T, ms = 120): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

/** Proveedor real de esta versión: los datos introducidos por la persona. */
export const localUserProvider: FinanceDataProvider = {
  id: "local-user",
  getSnapshot: async () => {
    const data = getUserData();
    return data ? toSnapshot(data) : null;
  },
  getAccounts: async () => (await localUserProvider.getSnapshot())?.accounts ?? [],
  getTransactions: async () => (await localUserProvider.getSnapshot())?.transactions ?? [],
  getPayments: async () => (await localUserProvider.getSnapshot())?.payments ?? [],
  getGoals: async () => (await localUserProvider.getSnapshot())?.goals ?? [],
};

/** Proveedor de demostración: solo para pruebas internas, nunca en la experiencia principal. */
export const mockFinanceProvider: FinanceDataProvider = {
  id: "mock",
  getSnapshot: () => delay(mockSnapshot),
  getAccounts: () => delay(mockSnapshot.accounts),
  getTransactions: () => delay(mockSnapshot.transactions),
  getPayments: () => delay(mockSnapshot.payments),
  getGoals: () => delay(mockSnapshot.goals),
};

let activeProvider: FinanceDataProvider = localUserProvider;

/** Punto único de acceso a los datos financieros. */
export function getFinanceProvider(): FinanceDataProvider {
  return activeProvider;
}

/** Permite sustituir el proveedor (API externa) sin tocar la interfaz. */
export function setFinanceProvider(provider: FinanceDataProvider): void {
  activeProvider = provider;
}
