import { useMemo, useSyncExternalStore } from "react";
import { buildOverview } from "@/lib/finance/analysis";
import {
  getUserData,
  subscribeUserData,
  toSnapshot,
  type UserFinancialData,
} from "@/lib/finance/user-data";
import type { FinancialSnapshot } from "@/lib/finance/types";

/**
 * Punto único de acceso a los datos para todas las pantallas.
 * Hoy los datos vienen de la configuración inicial guardada en el dispositivo;
 * mañana el mismo `FinancialSnapshot` podrá venir de una API externa.
 */

function serverSnapshot(): UserFinancialData | null {
  return null;
}

export function useUserData(): { hydrated: boolean; data: UserFinancialData | null } {
  const data = useSyncExternalStore(subscribeUserData, getUserData, serverSnapshot);
  const hydrated = useSyncExternalStore(
    subscribeUserData,
    () => true,
    () => false,
  );
  return { hydrated, data };
}

export function useSnapshot(): FinancialSnapshot | null {
  const { data } = useUserData();
  return useMemo(() => (data ? toSnapshot(data) : null), [data]);
}

/** Solo debe usarse dentro del gate de configuración (`SetupGate`). */
export function useOverview() {
  const snapshot = useSnapshot();
  if (!snapshot) throw new Error("No hay datos de usuario: usa SetupGate antes de leer el overview.");
  return { snapshot, overview: buildOverview(snapshot) };
}
