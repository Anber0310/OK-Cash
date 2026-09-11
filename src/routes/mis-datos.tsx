import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SetupGate } from "@/components/layout/SetupGate";
import { GlassCard, SectionTitle } from "@/components/ui/GlassCard";
import { PRIORITY_LABEL } from "@/lib/finance/analysis";
import { formatMoney, formatShortDate, parseDate } from "@/lib/finance/format";
import { useUserData } from "@/hooks/useFinance";
import {
  makeId,
  updateUserData,
  withdrawFromGoal,
  type UserFinancialData,
  type UserGoalInput,
  type UserIncomeInput,
  type UserPaymentInput,
} from "@/lib/finance/user-data";
import type { PaymentPriority } from "@/lib/finance/types";

export const Route = createFileRoute("/mis-datos")({
  head: () => ({
    meta: [
      { title: "Editar mis datos — OK cash" },
      {
        name: "description",
        content:
          "Cambia tu dinero disponible, tu reserva, tus ingresos, tus pagos y tus metas por separado, sin repetir toda la configuración.",
      },
      { property: "og:title", content: "Editar mis datos — OK cash" },
      {
        property: "og:description",
        content: "Edita, agrega o elimina cada dato de OK cash cuando lo necesites.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <SetupGate>
      <DataEditor />
    </SetupGate>
  ),
});

const PRIORITIES: PaymentPriority[] = ["critical", "important", "flexible"];

const inputClass =
  "w-full rounded-xl border border-white/70 bg-white/70 px-3 py-2.5 text-sm outline-none focus:border-brand/60";
const labelClass = "text-[11px] font-semibold uppercase tracking-wider text-inksoft";
const primaryBtn =
  "rounded-xl gradient-brand px-4 py-2.5 text-sm font-semibold text-white shadow-brand-glow";
const softBtn =
  "rounded-xl border border-white/70 bg-white/70 px-4 py-2 text-sm font-semibold text-brand hover:bg-white";
const ghostBtn = "rounded-lg px-2 py-1 text-[11px] font-semibold text-inksoft hover:text-rose";

const SECTIONS = [
  { id: "money", label: "Dinero y reserva" },
  { id: "incomes", label: "Ingresos" },
  { id: "payments", label: "Pagos" },
  { id: "goals", label: "Metas" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function toDateInput(iso: string): string {
  const d = parseDate(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

function fromDateInput(value: string): string {
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function todayInput(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toDateInput(`${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`);
}

function Saved({ show }: { show: boolean }) {
  if (!show) return null;
  return <span className="text-[11px] font-semibold text-brand">Guardado</span>;
}

function DataEditor() {
  const { data } = useUserData();
  const [section, setSection] = useState<SectionId>("money");
  const [savedAt, setSavedAt] = useState<SectionId | null>(null);

  if (!data) return null;

  const save = (patch: Partial<UserFinancialData>, id: SectionId) => {
    updateUserData(patch);
    setSavedAt(id);
    window.setTimeout(() => setSavedAt(null), 1800);
  };

  return (
    <AppShell greeting="Editar mis datos">
      <div className="mb-5 flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={
              section === s.id
                ? "rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-brand ring-1 ring-white/70"
                : "rounded-full glass px-3.5 py-1.5 text-xs font-medium text-inksoft"
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "money" ? (
        <MoneySection data={data} onSave={save} saved={savedAt === "money"} />
      ) : null}
      {section === "incomes" ? (
        <IncomesSection data={data} onSave={save} saved={savedAt === "incomes"} />
      ) : null}
      {section === "payments" ? (
        <PaymentsSection data={data} onSave={save} saved={savedAt === "payments"} />
      ) : null}
      {section === "goals" ? (
        <GoalsSection data={data} onSave={save} saved={savedAt === "goals"} />
      ) : null}

      <p className="mt-5 text-[11px] text-inksoft">
        Todo lo que cambies aquí se refleja de inmediato en el Dashboard, el Simulador, Pagos, Metas y el
        Calendario.
      </p>
    </AppShell>
  );
}

type SectionProps = {
  data: UserFinancialData;
  onSave: (patch: Partial<UserFinancialData>, id: SectionId) => void;
  saved: boolean;
};

/* ---------- Dinero disponible y reserva ---------- */

function MoneySection({ data, onSave, saved }: SectionProps) {
  const [available, setAvailable] = useState(String(data.availableMoney));
  const [reserve, setReserve] = useState(String(data.reserve));
  const [name, setName] = useState(data.name);

  const setAside = data.goals.reduce((s, g) => s + Math.max(0, g.savedAmount), 0);

  return (
    <GlassCard>
      <SectionTitle title="Dinero disponible y reserva" aside={<Saved show={saved} />} />
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Tu nombre</label>
          <input className={`mt-1 ${inputClass}`} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Dinero disponible hoy</label>
          <input
            type="number"
            min={0}
            step={50}
            className={`mt-1 ${inputClass}`}
            value={available}
            onChange={(e) => setAvailable(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Reserva mínima</label>
          <input
            type="number"
            min={0}
            step={50}
            className={`mt-1 ${inputClass}`}
            value={reserve}
            onChange={(e) => setReserve(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-ink/5 p-3 text-[11px] leading-relaxed text-inksoft">
        El dinero apartado en metas ({formatMoney(setAside)}) no forma parte de tu dinero disponible ni se
        resta de él. Entre las dos cosas tienes {formatMoney(Math.max(0, Number(available) || 0) + setAside)}{" "}
        registrados.
      </div>

      <button
        type="button"
        className={`mt-4 ${primaryBtn}`}
        onClick={() =>
          onSave(
            {
              name: name.trim() || data.name,
              availableMoney: Math.max(0, Number(available) || 0),
              reserve: Math.max(0, Number(reserve) || 0),
            },
            "money",
          )
        }
      >
        Guardar cambios
      </button>
    </GlassCard>
  );
}

/* ---------- Ingresos ---------- */

function IncomesSection({ data, onSave, saved }: SectionProps) {
  const [draft, setDraft] = useState({ name: "", amount: "", date: todayInput(7) });
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState({ name: "", amount: "", date: "" });

  const add = () => {
    const amount = Number(draft.amount);
    if (!draft.name.trim() || !(amount > 0)) return;
    const entry: UserIncomeInput = {
      id: makeId("inc"),
      name: draft.name.trim(),
      amount,
      date: fromDateInput(draft.date),
    };
    onSave({ incomes: [...data.incomes, entry] }, "incomes");
    setDraft({ name: "", amount: "", date: todayInput(7) });
  };

  const startEdit = (income: UserIncomeInput) => {
    setEditing(income.id);
    setEdit({ name: income.name, amount: String(income.amount), date: toDateInput(income.date) });
  };

  const commitEdit = (id: string) => {
    const amount = Number(edit.amount);
    if (!edit.name.trim() || !(amount > 0)) return;
    onSave(
      {
        incomes: data.incomes.map((i) =>
          i.id === id ? { ...i, name: edit.name.trim(), amount, date: fromDateInput(edit.date) } : i,
        ),
      },
      "incomes",
    );
    setEditing(null);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard>
        <SectionTitle title="Tus ingresos" aside={<Saved show={saved} />} />
        <div className="mt-4 space-y-3">
          {data.incomes.length === 0 ? (
            <p className="text-[12px] text-inksoft">Aún no tienes ingresos registrados.</p>
          ) : null}
          {data.incomes.map((income) =>
            editing === income.id ? (
              <div key={income.id} className="rounded-xl bg-white/60 p-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    className={inputClass}
                    value={edit.name}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  />
                  <input
                    type="number"
                    className={inputClass}
                    value={edit.amount}
                    onChange={(e) => setEdit({ ...edit, amount: e.target.value })}
                  />
                  <input
                    type="date"
                    className={inputClass}
                    value={edit.date}
                    onChange={(e) => setEdit({ ...edit, date: e.target.value })}
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <button type="button" className={softBtn} onClick={() => commitEdit(income.id)}>
                    Guardar
                  </button>
                  <button type="button" className={ghostBtn} onClick={() => setEditing(null)}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div key={income.id} className="flex items-center gap-3 rounded-xl bg-white/50 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate font-semibold">{income.name}</span>
                    <span className="font-display font-bold">{formatMoney(income.amount)}</span>
                  </div>
                  <div className="text-[11px] text-inksoft">llega el {formatShortDate(income.date)}</div>
                </div>
                <button type="button" className={ghostBtn} onClick={() => startEdit(income)}>
                  Editar
                </button>
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={() => onSave({ incomes: data.incomes.filter((i) => i.id !== income.id) }, "incomes")}
                >
                  Eliminar
                </button>
              </div>
            ),
          )}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="Agregar un ingreso" />
        <div className="mt-4 grid gap-3">
          <div>
            <label className={labelClass}>Concepto</label>
            <input
              className={`mt-1 ${inputClass}`}
              placeholder="Nómina"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Cantidad</label>
              <input
                type="number"
                min={0}
                className={`mt-1 ${inputClass}`}
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha</label>
              <input
                type="date"
                className={`mt-1 ${inputClass}`}
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </div>
          </div>
          <button type="button" className={primaryBtn} onClick={add}>
            Agregar ingreso
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

/* ---------- Pagos ---------- */

function PaymentsSection({ data, onSave, saved }: SectionProps) {
  const [draft, setDraft] = useState({
    name: "",
    amount: "",
    dueDate: todayInput(5),
    category: "",
    priority: "critical" as PaymentPriority,
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState({
    name: "",
    amount: "",
    dueDate: "",
    category: "",
    priority: "critical" as PaymentPriority,
  });

  const add = () => {
    const amount = Number(draft.amount);
    if (!draft.name.trim() || !(amount > 0)) return;
    const entry: UserPaymentInput = {
      id: makeId("pay"),
      name: draft.name.trim(),
      amount,
      dueDate: fromDateInput(draft.dueDate),
      priority: draft.priority,
      category: draft.category.trim() || "General",
    };
    onSave({ payments: [...data.payments, entry] }, "payments");
    setDraft({ name: "", amount: "", dueDate: todayInput(5), category: "", priority: "critical" });
  };

  const startEdit = (payment: UserPaymentInput) => {
    setEditing(payment.id);
    setEdit({
      name: payment.name,
      amount: String(payment.amount),
      dueDate: toDateInput(payment.dueDate),
      category: payment.category,
      priority: payment.priority,
    });
  };

  const commitEdit = (id: string) => {
    const amount = Number(edit.amount);
    if (!edit.name.trim() || !(amount > 0)) return;
    onSave(
      {
        payments: data.payments.map((p) =>
          p.id === id
            ? {
                ...p,
                name: edit.name.trim(),
                amount,
                dueDate: fromDateInput(edit.dueDate),
                category: edit.category.trim() || "General",
                priority: edit.priority,
              }
            : p,
        ),
      },
      "payments",
    );
    setEditing(null);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard>
        <SectionTitle title="Tus pagos" aside={<Saved show={saved} />} />
        <div className="mt-4 space-y-3">
          {data.payments.length === 0 ? (
            <p className="text-[12px] text-inksoft">Aún no tienes pagos registrados.</p>
          ) : null}
          {data.payments.map((payment) =>
            editing === payment.id ? (
              <div key={payment.id} className="rounded-xl bg-white/60 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className={inputClass}
                    value={edit.name}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  />
                  <input
                    type="number"
                    className={inputClass}
                    value={edit.amount}
                    onChange={(e) => setEdit({ ...edit, amount: e.target.value })}
                  />
                  <input
                    type="date"
                    className={inputClass}
                    value={edit.dueDate}
                    onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    placeholder="Categoría"
                    value={edit.category}
                    onChange={(e) => setEdit({ ...edit, category: e.target.value })}
                  />
                  <select
                    className={`${inputClass} sm:col-span-2`}
                    value={edit.priority}
                    onChange={(e) => setEdit({ ...edit, priority: e.target.value as PaymentPriority })}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 flex gap-2">
                  <button type="button" className={softBtn} onClick={() => commitEdit(payment.id)}>
                    Guardar
                  </button>
                  <button type="button" className={ghostBtn} onClick={() => setEditing(null)}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div key={payment.id} className="flex items-center gap-3 rounded-xl bg-white/50 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate font-semibold">{payment.name}</span>
                    <span className="font-display font-bold">{formatMoney(payment.amount)}</span>
                  </div>
                  <div className="text-[11px] text-inksoft">
                    {PRIORITY_LABEL[payment.priority]} · {payment.category} · vence{" "}
                    {formatShortDate(payment.dueDate)}
                  </div>
                </div>
                <button type="button" className={ghostBtn} onClick={() => startEdit(payment)}>
                  Editar
                </button>
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={() =>
                    onSave({ payments: data.payments.filter((p) => p.id !== payment.id) }, "payments")
                  }
                >
                  Eliminar
                </button>
              </div>
            ),
          )}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="Agregar un pago" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Nombre</label>
            <input
              className={`mt-1 ${inputClass}`}
              placeholder="Escuela"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Cantidad</label>
            <input
              type="number"
              min={0}
              className={`mt-1 ${inputClass}`}
              value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Fecha límite</label>
            <input
              type="date"
              className={`mt-1 ${inputClass}`}
              value={draft.dueDate}
              onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Categoría</label>
            <input
              className={`mt-1 ${inputClass}`}
              placeholder="Educación"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Prioridad</label>
            <select
              className={`mt-1 ${inputClass}`}
              value={draft.priority}
              onChange={(e) => setDraft({ ...draft, priority: e.target.value as PaymentPriority })}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className={`sm:col-span-2 ${primaryBtn}`} onClick={add}>
            Agregar pago
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

/* ---------- Metas ---------- */

function GoalsSection({ data, onSave, saved }: SectionProps) {
  const [draft, setDraft] = useState({
    name: "",
    targetAmount: "",
    savedAmount: "",
    monthlyContribution: "",
    targetDate: "",
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState({
    name: "",
    targetAmount: "",
    savedAmount: "",
    monthlyContribution: "",
    targetDate: "",
  });
  const [withdraw, setWithdraw] = useState<Record<string, string>>({});

  const add = () => {
    const target = Number(draft.targetAmount);
    if (!draft.name.trim() || !(target > 0)) return;
    const entry: UserGoalInput = {
      id: makeId("goal"),
      name: draft.name.trim(),
      targetAmount: target,
      savedAmount: Math.max(0, Number(draft.savedAmount) || 0),
      monthlyContribution: Math.max(0, Number(draft.monthlyContribution) || 0),
      targetDate: draft.targetDate ? fromDateInput(draft.targetDate) : null,
    };
    onSave({ goals: [...data.goals, entry] }, "goals");
    setDraft({ name: "", targetAmount: "", savedAmount: "", monthlyContribution: "", targetDate: "" });
  };

  const startEdit = (goal: UserGoalInput) => {
    setEditing(goal.id);
    setEdit({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      savedAmount: String(goal.savedAmount),
      monthlyContribution: String(goal.monthlyContribution),
      targetDate: goal.targetDate ? toDateInput(goal.targetDate) : "",
    });
  };

  const commitEdit = (id: string) => {
    const target = Number(edit.targetAmount);
    if (!edit.name.trim() || !(target > 0)) return;
    onSave(
      {
        goals: data.goals.map((g) =>
          g.id === id
            ? {
                ...g,
                name: edit.name.trim(),
                targetAmount: target,
                savedAmount: Math.max(0, Number(edit.savedAmount) || 0),
                monthlyContribution: Math.max(0, Number(edit.monthlyContribution) || 0),
                targetDate: edit.targetDate ? fromDateInput(edit.targetDate) : null,
              }
            : g,
        ),
      },
      "goals",
    );
    setEditing(null);
  };

  const dispose = (goalId: string) => {
    const amount = Number(withdraw[goalId]);
    if (!(amount > 0)) return;
    withdrawFromGoal(goalId, amount);
    setWithdraw({ ...withdraw, [goalId]: "" });
  };

  const withdrawals = data.goalWithdrawals ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard>
        <SectionTitle title="Tus metas" aside={<Saved show={saved} />} />
        <div className="mt-4 space-y-3">
          {data.goals.length === 0 ? (
            <p className="text-[12px] text-inksoft">Aún no tienes metas registradas.</p>
          ) : null}
          {data.goals.map((goal) =>
            editing === goal.id ? (
              <div key={goal.id} className="rounded-xl bg-white/60 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className={inputClass}
                    value={edit.name}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  />
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="Objetivo"
                    value={edit.targetAmount}
                    onChange={(e) => setEdit({ ...edit, targetAmount: e.target.value })}
                  />
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="Apartado"
                    value={edit.savedAmount}
                    onChange={(e) => setEdit({ ...edit, savedAmount: e.target.value })}
                  />
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="Aportación"
                    value={edit.monthlyContribution}
                    onChange={(e) => setEdit({ ...edit, monthlyContribution: e.target.value })}
                  />
                  <input
                    type="date"
                    className={`${inputClass} sm:col-span-2`}
                    value={edit.targetDate}
                    onChange={(e) => setEdit({ ...edit, targetDate: e.target.value })}
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <button type="button" className={softBtn} onClick={() => commitEdit(goal.id)}>
                    Guardar
                  </button>
                  <button type="button" className={ghostBtn} onClick={() => setEditing(null)}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div key={goal.id} className="rounded-xl bg-white/50 p-3">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate font-semibold">{goal.name}</span>
                      <span className="font-display font-bold">{formatMoney(goal.savedAmount)}</span>
                    </div>
                    <div className="text-[11px] text-inksoft">
                      apartado de {formatMoney(goal.targetAmount)}
                      {goal.targetDate ? ` · para el ${formatShortDate(goal.targetDate)}` : ""}
                    </div>
                  </div>
                  <button type="button" className={ghostBtn} onClick={() => startEdit(goal)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className={ghostBtn}
                    onClick={() => onSave({ goals: data.goals.filter((g) => g.id !== goal.id) }, "goals")}
                  >
                    Eliminar
                  </button>
                </div>
                {goal.savedAmount > 0 ? (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={goal.savedAmount}
                      placeholder="Cantidad"
                      className={inputClass}
                      value={withdraw[goal.id] ?? ""}
                      onChange={(e) => setWithdraw({ ...withdraw, [goal.id]: e.target.value })}
                    />
                    <button type="button" className={softBtn} onClick={() => dispose(goal.id)}>
                      Disponer
                    </button>
                  </div>
                ) : null}
              </div>
            ),
          )}
        </div>

        {withdrawals.length > 0 ? (
          <div className="mt-4 rounded-xl bg-ink/5 p-3 text-[11px] leading-relaxed text-inksoft">
            <div className="font-semibold text-ink">Dinero que has dispuesto de tus metas</div>
            {withdrawals
              .slice()
              .reverse()
              .slice(0, 5)
              .map((w) => (
                <div key={w.id} className="mt-1">
                  {formatShortDate(w.date)} · {formatMoney(w.amount)} de “{w.goalName}” a tu dinero disponible
                </div>
              ))}
          </div>
        ) : null}
      </GlassCard>

      <GlassCard>
        <SectionTitle title="Agregar una meta" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre</label>
            <input
              className={`mt-1 ${inputClass}`}
              placeholder="Celular"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Monto objetivo</label>
            <input
              type="number"
              min={0}
              className={`mt-1 ${inputClass}`}
              value={draft.targetAmount}
              onChange={(e) => setDraft({ ...draft, targetAmount: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Dinero apartado</label>
            <input
              type="number"
              min={0}
              className={`mt-1 ${inputClass}`}
              value={draft.savedAmount}
              onChange={(e) => setDraft({ ...draft, savedAmount: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Aportación periódica</label>
            <input
              type="number"
              min={0}
              className={`mt-1 ${inputClass}`}
              value={draft.monthlyContribution}
              onChange={(e) => setDraft({ ...draft, monthlyContribution: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Fecha límite (opcional)</label>
            <input
              type="date"
              className={`mt-1 ${inputClass}`}
              value={draft.targetDate}
              onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })}
            />
          </div>
          <button type="button" className={`sm:col-span-2 ${primaryBtn}`} onClick={add}>
            Agregar meta
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-inksoft">
          El dinero apartado en una meta se guarda aparte: no se suma ni se resta de tu dinero disponible.
          Si necesitas usarlo, escribe la cantidad y toca “Disponer”.
        </p>
        <Link to="/metas" className="mt-3 inline-block text-[11px] font-medium text-inksoft hover:text-brand">
          ver mis metas
        </Link>
      </GlassCard>
    </div>
  );
}
