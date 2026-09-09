import { mockSnapshot } from "./mock-data";
import type { Account, FinancialSnapshot, Goal, Payment, Transaction } from "./types";

/**
 * Capa de servicios / abstracción de datos.
 *
 * Toda la aplicación lee los datos financieros a través de esta interfaz.
 * Para conectar la API externa (por ejemplo la de Capital One) basta con
 * escribir otro objeto que implemente `FinanceDataProvider` y registrarlo en
 * `getFinanceProvider()`. No se inventan endpoints ni autenticación aquí.
 */
export interface FinanceDataProvider {
  readonly id: string;
  getSnapshot(): Promise<FinancialSnapshot>;
  getAccounts(): Promise<Account[]>;
  getTransactions(): Promise<Transaction[]>;
  getPayments(): Promise<Payment[]>;
  getGoals(): Promise<Goal[]>;
}

const delay = <T>(value: T, ms = 220): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

/** Proveedor de demostración: datos locales realistas. */
export const mockFinanceProvider: FinanceDataProvider = {
  id: "mock",
  getSnapshot: () => delay(mockSnapshot),
  getAccounts: () => delay(mockSnapshot.accounts),
  getTransactions: () => delay(mockSnapshot.transactions),
  getPayments: () => delay(mockSnapshot.payments),
  getGoals: () => delay(mockSnapshot.goals),
};

let activeProvider: FinanceDataProvider = mockFinanceProvider;

/** Punto único de acceso a los datos financieros. */
export function getFinanceProvider(): FinanceDataProvider {
  return activeProvider;
}

/** Permite sustituir el proveedor (API externa) sin tocar la interfaz. */
export function setFinanceProvider(provider: FinanceDataProvider): void {
  activeProvider = provider;
}
