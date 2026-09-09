import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SetupGate } from "@/components/layout/SetupGate";
import { GlassCard, Metric, SectionTitle } from "@/components/ui/GlassCard";
import { ScenarioGrid } from "@/components/finance/ScenarioCards";
import { useOverview } from "@/hooks/useFinance";
import { PRIORITY_LABEL, calendarEvents, prioritizePayments, upcomingPayments } from "@/lib/finance/analysis";
import { compareScenarios } from "@/lib/finance/simulation";
import { formatMoney, formatShortDate, percent } from "@/lib/finance/format";
import { defaultScenarioInput, saveScenarioInput } from "@/lib/finance/scenario-input";
import type { PaymentPriority, RiskLevel } from "@/lib/finance/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OK cash — Decide mejor con tu dinero" },
      {
        name: "description",
        content:
          "Simula tus decisiones de dinero antes de tomarlas: mira cuánto te quedaría, qué pagos cubrir primero y cuánto margen tendrías.",
      },
      { property: "og:title", content: "OK cash — Decide mejor con tu dinero" },
      {
        property: "og:description",
        content: "Compara escenarios y entiende las consecuencias de cada decisión financiera.",
      },
    ],
  }),
  component: () => (
    <SetupGate>
      <Dashboard />
    </SetupGate>
  ),
});

const SAFETY_TONE: Record<RiskLevel, { text: string; bar: string }> = {
  safe: { text: "text-mint", bar: "bg-gradient-to-r from-mint to-accent" },
  watch: { text: "text-amber", bar: "bg-amber" },
  tight: { text: "text-amber", bar: "bg-amber" },
  risky: { text: "text-rose", bar: "bg-rose" },
};

const PRIORITY_TONE: Record<PaymentPriority, { chip: string; text: string }> = {
  critical: { chip: "bg-rose/15", text: "text-rose" },
  important: { chip: "bg-amber/15", text: "text-amber" },
  flexible: { chip: "bg-mint/15", text: "text-mint" },
};

