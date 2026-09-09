import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard, SectionTitle } from "@/components/ui/GlassCard";
import { RiskBar, ScenarioGrid } from "@/components/finance/ScenarioCards";
import { snapshotQueryOptions, useOverview } from "@/hooks/useFinance";
import { compareScenarios } from "@/lib/finance/simulation";
import { formatMoney, percent } from "@/lib/finance/format";
import { defaultScenarioInput, saveScenarioInput } from "@/lib/finance/scenario-input";

export const Route = createFileRoute("/simulador")({
  loader: ({ context }) => context.queryClient.ensureQueryData(snapshotQueryOptions),
  head: () => ({
    meta: [
      { title: "Simulador de decisiones — Clarity" },
      {
        name: "description",
        content:
          "Plantea una compra y compara tu escenario actual, el escenario con la compra y una alternativa más holgada.",
      },
      { property: "og:title", content: "Simulador de decisiones — Clarity" },
      {
        property: "og:description",
        content: "¿Qué pasaría si compro esto hoy? Mira el resultado antes de decidir.",
      },
    ],
  }),
  component: SimulatorPage,
});

const QUICK_AMOUNTS = [500, 1000, 1500, 2500];

function SimulatorPage() {
  const { snapshot, overview } = useOverview();
  const [amount, setAmount] = useState(defaultScenarioInput.amount);
  const [reserve, setReserve] = useState(snapshot.user.minimumReserve);

  const workingSnapshot = useMemo(
    () => ({ ...snapshot, user: { ...snapshot.user, minimumReserve: reserve } }),
    [snapshot, reserve],
  );

  const comparison = useMemo(
    () => compareScenarios(workingSnapshot, { kind: "purchase", label: "Si realizo la compra", amount }),
    [workingSnapshot, amount],
  );

  const withPurchase = comparison.withAction;

  return (
    <AppShell greeting="Simulador de decisiones">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-1">
          <SectionTitle title="Tu decisión" />
          <div className="mt-4">
            <label htmlFor="amount" className="text-[11px] font-semibold uppercase tracking-wider text-inksoft">
              Costo de la compra
            </label>
            <div className="mt-2 flex items-center rounded-xl border border-white/70 bg-white/60 px-3">
              <span className="font-display text-lg text-inksoft">$</span>
              <input
                id="amount"
                type="number"
                min={0}
                step={50}
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                className="w-full bg-transparent px-2 py-3 font-display text-2xl font-bold tracking-tight outline-none"
              />
            </div>
            <input
              type="range"
              min={0}
              max={Math.round(overview.balance)}
              step={50}
              value={Math.min(amount, overview.balance)}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-3 w-full accent-brand"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(value)}
                  className="rounded-full border border-white/70 bg-white/60 px-3 py-1 text-xs font-semibold text-inksoft transition-colors hover:bg-white hover:text-brand"
                >
                  {formatMoney(value)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor="reserve" className="text-[11px] font-semibold uppercase tracking-wider text-inksoft">
              Reserva mínima que quieres conservar
            </label>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold tracking-tight">{formatMoney(reserve)}</span>
            </div>
            <input
              id="reserve"
              type="range"
              min={0}
              max={3000}
              step={100}
              value={reserve}
              onChange={(e) => setReserve(Number(e.target.value))}
              className="mt-2 w-full accent-brand"
            />
          </div>

          <Link
            to="/escenario"
            onClick={() => saveScenarioInput({ amount, label: "Si realizo la compra" })}
            className="mt-6 block rounded-xl gradient-brand px-4 py-3 text-center text-sm font-semibold text-white shadow-brand-glow"
          >
            Ver resumen del escenario
          </Link>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <SectionTitle
            title="Cómo cambiaría tu situación"
            aside={<span className="text-[11px] text-inksoft">próximos {overview.horizonDays} días</span>}
          />
          <div className="mt-4">
            <ScenarioGrid comparison={comparison} />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl glass-soft p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-inksoft">
                Desglose si realizas la compra
              </div>
              <div className="mt-3 space-y-2 text-[12px]">
                {[
                  ["Saldo inicial", withPurchase.breakdown.startingBalance],
              ["Ingresos previstos", withPurchase.breakdown.expectedIncome],
                  ["Ingresos previstos", withPurchase.breakdown.expectedIncome],
                  ["Dinero utilizado", -withPurchase.breakdown.amountUsed],
                  ["Pagos próximos", -withPurchase.breakdown.upcomingPayments],
                  ["Gastos necesarios", -withPurchase.breakdown.essentialExpenses],
                  ["Reserva", -withPurchase.breakdown.reserve],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between">
                    <span className="text-inksoft">{label}</span>
                    <span className="font-display font-semibold">
                      {(value as number) < 0 ? "−" : ""}
                      {formatMoney(Math.abs(value as number))}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-white/70 pt-2">
                  <span className="text-inksoft">Margen para imprevistos</span>
                  <span
                    className={`font-display font-bold ${withPurchase.breakdown.marginForSurprises < 0 ? "text-rose" : "text-mint"}`}
                  >
                    {formatMoney(withPurchase.breakdown.marginForSurprises)}
                  </span>
                </div>
              </div>
              <RiskBar level={withPurchase.risk} score={withPurchase.safetyScore} />
            </div>

            <div className="rounded-2xl glass-soft p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-inksoft">
                Impacto en tus metas
              </div>
              <div className="mt-3 space-y-3">
                {withPurchase.goalImpacts.map((impact) => (
                  <div key={impact.goalId}>
                    <div className="flex justify-between text-[12px]">
                      <span className="font-semibold">{impact.goalName}</span>
                      <span className="text-inksoft">
                        {percent(impact.progressBefore)} → {percent(impact.progressAfter)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10">
                      <div
                        className="grow-x h-full rounded-full gradient-brand"
                        style={{ width: percent(impact.progressAfter) }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-inksoft">
                      {impact.monthsDelayed > 0
                        ? `Avanzaría unos ${impact.monthsDelayed} meses más despacio.`
                        : "Esta decisión no afectaría su avance."}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-5 rounded-2xl bg-ink/5 p-4 text-sm leading-relaxed text-inksoft">
            Te mostramos qué podría pasar para que puedas comparar. La decisión es tuya.
          </p>
        </GlassCard>
      </div>
    </AppShell>
  );
}
