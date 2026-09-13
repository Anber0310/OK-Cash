import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useUserData } from "@/hooks/useFinance";

/**
 * Protege las pantallas que necesitan los datos de la persona.
 * Si aún no ha completado la configuración inicial, la invita a hacerla.
 */
export function SetupGate({ children }: { children: ReactNode }) {
  const { hydrated, data } = useUserData();

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-inksoft">Cargando tus datos…</div>
    );
  }

  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center px-5">
        <div className="w-full max-w-md rounded-3xl glass p-7 text-center">
          <div className="font-display text-2xl font-bold tracking-tight">
            OK<span className="text-brand"> cash</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-inksoft">
            Para empezar necesitamos algunos datos tuyos: tu dinero disponible, tus ingresos, tus pagos, tu
            reserva y tus metas.
          </p>
          <Link
            to="/configuracion"
            className="mt-6 block rounded-xl gradient-brand px-4 py-3 text-sm font-semibold text-white shadow-brand-glow"
          >
            Comenzar configuración
          </Link>
          <Link
            to="/perfiles"
            className="mt-3 block rounded-xl border border-white/70 bg-white/60 px-4 py-3 text-sm font-semibold text-ink"
          >
            Usar un perfil de demostración
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