function Dashboard() {
  const { snapshot, overview } = useOverview();
  const [amount, setAmount] = useState(defaultScenarioInput.amount);

  const comparison = useMemo(
    () => compareScenarios(snapshot, { kind: "purchase", label: "Si realizo la compra", amount }),
    [snapshot, amount],
  );

  const payments = prioritizePayments(upcomingPayments(snapshot));
  const events = calendarEvents(snapshot).slice(0, 3);

  const total = Math.max(1, overview.balance + overview.expectedIncome);
  const committedShare = Math.max(0, Math.min(100, (overview.committed / total) * 100));
  const essentialShare = Math.max(0, Math.min(100, (overview.essentialExpenses / total) * 100));
  const reserveShare = Math.max(0, Math.min(100, (overview.reserve / total) * 100));
  const availableShare = Math.max(0, 100 - committedShare - essentialShare - reserveShare);

  return (
    <AppShell>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Saldo actual" value={formatMoney(overview.balance)} hint={`+ ${formatMoney(overview.expectedIncome)} de ingresos previstos`} />
        <Metric
          label="Para gastar"
          value={formatMoney(overview.availableToDecide)}
          hint="Tras compromisos y reserva"
          tone="brand"
        />
        <Metric
          label="Compromisos"
          value={formatMoney(overview.committed)}
          hint={`${payments.length} pagos próximos`}
        />
        <div className="rounded-2xl glass p-4 lift">
          <div className="text-[11px] font-medium uppercase tracking-wider text-inksoft">Seguridad</div>
          <div
            className={`mt-1 font-display text-[26px] font-bold tracking-tight ${SAFETY_TONE[overview.safety.level].text}`}
          >
            {overview.safety.label}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
            <div
              className={`grow-x h-full rounded-full ${SAFETY_TONE[overview.safety.level].bar}`}
              style={{ width: `${Math.max(8, overview.safety.score)}%` }}
            />
          </div>
        </div>
      </div>

      <section className="rise relative mt-5 overflow-hidden rounded-3xl glass p-6 md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-accent/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 size-40 rounded-full bg-brand/20 blur-3xl" />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center">
          <div className="lg:w-[42%]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand">
              <span className="size-1.5 rounded-full bg-accent" />
              Simulador de decisiones
            </div>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight">
              ¿Qué pasaría si
              <br />
              compras algo hoy?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-inksoft">
              Te mostramos las consecuencias de cada alternativa para que tomes una mejor decisión. Prueba sin
              tocar tu dinero real.
            </p>

            <div className="mt-5 rounded-2xl glass p-4">
              <label htmlFor="dash-amount" className="text-[11px] font-semibold uppercase tracking-wider text-inksoft">
                Costo de la compra
              </label>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold tracking-tight">{formatMoney(amount)}</span>
                <span className="text-xs text-inksoft">de {formatMoney(overview.balance)}</span>
              </div>
              <input
                id="dash-amount"
                type="range"
                min={0}
                max={Math.round(overview.balance)}
                step={50}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mt-3 w-full accent-brand"
              />
              <div className="mt-3 flex gap-2">
                <Link
                  to="/escenario"
                  onClick={() => saveScenarioInput({ amount, label: "Si realizo la compra" })}
                  className="flex-1 rounded-xl gradient-brand px-4 py-2.5 text-center text-sm font-semibold text-white shadow-brand-glow"
                >
                  Ver escenarios
                </Link>
                <Link
                  to="/simulador"
                  className="rounded-xl border border-white/70 bg-white/60 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-white"
                >
                  Ajustar
                </Link>
              </div>
            </div>
          </div>

          <ScenarioGrid comparison={comparison} />
        </div>
      </section>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GlassCard interactive>
          <SectionTitle
            title="Pagos prioritarios"
            aside={
              <Link
                to="/pagos"
                className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-semibold text-inksoft hover:bg-ink/10"
              >
                ver todos
              </Link>
            }
          />
          <div className="mt-4 space-y-3">
            {payments.length === 0 ? (
              <p className="text-[12px] text-inksoft">No tienes pagos próximos registrados.</p>
            ) : null}
            {payments.map((payment, index) => (
              <div key={payment.id} className="flex items-center gap-3">
                <div
                  className={`flex size-8 items-center justify-center rounded-lg font-display text-xs font-bold ${PRIORITY_TONE[payment.priority].chip} ${PRIORITY_TONE[payment.priority].text}`}
                >
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{payment.name}</span>
                    <span className="font-display font-bold">{formatMoney(payment.amount)}</span>
                  </div>
                  <div className="text-[11px] text-inksoft">
                    {PRIORITY_LABEL[payment.priority]} · vence {formatShortDate(payment.dueDate)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard interactive>
          <SectionTitle title="Capacidad de gasto" />
          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="font-display text-3xl font-bold tracking-tight text-brand">
                {formatMoney(overview.availableToDecide)}
              </div>
              <div className="text-[11px] text-inksoft">disponible razonable</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-inksoft">Próxima fecha</div>
              <div className="font-display text-lg font-bold">
                {overview.nextPayment ? formatShortDate(overview.nextPayment.dueDate) : "—"}
              </div>
              <div className="text-[11px] text-inksoft">
                {overview.nextPayment
                  ? `${overview.nextPayment.name} · ${formatMoney(overview.nextPayment.amount)}`
                  : "Sin pagos próximos"}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex h-3 overflow-hidden rounded-full ring-1 ring-white/60">
              <div className="bg-rose/80" style={{ width: `${committedShare}%` }} />
              <div className="bg-amber/80" style={{ width: `${essentialShare}%` }} />
              <div className="bg-mint/80" style={{ width: `${reserveShare}%` }} />
              <div className="gradient-brand" style={{ width: `${availableShare}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-rose/80" />
                Pagos
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber/80" />
                Necesario
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-mint/80" />
                Reserva
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-brand" />
                Disponible
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard interactive>
          <SectionTitle
            title="Próximas fechas"
            aside={
              <Link to="/calendario" className="text-[11px] font-medium text-inksoft hover:text-brand">
                calendario
              </Link>
            }
          />
          <div className="mt-4 space-y-3">
            {events.map((event) => (
              <div key={event.id} className="flex items-center gap-3">
                <div className="w-14 shrink-0 rounded-lg bg-white/60 px-2 py-1 text-center">
                  <div className="font-display text-xs font-bold">{formatShortDate(event.date)}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate font-semibold">{event.title}</span>
                    {event.amount !== null ? (
                      <span className="font-display text-sm font-bold">{formatMoney(event.amount)}</span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-inksoft">
                    {event.kind === "payment" ? "Pago" : event.kind === "income" ? "Ingreso" : "Meta"}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {overview.goalsProgress.map((goal) => (
              <div key={goal.id}>
                <div className="flex justify-between text-[11px] text-inksoft">
                  <span>{goal.name}</span>
                  <span className="font-semibold text-ink">{percent(goal.progress)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10">
                  <div className="grow-x h-full rounded-full gradient-brand" style={{ width: percent(goal.progress) }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
