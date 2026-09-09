import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SetupGate } from "@/components/layout/SetupGate";
import { GlassCard, SectionTitle } from "@/components/ui/GlassCard";
import { useOverview } from "@/hooks/useFinance";
import {
  PRIORITY_LABEL,
  paymentPlanOptions,
  prioritizePayments,
  upcomingPayments,
} from "@/lib/finance/analysis";
import { daysUntil, formatMoney, formatShortDate } from "@/lib/finance/format";
import type { PaymentPriority } from "@/lib/finance/types";

export const Route = createFileRoute("/pagos")({
  head: () => ({
    meta: [
      { title: "Pagos y prioridades — OK cash" },
      {
        name: "description",
        content:
          "Ve tus pagos pendientes ordenados por importancia, qué podría esperar y cuánto dinero te quedaría con cada combinación.",
      },
      { property: "og:title", content: "Pagos y prioridades — OK cash" },
      {
        property: "og:description",
        content: "Orden recomendado de pagos y dinero restante con cada alternativa.",
      },
    ],
  }),
  component: () => (
    <SetupGate>
      <PaymentsPage />
    </SetupGate>
  ),
});

const TONE: Record<PaymentPriority, string> = {
  critical: "bg-rose/15 text-rose",
  important: "bg-amber/15 text-amber",
  flexible: "bg-mint/15 text-mint",
};

function PaymentsPage() {
  const { snapshot, overview } = useOverview();
  const payments = prioritizePayments(upcomingPayments(snapshot));
  const options = paymentPlanOptions(payments, overview.balance);
  const [selected, setSelected] = useState(options[0]?.id ?? "all");
  const activeOption = options.find((o) => o.id === selected) ?? options[0];

  return (
    <AppShell greeting="Pagos y prioridades">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <GlassCard className="lg:col-span-3">
          <SectionTitle
            title="Orden recomendado"
            aside={<span className="text-[11px] text-inksoft">próximos {overview.horizonDays} días</span>}
          />
          <div className="mt-4 space-y-3">
            {payments.length === 0 ? (
              <p className="text-[12px] text-inksoft">
                Todavía no registras pagos. Agrégalos en “Editar mis datos”.
              </p>
            ) : null}
            {payments.map((payment, index) => {
              const days = daysUntil(payment.dueDate, snapshot.asOf);
              return (
                <div key={payment.id} className="rounded-2xl glass-soft p-4 lift">
                  <div className="flex items-center gap-3">
                    <div
                      className={`grid size-9 shrink-0 place-items-center rounded-lg font-display text-sm font-bold ${TONE[payment.priority]}`}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{payment.name}</span>
                        <span className="font-display text-sm font-bold">{formatMoney(payment.amount)}</span>
                      </div>
                      <div className="text-[11px] text-inksoft">
                        {PRIORITY_LABEL[payment.priority]} · vence {formatShortDate(payment.dueDate)} ·{" "}
                        {days === 0 ? "hoy" : `en ${days} días`}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg bg-ink/5 px-3 py-2 text-[11px] leading-relaxed text-inksoft">
                    {payment.consequence
                      ? `${payment.consequence}${payment.consequenceSource ? ` · Fuente: ${payment.consequenceSource}` : ""}`
                      : "Aún no tenemos información sobre qué pasa si este pago se retrasa."}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <div className="space-y-4 lg:col-span-2">
          <GlassCard>
            <SectionTitle title="Combinaciones posibles" />
            <div className="mt-4 space-y-2">
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelected(option.id)}
                  className={`w-full rounded-xl px-4 py-3 text-left transition-colors ${
                    option.id === selected
                      ? "gradient-brand text-white shadow-brand-glow"
                      : "border border-white/70 bg-white/60 text-ink hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>{option.title}</span>
                    <span className="font-display">{formatMoney(option.total)}</span>
                  </div>
                  <div className={`text-[11px] ${option.id === selected ? "text-white/80" : "text-inksoft"}`}>
                    Te quedarían {formatMoney(option.remainingAfter)}
                  </div>
                </button>
              ))}
            </div>
          </GlassCard>

          {activeOption ? (
            <GlassCard>
              <SectionTitle title="Con esta alternativa" />
              <div className="mt-4 space-y-2 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-inksoft">Saldo actual</span>
                  <span className="font-display font-semibold">{formatMoney(overview.balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-inksoft">Pagos cubiertos</span>
                  <span className="font-display font-semibold">−{formatMoney(activeOption.total)}</span>
                </div>
                <div className="flex justify-between border-t border-white/70 pt-2">
                  <span className="text-inksoft">Dinero restante</span>
                  <span className="font-display font-bold text-brand">
                    {formatMoney(activeOption.remainingAfter)}
                  </span>
                </div>
              </div>
              <div className="mt-4 text-[11px] leading-relaxed text-inksoft">
                {activeOption.coversCritical
                  ? "Cubre todo lo imprescindible."
                  : "Deja pendiente al menos un pago imprescindible."}
              </div>
              {activeOption.deferred.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-inksoft">
                    Quedarían pendientes
                  </div>
                  {activeOption.deferred.map((payment) => (
                    <div key={payment.id} className="flex justify-between text-[12px]">
                      <span>{payment.name}</span>
                      <span className="font-display font-semibold">{formatMoney(payment.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </GlassCard>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
