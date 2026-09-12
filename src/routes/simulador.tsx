import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SetupGate } from "@/components/layout/SetupGate";
import { GlassCard, SectionTitle } from "@/components/ui/GlassCard";
import { RiskBar, ScenarioGrid } from "@/components/finance/ScenarioCards";
import { useOverview } from "@/hooks/useFinance";
import { compareScenarios } from "@/lib/finance/simulation";
import { formatMoney, formatShortDate, percent } from "@/lib/finance/format";
import { defaultScenarioInput, saveScenarioInput } from "@/lib/finance/scenario-input";
import { describeGoalDecisionImpact } from "@/lib/finance/goal-impact";
import { buildDecisionReason } from "@/lib/finance/decision-reason";

export const Route = createFileRoute("/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador de decisiones — OK cash" },
      {
        name: "description",
        content:
          "Plantea una compra y compara tu escenario actual, el escenario con la compra y una alternativa más holgada.",
      },
      { property: "og:title", content: "Simulador de decisiones — OK cash" },
      {
        property: "og:description",
        content: "¿Qué pasaría si compro esto hoy? Mira el resultado antes de decidir.",
      },
    ],
  }),
  component: () => (
    <SetupGate>
      <SimulatorPage />
    </SetupGate>
  ),
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
  const reason = buildDecisionReason(workingSnapshot, withPurchase);

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
              max={Math.max(1000, Math.round(overview.balance))}
              step={50}
              value={Math.min(reserve, Math.max(1000, Math.round(overview.balance)))}
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
                  <span className="text-inksoft">
                    Punto más bajo
                    {withPurchase.breakdown.minimumBalanceDate
                      ? ` · ${formatShortDate(withPurchase.breakdown.minimumBalanceDate)}`
                      : ""}
                  </span>
                  <span
                    className={`font-display font-bold ${withPurchase.breakdown.marginAtMinimum < 0 ? "text-rose" : "text-mint"}`}
                  >
                    {formatMoney(withPurchase.breakdown.minimumBalance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-inksoft">Margen sobre la reserva</span>
                  <span
                    className={`font-display font-bold ${withPurchase.breakdown.marginAtMinimum < 0 ? "text-rose" : "text-mint"}`}
                  >
                    {formatMoney(withPurchase.breakdown.marginAtMinimum)}
                  </span>
                </div>
              </div>
              <RiskBar level={withPurchase.risk} score={withPurchase.safetyScore} />
            </div>

            <div className="rounded-2xl glass-soft p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-inksoft">Por qué</div>
              <p className="mt-2 font-display text-sm font-bold">{reason.headline}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-inksoft">{reason.detail}</p>

              <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-inksoft">
                Impacto en tus metas
              </div>
              <div className="mt-2 space-y-3">
                {workingSnapshot.goals.length === 0 ? (
                  <p className="text-[11px] text-inksoft">
                    No registras metas, así que no estimamos un efecto sobre ellas.
                  </p>
                ) : null}
                {workingSnapshot.goals.map((goal) => {
                  const impact = describeGoalDecisionImpact({
                    goal,
                    amountUsed: withPurchase.breakdown.amountUsed,
                    availableToDecide: overview.availableToDecide,
                    marginAtMinimum: withPurchase.breakdown.marginAtMinimum,
                  });
                  return (
                    <div key={goal.id}>
                      <div className="flex justify-between text-[12px]">
                        <span className="font-semibold">{goal.name}</span>
                        <span className="text-inksoft">{percent(impact.progress)}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10">
                        <div
                          className="grow-x h-full rounded-full gradient-brand"
                          style={{ width: percent(impact.progress) }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-inksoft">{impact.message}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="mt-5 rounded-2xl bg-ink/5 p-4 text-sm leading-relaxed text-inksoft">
            Comparamos comprar hoy, esperar y dividir el gasto en dos partes. Dividir es solo una simulación
            hipotética: no significa que el comercio acepte pagos en partes. La decisión es tuya.
          </p>
        </GlassCard>
      </div>
    </AppShell>
  );
}
