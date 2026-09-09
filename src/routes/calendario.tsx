import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard, SectionTitle } from "@/components/ui/GlassCard";
import { snapshotQueryOptions, useOverview } from "@/hooks/useFinance";
import { calendarEvents } from "@/lib/finance/analysis";
import { formatMoney, formatShortDate } from "@/lib/finance/format";

export const Route = createFileRoute("/calendario")({
  loader: ({ context }) => context.queryClient.ensureQueryData(snapshotQueryOptions),
  head: () => ({
    meta: [
      { title: "Calendario de tu dinero — Clarity" },
      {
        name: "description",
        content: "Fechas de pagos, gastos importantes y metas en una vista mensual clara y fácil de leer.",
      },
      { property: "og:title", content: "Calendario de tu dinero — Clarity" },
      {
        property: "og:description",
        content: "Todas tus fechas importantes de dinero en un solo lugar.",
      },
    ],
  }),
  component: CalendarPage,
});

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

function CalendarPage() {
  const { snapshot } = useOverview();
  const events = calendarEvents(snapshot);

  const today = new Date(snapshot.asOf);
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthName = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(today);

  const firstDay = new Date(year, month, 1);
  const leading = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const eventsByDay = new Map<number, typeof events>();
  for (const event of events) {
    const d = new Date(event.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const list = eventsByDay.get(d.getDate()) ?? [];
      list.push(event);
      eventsByDay.set(d.getDate(), list);
    }
  }

  const dotClass = (kind: string, priority: string | null) => {
    if (kind === "goal") return "bg-brand";
    if (priority === "critical") return "bg-rose";
    if (priority === "important") return "bg-amber";
    return "bg-mint";
  };

  return (
    <AppShell greeting="Calendario de tu dinero">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <GlassCard className="lg:col-span-3">
          <SectionTitle
            title="Este mes"
            aside={<span className="text-[11px] capitalize text-inksoft">{monthName}</span>}
          />
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-inksoft">
            {WEEKDAYS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1.5 text-center text-[11px]">
            {Array.from({ length: leading }).map((_, i) => (
              <div key={`lead-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = eventsByDay.get(day) ?? [];
              const isToday = day === today.getDate();
              return (
                <div
                  key={day}
                  className={`relative grid aspect-square place-items-center rounded-lg ${
                    isToday
                      ? "bg-white/80 font-bold text-ink ring-1 ring-white/70"
                      : dayEvents.length > 0
                        ? "bg-white/50 font-semibold text-ink"
                        : "text-inksoft"
                  }`}
                >
                  {day}
                  {dayEvents.length > 0 ? (
                    <div className="absolute bottom-1 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span
                          key={event.id}
                          className={`size-1.5 rounded-full ${dotClass(event.kind, event.priority)}`}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-inksoft">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-rose" />
              Imprescindible
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber" />
              Necesario
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-mint" />
              Puede esperar
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-brand" />
              Meta
            </span>
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <SectionTitle title="Próximas fechas importantes" />
          <div className="mt-4 space-y-3">
            {events.map((event) => (
              <div key={event.id} className="flex items-center gap-3 rounded-xl glass-soft p-3">
                <div className="w-14 shrink-0 text-center">
                  <div className="font-display text-xs font-bold">{formatShortDate(event.date)}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{event.title}</span>
                    {event.amount !== null ? (
                      <span className="font-display text-sm font-bold">{formatMoney(event.amount)}</span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-inksoft">
                    {event.kind === "payment" ? "Pago" : "Meta de ahorro"}
                  </div>
                </div>
                <span className={`size-2 shrink-0 rounded-full ${dotClass(event.kind, event.priority)}`} />
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
