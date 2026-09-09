import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useOverview } from "@/hooks/useFinance";
import { formatLongDate, percent } from "@/lib/finance/format";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/simulador", label: "Simulador" },
  { to: "/pagos", label: "Pagos" },
  { to: "/metas", label: "Metas" },
  { to: "/calendario", label: "Calendario" },
] as const;

function GoalMiniProgress() {
  const { overview } = useOverview();
  if (overview.goalsProgress.length === 0) return <div className="mt-auto" />;
  return (
    <div className="mt-auto hidden rounded-2xl glass-soft p-4 md:block">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-inksoft">
        Progreso de metas
      </div>
      <div className="mt-3 space-y-3">
        {overview.goalsProgress.map((goal, i) => (
          <div key={goal.id}>
            <div className="flex justify-between text-[11px] text-inksoft">
              <span className="truncate pr-2">{goal.name}</span>
              <span className="font-semibold text-ink">{percent(goal.progress)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10">
              <div
                className={`grow-x h-full rounded-full ${i === 0 ? "gradient-brand" : "bg-mint"}`}
                style={{ width: percent(goal.progress) }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppShell({ children, greeting }: { children: ReactNode; greeting?: string }) {
  const { snapshot } = useOverview();

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-ink">
      <div className="pointer-events-none absolute -left-24 -top-24 size-[420px] rounded-full bg-accent/30 blur-3xl floaty" />
      <div className="pointer-events-none absolute -right-24 top-1/3 size-[480px] rounded-full bg-brand/25 blur-3xl floaty-slow" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 size-[360px] rounded-full bg-mint/20 blur-3xl floaty" />

      <div className="relative mx-auto flex max-w-[1400px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-white/60 bg-white/40 p-6 backdrop-blur-2xl md:flex">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl gradient-brand font-display text-[13px] font-bold text-white shadow-brand-glow ring-1 ring-white/60">
              OK
            </div>
            <div>
              <div className="font-display text-[15px] font-bold leading-none tracking-tight">
                OK<span className="text-brand"> cash</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-inksoft">Tus decisiones</div>
            </div>
          </Link>

          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-inksoft transition-colors hover:bg-white/50"
                activeProps={{
                  className:
                    "rounded-xl bg-white/70 px-3.5 py-2.5 text-sm font-semibold text-brand shadow-sm ring-1 ring-white/70",
                }}
              >
                <span className="mr-2">◇</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <GoalMiniProgress />
        </aside>

        <main className="min-h-screen flex-1 p-5 md:p-8">
          <div className="mb-7 flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inksoft">
                {formatLongDate(snapshot.asOf)}
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {greeting ?? `Hola, ${snapshot.user.firstName}`}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/configuracion"
                className="hidden rounded-full glass px-4 py-2 text-xs font-medium text-inksoft transition-colors hover:text-brand sm:block"
              >
                Editar mis datos
              </Link>
              <div className="grid size-10 place-items-center rounded-full gradient-brand font-display text-sm font-bold text-white ring-2 ring-white/70">
                {snapshot.user.initials}
              </div>
            </div>
          </div>

          <nav className="mb-5 flex gap-1.5 overflow-x-auto pb-1 md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="shrink-0 rounded-full glass px-3.5 py-1.5 text-xs font-medium text-inksoft"
                activeProps={{
                  className:
                    "shrink-0 rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-brand ring-1 ring-white/70",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {children}
        </main>
      </div>
    </div>
  );
}
