import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/layout/AppShell";
import { SetupGate } from "@/components/layout/SetupGate";
import { GlassCard, SectionTitle } from "@/components/ui/GlassCard";
import { formatMoney, formatShortDate } from "@/lib/finance/format";
import { getNessieRaw } from "@/lib/nessie.functions";
import {
  buildImportSuggestion,
  normalizeRawRecords,
  type NormalizedTransaction,
} from "@/lib/finance/nessie-normalize";
import type { NessieRawPayload } from "@/lib/nessie.server";
import { useUserData } from "@/hooks/useFinance";
import { updateUserData } from "@/lib/finance/user-data";

export const Route = createFileRoute("/transacciones")({
  head: () => ({
    meta: [
      { title: "Datos de origen — OK cash" },
      {
        name: "description",
        content:
          "Mira los movimientos originales del banco de pruebas y cómo OK cash los normaliza antes de analizarlos.",
      },
      { property: "og:title", content: "Datos de origen — OK cash" },
      {
        property: "og:description",
        content: "Dato original, transformación y análisis financiero: el recorrido completo de la información.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <SetupGate>
      <SourceDataPage />
    </SetupGate>
  ),
});

const ORIGIN_LABEL: Record<NormalizedTransaction["origin"], string> = {
  purchase: "Compra",
  deposit: "Depósito",
  withdrawal: "Retiro",
  bill: "Recibo",
};

function SourceDataPage() {
  const { data: userData } = useUserData();
  const load = useServerFn(getNessieRaw);
  const [payload, setPayload] = useState<NessieRawPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const result = await load({ data: {} });
      setPayload(result);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const normalized = payload ? normalizeRawRecords(payload.records) : [];
  const suggestion = payload ? buildImportSuggestion(payload.accounts, normalized) : null;

  const applyImport = () => {
    if (!suggestion || !userData) return;
    updateUserData({
      availableMoney: suggestion.availableMoney > 0 ? suggestion.availableMoney : userData.availableMoney,
      incomes: [...userData.incomes, ...suggestion.incomes],
      payments: [...userData.payments, ...suggestion.payments],
    });
    setImported(
      `Se agregaron ${suggestion.incomes.length} ingresos y ${suggestion.payments.length} pagos a tus datos.`,
    );
  };

  return (
    <AppShell greeting="Datos de origen">
      <GlassCard>
        <SectionTitle
          title="De dónde vienen los datos"
          aside={
            <Link to="/mis-datos" className="text-[11px] font-medium text-inksoft hover:text-brand">
              editar mis datos
            </Link>
          }
        />
        <p className="mt-3 text-sm leading-relaxed text-inksoft">
          OK cash puede leer movimientos de un banco de pruebas de Capital One. Los movimientos originales se
          conservan tal como llegan; después se normalizan y solo entonces entran al análisis financiero.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-inksoft">
          <span className="rounded-full bg-ink/5 px-2.5 py-1">Movimiento original</span>
          <span>→</span>
          <span className="rounded-full bg-ink/5 px-2.5 py-1">Normalización</span>
          <span>→</span>
          <span className="rounded-full bg-ink/5 px-2.5 py-1">Tus datos</span>
          <span>→</span>
          <span className="rounded-full bg-brand/10 px-2.5 py-1 text-brand">Simulación</span>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={fetchData} className="rounded-xl gradient-brand px-4 py-2.5 text-sm font-semibold text-white shadow-brand-glow">
            {loading ? "Consultando…" : "Traer movimientos del banco de pruebas"}
          </button>
          {payload ? (
            <span className="text-[11px] text-inksoft">
              {payload.accounts.length} cuentas · {payload.records.length} movimientos originales
            </span>
          ) : null}
        </div>

        {failed ? (
          <p className="mt-3 text-[12px] text-rose">
            No se pudo consultar el banco de pruebas. Tus datos manuales siguen funcionando igual.
          </p>
        ) : null}
        {payload && !payload.configured ? (
          <p className="mt-3 rounded-xl bg-ink/5 p-3 text-[12px] leading-relaxed text-inksoft">
            Falta configurar el acceso al banco de pruebas de Capital One. Mientras no esté disponible, OK cash
            funciona con los datos que tú registras: nada se rompe.
          </p>
        ) : null}
        {payload?.error ? (
          <p className="mt-3 rounded-xl bg-ink/5 p-3 text-[12px] leading-relaxed text-inksoft">
            El banco de pruebas no respondió correctamente. Puedes seguir con tus datos manuales.
          </p>
        ) : null}
      </GlassCard>

      {payload && payload.accounts.length > 0 ? (
        <GlassCard className="mt-4">
          <SectionTitle title="Cuentas de origen" />
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {payload.accounts.map((account) => (
              <div key={account.id} className="rounded-2xl glass-soft p-4">
                <div className="text-[11px] uppercase tracking-wider text-inksoft">
                  {account.type ?? "Cuenta"} {account.maskedNumber}
                </div>
                <div className="font-display text-xl font-bold">{formatMoney(account.balance ?? 0)}</div>
                <div className="text-[11px] text-inksoft">{account.nickname ?? "Sin nombre"}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-inksoft">
            Nunca guardamos ni mostramos números de cuenta completos, y OK cash jamás te pide claves bancarias.
          </p>
        </GlassCard>
      ) : null}

      {payload && payload.records.length > 0 ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <GlassCard>
            <SectionTitle title="Movimientos originales (sin tocar)" />
            <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {payload.records.map((record) => (
                <div key={`${record.source}_${record.id}`} className="rounded-xl bg-ink/5 p-3 text-[11px]">
                  <div className="flex justify-between font-semibold text-ink">
                    <span className="truncate pr-2">{record.description}</span>
                    <span>{record.amount === null ? "sin monto" : formatMoney(record.amount)}</span>
                  </div>
                  <div className="mt-1 text-inksoft">
                    tipo: {record.source} · fecha: {record.date ?? "sin fecha"} · estado: {record.status ?? "—"} ·
                    medio: {record.medium ?? "—"}
                  </div>
                  <div className="text-inksoft">id: {record.id || "—"}</div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <SectionTitle title="Movimientos ya interpretados" />
            <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {normalized.length === 0 ? (
                <p className="text-[12px] text-inksoft">
                  Ningún movimiento tenía fecha y monto utilizables, así que no interpretamos nada.
                </p>
              ) : null}
              {normalized.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded-xl bg-white/60 p-3 text-[11px]">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{tx.description}</div>
                    <div className="text-inksoft">
                      {formatShortDate(tx.date)} · {ORIGIN_LABEL[tx.origin]} ·{" "}
                      {tx.direction === "in" ? "entra dinero" : "sale dinero"}
                    </div>
                  </div>
                  <div className={`font-display font-bold ${tx.direction === "in" ? "text-mint" : "text-ink"}`}>
                    {formatMoney(tx.amount)}
                  </div>
                </div>
              ))}
            </div>

            {suggestion ? (
              <div className="mt-4 rounded-xl bg-ink/5 p-3 text-[11px] leading-relaxed text-inksoft">
                De estos movimientos, {suggestion.incomes.length} son ingresos con fecha futura y{" "}
                {suggestion.payments.length} son pagos por venir. {suggestion.pastCount} ya ocurrieron, así que
                solo sirven de contexto y no entran a la simulación.
                <button
                  type="button"
                  onClick={applyImport}
                  disabled={suggestion.incomes.length + suggestion.payments.length === 0}
                  className="mt-3 block w-full rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-center text-[12px] font-semibold text-brand hover:bg-white disabled:opacity-50"
                >
                  Usar estos movimientos en mis datos
                </button>
                {imported ? <span className="mt-2 block font-semibold text-brand">{imported}</span> : null}
              </div>
            ) : null}
          </GlassCard>
        </div>
      ) : null}
    </AppShell>
  );
}
