import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/layout/AppShell";
import { SetupGate } from "@/components/layout/SetupGate";
import { GlassCard, Metric, SectionTitle } from "@/components/ui/GlassCard";
import { fetchNessieRawTransactions } from "@/lib/nessie.functions";
import { calculateIncome, normalizeTransactions, toModelInputs } from "@/lib/finance/normalize";
import { formatMoney, formatShortDate } from "@/lib/finance/format";
import { getUserData, updateUserData } from "@/lib/finance/user-data";
import { useUserData } from "@/hooks/useFinance";

export const Route = createFileRoute("/datos-origen")({
  head: () => ({
    meta: [
      { title: "Datos de origen — OK cash" },
      {
        name: "description",
        content:
          "Consulta los movimientos tal como llegaron de la fuente de datos y cómo OK cash los interpreta antes de simular una decisión.",
      },
      { property: "og:title", content: "Datos de origen — OK cash" },
      {
        property: "og:description",
        content: "Movimientos originales, interpretación y modelo financiero, paso por paso.",
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

function SourceDataPage() {
  useUserData();
  const load = useServerFn(fetchNessieRawTransactions);
  const [imported, setImported] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["nessie-raw"],
    queryFn: () => load({}),
    staleTime: 60_000,
  });

  const asOf = new Date().toISOString();
  const normalized = useMemo(
    () => normalizeTransactions(data?.transactions ?? [], asOf),
    [data?.transactions, asOf],
  );
  const model = useMemo(() => toModelInputs(normalized, asOf), [normalized, asOf]);
  const detectedIncome = calculateIncome(normalized, { onlyUpcoming: true, asOf });

  const importToProfile = () => {
    const current = getUserData();
    if (!current) return;
    updateUserData({
      incomes: [...current.incomes, ...model.incomes],
      payments: [...current.payments, ...model.payments],
    });
    setImported(
      `Se agregaron ${model.incomes.length} ingresos y ${model.payments.length} pagos a tu perfil actual.`,
    );
  };

  return (
    <AppShell greeting="Datos de origen">
      <p className="max-w-2xl text-sm leading-relaxed text-inksoft">
        Aquí puedes ver los movimientos tal como llegaron de la fuente de datos y cómo OK cash los interpreta.
        Esta sección es un apoyo: la aplicación funciona completa con los datos que tú registras.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Metric label="Movimientos recibidos" value={`${data?.transactions.length ?? 0}`} hint="Sin interpretar" />
        <Metric
          label="Ingresos detectados"
          value={formatMoney(detectedIncome)}
          hint="Solo entradas de dinero por venir"
          tone="brand"
        />
        <Metric
          label="Sin clasificar"
          value={`${model.unclassified.length}`}
          hint="No entran al modelo: falta información"
        />
      </div>

      <GlassCard className="mt-4">
        <SectionTitle
          title="Conexión con la fuente de datos"
          aside={
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-full bg-ink/5 px-2.5 py-0.5 text-[10px] font-semibold text-inksoft hover:bg-ink/10"
            >
              {isFetching ? "consultando…" : "volver a consultar"}
            </button>
          }
        />
        <p className="mt-3 text-[12px] leading-relaxed text-inksoft">
          {isLoading ? "Consultando la fuente de datos…" : (data?.message ?? "Sin información todavía.")}
        </p>
        {data?.status === "not-configured" ? (
          <p className="mt-2 text-[12px] leading-relaxed text-inksoft">
            Cuando la conexión esté disponible, los movimientos aparecerán aquí automáticamente. Mientras tanto,
            captura o edita tus datos en “Mis datos”.
          </p>
        ) : null}
      </GlassCard>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle title="Movimientos originales" />
          <div className="mt-4 space-y-2">
            {(data?.transactions.length ?? 0) === 0 ? (
              <p className="text-[12px] text-inksoft">No hay movimientos recibidos.</p>
            ) : null}
            {(data?.transactions ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl glass-soft px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold">{t.description}</div>
                  <div className="text-[11px] text-inksoft">
                    {t.date ? formatShortDate(t.date) : "sin fecha"} · {t.sourceType}
                  </div>
                </div>
                <div className={`font-display text-sm font-bold ${t.amount >= 0 ? "text-mint" : "text-ink"}`}>
                  {formatMoney(t.amount)}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle title="Cómo se interpretan" />
          <p className="mt-2 text-[11px] uppercase tracking-wider text-inksoft">
            Datos originales → interpretación → modelo financiero
          </p>
          <div className="mt-4 space-y-2">
            {normalized.length === 0 ? (
              <p className="text-[12px] text-inksoft">Cuando lleguen movimientos, aquí verás su interpretación.</p>
            ) : null}
            {normalized.map((n) => (
              <div key={n.raw.id} className="rounded-xl glass-soft px-3 py-2">
                <div className="flex justify-between text-[13px]">
                  <span className="truncate pr-2 font-semibold">{n.raw.description}</span>
                  <span className="font-display font-bold">
                    {n.kind === "income"
                      ? "Ingreso"
                      : n.kind === "payment"
                        ? "Pago"
                        : n.kind === "expense"
                          ? "Gasto"
                          : "Sin clasificar"}
                  </span>
                </div>
                <div className="text-[11px] text-inksoft">{n.reason}</div>
              </div>
            ))}
          </div>
          {model.incomes.length + model.payments.length > 0 ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={importToProfile}
                className="w-full rounded-xl gradient-brand px-4 py-2.5 text-sm font-semibold text-white shadow-brand-glow"
              >
                Agregar a mi perfil ({model.incomes.length} ingresos, {model.payments.length} pagos)
              </button>
              {imported ? <p className="mt-2 text-[11px] text-brand">{imported}</p> : null}
            </div>
          ) : null}
        </GlassCard>
      </div>
    </AppShell>
  );
}
