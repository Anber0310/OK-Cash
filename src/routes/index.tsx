import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { SetupGate } from "@/components/layout/SetupGate";
import { GlassCard, SectionTitle } from "@/components/ui/GlassCard";
import { useOverview } from "@/hooks/useFinance";
import { PRIORITY_LABEL } from "@/lib/finance/analysis";
import { formatMoney, formatShortDate, percent } from "@/lib/finance/format";
import { goalProgress } from "@/lib/finance/goal-impact";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OK cash — ¿Qué pasa si tomo esta decisión?" },
      {
        name: "description",
        content:
          "Antes de gastar, mira qué pasaría con tu dinero: tu punto más bajo, tu reserva, tus pagos por venir y tus metas.",
      },
      { property: "og:title", content: "OK cash — ¿Qué pasa si tomo esta decisión?" },
      {
        property: "og:description",
        content: "Simula una compra y entiende sus consecuencias antes de decidir.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <SetupGate>
      <Dashboard />
    </SetupGate>
  ),
});

function Dashboard() {
  const { snapshot, overview } = useOverview();
  const goal = snapshot.goals[0] ?? null;

  return (
    <AppShell>
      {/* A. Dinero para decidir + D. acción principal */}
      <section className="rise relative overflow-hidden rounded-3xl glass p-6 md:p-9">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-accent/25 blur-3xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-md">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inksoft">
              Dinero para decidir
            </div>
            <div className="mt-2 font-display text-5xl font-bold tracking-tight text-brand">
              {formatMoney(overview.availableToDecide)}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-inksoft">
              Es lo que puedes usar en los próximos {overview.horizonDays} días sin bajar de tu reserva de{" "}
              {formatMoney(overview.reserve)} en ningún momento. Tu dinero disponible hoy es{" "}
              {formatMoney(overview.balance)}
              {overview.goalsSetAside > 0
                ? `, y aparte tienes ${formatMoney(overview.goalsSetAside)} apartados en metas.`
                : "."}
            </p>

            <Link
              to="/simulador"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl gradient-brand px-6 py-4 font-display text-base font-bold text-white shadow-brand-glow"
            >
              ¿Qué pasa si…? Simular una decisión
            </Link>
          </div>

          <div className="grid w-full max-w-sm gap-3">
            {/* B. Próximo compromiso importante */}
            <div className="rounded-2xl glass-soft p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-inksoft">
                Próximo compromiso
              </div>
              {overview.nextPayment ? (
                <>
                  <div className="mt-1 flex items-baseline justify-between gap-3">
                    <span className="font-display text-xl font-bold">{overview.nextPayment.name}</span>
                    <span className="font-display text-xl font-bold">
                      {formatMoney(overview.nextPayment.amount)}
                    </span>
                  </div>
                  <div className="mt-1 text-[12px] text-inksoft">
                    {formatShortDate(overview.nextPayment.dueDate)} ·{" "}
                    {PRIORITY_LABEL[overview.nextPayment.priority]}
                  </div>
                </>
              ) : (
                <div className="mt-1 text-sm text-inksoft">No tienes pagos próximos registrados.</div>
              )}
              <Link to="/pagos" className="mt-3 inline-block text-[11px] font-semibold text-brand">
                ver todos mis pagos
              </Link>
            </div>

            {/* C. Meta de ahorro */}
            <div className="rounded-2xl glass-soft p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-inksoft">
                Meta de ahorro
              </div>
              {goal ? (
                <>
                  <div className="mt-1 flex items-baseline justify-between gap-3">
                    <span className="font-display text-lg font-bold">{goal.name}</span>
                    <span className="text-[12px] text-inksoft">
                      {formatMoney(goal.savedAmount)} de {formatMoney(goal.targetAmount)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
                    <div
                      className="grow-x h-full rounded-full gradient-brand"
                      style={{ width: percent(goalProgress(goal)) }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] text-inksoft">{percent(goalProgress(goal))} logrado</div>
                </>
              ) : (
                <div className="mt-1 text-sm text-inksoft">Todavía no registras una meta de ahorro.</div>
              )}
              <Link to="/metas" className="mt-3 inline-block text-[11px] font-semibold text-brand">
                ver mis metas
              </Link>
            </div>
          </div>
        </div>
      </section>

      <GlassCard className="mt-5">
        <SectionTitle
          title="Así funciona OK cash"
          aside={
            <Link to="/transacciones" className="text-[11px] font-medium text-inksoft hover:text-brand">
              datos de origen
            </Link>
          }
        />
        <p className="mt-3 text-sm leading-relaxed text-inksoft">
          Colocamos cada ingreso y cada pago en su fecha, recorremos el periodo día por día y te decimos cuál
          sería tu punto más bajo si tomas una decisión hoy. Tu dinero futuro no se cuenta como dinero de hoy.
        </p>
      </GlassCard>
    </AppShell>
  );
}
