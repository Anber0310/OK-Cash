import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard, SectionTitle } from "@/components/ui/GlassCard";
import { RISK_LABEL, RiskBar, ScenarioGrid } from "@/components/finance/ScenarioCards";
import { snapshotQueryOptions, useOverview } from "@/hooks/useFinance";
import { compareScenarios } from "@/lib/finance/simulation";
import { formatMoney, percent } from "@/lib/finance/format";
import { defaultScenarioInput, loadScenarioInput, type ScenarioInput } from "@/lib/finance/scenario-input";

export const Route = createFileRoute("/escenario")({
  loader: ({ context }) => context.queryClient.ensureQueryData(snapshotQueryOptions),
  head: () => ({
    meta: [
      { title: "Resumen del escenario — Clarity" },
      {
        name: "description",
        content:
          "Resumen de la decisión simulada: dinero restante, reserva, margen para imprevistos e impacto en tus metas.",
      },
      { property: "og:title", content: "Resumen del escenario — Clarity" },
      {
        property: "og:description",
        content: "Lo que pasaría con tu dinero si tomas esta decisión, explicado con claridad.",
      },
    ],
  }),
  component: ScenarioSummary,
});

function ScenarioSummary() {
  const { snapshot, overview } = useOverview();
  const [input, setInput] = useState<ScenarioInput>(defaultScenarioInput);

  useEffect(() => {
    setInput(loadScenarioInput());
  }, []);

  const comparison = useMemo(
    () => compareScenarios(snapshot, { kind: "purchase", label: input.label, amount: input.amount }),
    [snapshot, input],
  );

  const { current, withAction: withPurchase, alternative } = comparison;
  const marginDrop = current.breakdown.marginForSurprises - withPurchase.breakdown.marginForSurprises;

  return (
    <AppShell greeting="Resumen del escenario">
      <section className="rise relative overflow-hidden rounded-3xl glass p-6 md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-accent/25 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand">
              <span className="size-1.5 rounded-full bg-accent" />
              Decisión simulada
            </div>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight">
              Gastar {formatMoney(input.amount)} hoy
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-inksoft">{withPurchase.explanation}</p>
            <div className="mt-4 flex gap-2">
              <Link
                to="/simulador"
                className="rounded-xl gradient-brand px-4 py-2.5 text-sm font-semibold text-white shadow-brand-glow"
              >
                Cambiar la cantidad
              </Link>
              <Link
                to="/pagos"
                className="rounded-xl border border-white/70 bg-white/60 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-white"
              >
                Revisar pagos
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl glass-soft p-4">
              <div className="text-[11px] uppercase tracking-wider text-inksoft">Te quedarían</div>
              <div className="mt-1 font-display text-2xl font-bold">
                {formatMoney(withPurchase.breakdown.remaining)}
              </div>
            </div>
            <div className="rounded-2xl glass-soft p-4">
              <div className="text-[11px] uppercase tracking-wider text-inksoft">Margen imprevistos</div>
              <div
                className={`mt-1 font-display text-2xl font-bold ${withPurchase.breakdown.marginForSurprises < 0 ? "text-rose" : "text-mint"}`}
              >
                {formatMoney(withPurchase.breakdown.marginForSurprises)}
              </div>
            </div>
            <div className="rounded-2xl glass-soft p-4">
              <div className="text-[11px] uppercase tracking-wider text-inksoft">Tu reserva</div>
              <div className="mt-1 font-display text-2xl font-bold">
                {formatMoney(withPurchase.breakdown.reserve)}
              </div>
            </div>
            <div className="rounded-2xl glass-soft p-4">
              <div className="text-[11px] uppercase tracking-wider text-inksoft">Situación</div>
              <div className="mt-1 font-display text-2xl font-bold">{RISK_LABEL[withPurchase.risk]}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5">
        <ScenarioGrid comparison={comparison} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GlassCard>
          <SectionTitle title="Paso a paso" />
          <div className="mt-4 space-y-2 text-[12px]">
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
              <span className="text-inksoft">Margen para imprevistos</span>
              <span className="font-display font-bold">
                {formatMoney(withPurchase.breakdown.marginForSurprises)}
              </span>
            </div>
          </div>
          <RiskBar level={withPurchase.risk} score={withPurchase.safetyScore} />
        </GlassCard>

        <GlassCard>
          <SectionTitle title="Impacto en tus metas" />
          <div className="mt-4 space-y-3">
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
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle title="Comparación" />
          <div className="mt-4 space-y-3 text-[12px] text-inksoft">
            <p>
              Hoy tu margen para un gasto inesperado es de{" "}
              <span className="font-semibold text-ink">{formatMoney(current.breakdown.marginForSurprises)}</span>.
            </p>
            <p>
              Con esta compra bajaría{" "}
              <span className="font-semibold text-ink">{formatMoney(Math.abs(marginDrop))}</span>.
            </p>
            <p>
              {alternative.title}:{" "}
              <span className="font-semibold text-ink">
                {formatMoney(alternative.breakdown.marginForSurprises)}
              </span>{" "}
              de margen.
            </p>
            <p className="rounded-xl bg-ink/5 p-3 leading-relaxed">
              Disponible razonable para decisiones hoy: {formatMoney(overview.availableToDecide)}. Te mostramos
              las opciones; tú eliges la que te acomode.
            </p>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
