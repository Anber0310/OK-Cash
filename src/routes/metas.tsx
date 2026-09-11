import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SetupGate } from "@/components/layout/SetupGate";
import { GlassCard, SectionTitle } from "@/components/ui/GlassCard";
import { useOverview } from "@/hooks/useFinance";
import { compareScenarios } from "@/lib/finance/simulation";
import { formatMoney, formatShortDate, percent } from "@/lib/finance/format";

export const Route = createFileRoute("/metas")({
  head: () => ({
    meta: [
      { title: "Tus metas — OK cash" },
      {
        name: "description",
        content: "Mira el avance de tus metas de ahorro y cómo una decisión de gasto podría afectarlas.",
      },
      { property: "og:title", content: "Tus metas — OK cash" },
      {
        property: "og:description",
        content: "Avance de tus metas y el efecto de cada decisión sobre ellas.",
      },
    ],
  }),
  component: () => (
    <SetupGate>
      <GoalsPage />
    </SetupGate>
  ),
});

function GoalsPage() {
  const { snapshot, overview } = useOverview();
  const [amount, setAmount] = useState(1500);

  const comparison = useMemo(
    () => compareScenarios(snapshot, { kind: "purchase", label: "Si realizo la compra", amount }),
    [snapshot, amount],
  );
  const impacts = comparison.withAction.goalImpacts;

  if (snapshot.goals.length === 0) {
    return (
      <AppShell greeting="Tus metas">
        <GlassCard>
          <SectionTitle title="Todavía no tienes metas" />
          <p className="mt-3 text-sm leading-relaxed text-inksoft">
            Cuando agregues una meta de ahorro verás aquí su avance y cómo la afectaría cada decisión.
          </p>
          <Link
            to="/configuracion"
            className="mt-5 inline-block rounded-xl gradient-brand px-4 py-2.5 text-sm font-semibold text-white shadow-brand-glow"
          >
            Agregar una meta
          </Link>
        </GlassCard>
      </AppShell>
    );
  }

  return (
    <AppShell greeting="Tus metas">
      <GlassCard className="mb-4">
        <SectionTitle
          title="Dinero apartado en metas"
          aside={
            <Link to="/mis-datos" className="text-[11px] font-medium text-inksoft hover:text-brand">
              editar mis metas
            </Link>
          }
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-inksoft">Disponible</div>
            <div className="font-display text-2xl font-bold">{formatMoney(overview.balance)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-inksoft">Apartado en metas</div>
            <div className="font-display text-2xl font-bold text-brand">
              {formatMoney(overview.goalsSetAside)}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-inksoft">Total registrado</div>
            <div className="font-display text-2xl font-bold">{formatMoney(overview.totalRegistered)}</div>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-inksoft">
          El dinero apartado en tus metas no se resta de tu dinero disponible: son dos bolsas distintas. Si
          necesitas usar parte de una meta, puedes disponer de ella desde su tarjeta.
        </p>
      </GlassCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {snapshot.goals.map((goal) => {
          const progress = goal.targetAmount > 0 ? Math.min(1, goal.savedAmount / goal.targetAmount) : 0;
          const impact = describeGoalDecisionImpact({
            goal,
            amountUsed: amount,
            availableToDecide: overview.availableToDecide,
            marginAtMinimum: comparison.withAction.breakdown.marginAtMinimum,
          });
          return (
            <GlassCard key={goal.id} interactive>
              <SectionTitle
                title={goal.name}
                aside={
                  goal.targetDate ? (
                    <span className="text-[11px] text-inksoft">{formatShortDate(goal.targetDate)}</span>
                  ) : null
                }
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
                {goal.monthlyContribution > 0 ? (
                  <span>Apartas {formatMoney(goal.monthlyContribution)} cada periodo</span>
                ) : (
                  <span>Sin aportación periódica registrada</span>
                )}
              </div>

              <div className="mt-4 rounded-xl bg-ink/5 p-3 text-[11px] leading-relaxed text-inksoft">
                <span className="font-semibold text-ink">
                  {IMPACT_TITLE[impact.level]} ({formatMoney(amount)})
                </span>
                <br />
                {impact.message}
              </div>

              {goal.savedAmount > 0 ? (
                <div className="mt-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-inksoft">
                    Disponer de dinero de esta meta
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={goal.savedAmount}
                      placeholder="Cantidad"
                      value={withdrawals[goal.id] ?? ""}
                      onChange={(e) => setWithdrawals({ ...withdrawals, [goal.id]: e.target.value })}
                      className="w-full rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-sm outline-none focus:border-brand/60"
                    />
                    <button
                      type="button"
                      onClick={() => dispose(goal.id)}
                      className="shrink-0 rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-sm font-semibold text-brand hover:bg-white"
                    >
                      Disponer
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10px] text-inksoft">
                    El dinero pasa del apartado de la meta a tu dinero disponible.
                  </p>
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
