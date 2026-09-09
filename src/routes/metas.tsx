import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard, SectionTitle } from "@/components/ui/GlassCard";
import { snapshotQueryOptions, useOverview } from "@/hooks/useFinance";
import { compareScenarios } from "@/lib/finance/simulation";
import { formatMoney, formatShortDate, percent } from "@/lib/finance/format";

export const Route = createFileRoute("/metas")({
  loader: ({ context }) => context.queryClient.ensureQueryData(snapshotQueryOptions),
  head: () => ({
    meta: [
      { title: "Tus metas — Clarity" },
      {
        name: "description",
        content: "Mira el avance de tus metas de ahorro y cómo una decisión de gasto podría afectarlas.",
      },
      { property: "og:title", content: "Tus metas — Clarity" },
      {
        property: "og:description",
        content: "Avance de tus metas y el efecto de cada decisión sobre ellas.",
      },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const { snapshot, overview } = useOverview();
  const [amount, setAmount] = useState(1500);

  const comparison = useMemo(
    () => compareScenarios(snapshot, { kind: "purchase", label: "Si realizo la compra", amount }),
    [snapshot, amount],
  );
  const impacts = comparison.withAction.goalImpacts;

  return (
    <AppShell greeting="Tus metas">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {snapshot.goals.map((goal) => {
          const progress = Math.min(1, goal.savedAmount / goal.targetAmount);
          const impact = impacts.find((i) => i.goalId === goal.id);
          return (
            <GlassCard key={goal.id} interactive>
              <SectionTitle
                title={goal.name}
                aside={<span className="text-[11px] text-inksoft">{formatShortDate(goal.targetDate)}</span>}
              />
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold tracking-tight">
                  {formatMoney(goal.savedAmount)}
                </span>
                <span className="text-xs text-inksoft">de {formatMoney(goal.targetAmount)}</span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink/10">
                <div className="grow-x h-full rounded-full gradient-brand" style={{ width: percent(progress) }} />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-inksoft">
                <span>{percent(progress)} logrado</span>
                <span>Aportas {formatMoney(goal.monthlyContribution)} al mes</span>
              </div>
              {impact ? (
                <div className="mt-4 rounded-xl bg-ink/5 p-3 text-[11px] leading-relaxed text-inksoft">
                  {impact.monthsDelayed > 0
                    ? `Si gastas ${formatMoney(amount)} hoy, esta meta avanzaría unos ${impact.monthsDelayed} meses más despacio.`
                    : `Gastar ${formatMoney(amount)} hoy no afectaría el avance de esta meta.`}
                </div>
              ) : null}
            </GlassCard>
          );
        })}
      </div>

      <GlassCard className="mt-5">
        <SectionTitle
          title="Prueba una decisión"
          aside={
            <Link to="/simulador" className="text-[11px] font-medium text-inksoft hover:text-brand">
              abrir simulador
            </Link>
          }
        />
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold tracking-tight">{formatMoney(amount)}</span>
              <span className="text-xs text-inksoft">de {formatMoney(overview.balance)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.round(overview.balance)}
              step={50}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-3 w-full accent-brand"
            />
          </div>
          <div className="rounded-2xl glass-soft p-4 sm:w-64">
            <div className="text-[11px] uppercase tracking-wider text-inksoft">Margen que te quedaría</div>
            <div className="mt-1 font-display text-2xl font-bold text-brand">
              {formatMoney(comparison.withAction.breakdown.marginForSurprises)}
            </div>
          </div>
        </div>
      </GlassCard>
    </AppShell>
  );
}
