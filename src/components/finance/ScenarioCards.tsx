import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/finance/format";
import type { RiskLevel, Scenario, ScenarioComparison } from "@/lib/finance/types";

export const RISK_LABEL: Record<RiskLevel, string> = {
  safe: "Holgada",
  watch: "Con cuidado",
  tight: "Muy ajustada",
  risky: "En riesgo",
};

const RISK_TEXT: Record<RiskLevel, string> = {
  safe: "text-mint",
  watch: "text-amber",
  tight: "text-amber",
  risky: "text-rose",
};

const RISK_BAR: Record<RiskLevel, string> = {
  safe: "bg-mint",
  watch: "bg-amber",
  tight: "bg-amber",
  risky: "bg-rose",
};

export function RiskBar({ level, score }: { level: RiskLevel; score: number }) {
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-inksoft">
        <span>Nivel de seguridad</span>
        <span className={RISK_TEXT[level]}>{RISK_LABEL[level]}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/10">
        <div
          className={cn("grow-x h-full rounded-full", RISK_BAR[level])}
          style={{ width: `${Math.max(6, score)}%` }}
        />
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="opacity-70">{label}</span>
      <span className={cn("font-semibold", tone)}>{value}</span>
    </div>
  );
}

export function ScenarioCard({
  scenario,
  highlighted,
  safest,
}: {
  scenario: Scenario;
  highlighted?: boolean;
  safest?: boolean;
}) {
  const b = scenario.breakdown;

  if (highlighted) {
    return (
      <div className="relative rounded-2xl gradient-brand p-4 text-white shadow-brand-glow ring-1 ring-white/40 lift">
        <div className="text-[10px] font-bold uppercase tracking-wider text-white/80">{scenario.title}</div>
        <div className="mt-2 font-display text-xl font-bold">{formatMoney(b.remaining)}</div>
        <div className="text-[11px] text-white/80">te quedarían</div>
        <div className="mt-3 space-y-2">
          <Row label="Dinero utilizado" value={formatMoney(b.amountUsed)} />
          <Row label="Reserva" value={formatMoney(b.reserve)} />
          <Row label="Margen imprevistos" value={formatMoney(b.marginForSurprises)} />
        </div>
        <div className="mt-3 rounded-lg bg-white/15 px-2.5 py-1.5 text-[10px] font-medium leading-tight">
          {scenario.explanation}
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl glass p-4 lift">
      {safest ? (
        <span className="absolute -top-2.5 right-3 rounded-full bg-mint px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink">
          Más holgura
        </span>
      ) : null}
      <div className={cn("text-[10px] font-bold uppercase tracking-wider", safest ? "text-mint" : "text-inksoft")}>
        {scenario.title}
      </div>
      <div className={cn("mt-2 font-display text-xl font-bold", safest && "text-mint")}>
        {formatMoney(b.remaining)}
      </div>
      <div className="text-[11px] text-inksoft">te quedarían</div>
      <div className="mt-3 space-y-2 text-inksoft">
        <Row label="Dinero utilizado" value={formatMoney(b.amountUsed)} tone="text-ink" />
        <Row label="Reserva" value={formatMoney(b.reserve)} tone="text-ink" />
        <Row
          label="Margen imprevistos"
          value={formatMoney(b.marginForSurprises)}
          tone={b.marginForSurprises < 0 ? "text-rose" : "text-mint"}
        />
      </div>
      <div className="mt-3 rounded-lg bg-ink/5 px-2.5 py-1.5 text-[10px] font-medium leading-tight text-inksoft">
        {scenario.explanation}
      </div>
    </div>
  );
}

export function ScenarioGrid({ comparison }: { comparison: ScenarioComparison }) {
  return (
    <div className="grid flex-1 gap-3 sm:grid-cols-3">
      {comparison.scenarios.map((scenario, index) => (
        <ScenarioCard
          key={scenario.id}
          scenario={scenario}
          highlighted={index === 1}
          safest={index === 2 && scenario.id === comparison.safestScenarioId}
        />
      ))}
    </div>
  );
}
