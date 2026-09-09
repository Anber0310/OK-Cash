import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatMoney, formatShortDate } from "@/lib/finance/format";
import { PRIORITY_LABEL } from "@/lib/finance/analysis";
import {
  emptyUserData,
  getUserData,
  makeId,
  saveUserData,
  type UserFinancialData,
  type UserGoalInput,
  type UserIncomeInput,
  type UserPaymentInput,
} from "@/lib/finance/user-data";
import type { PaymentPriority } from "@/lib/finance/types";

export const Route = createFileRoute("/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración inicial — OK cash" },
      {
        name: "description",
        content:
          "Configura OK cash paso a paso: tu nombre, tu dinero disponible, tus ingresos, tus pagos, tu reserva y tus metas.",
      },
      { property: "og:title", content: "Configuración inicial — OK cash" },
      {
        property: "og:description",
        content: "Unos pasos sencillos para que OK cash use tus datos reales, no datos de ejemplo.",
      },
    ],
  }),
  component: SetupWizard,
});

const STEPS = [
  "Nombre",
  "Dinero disponible",
  "Ingresos",
  "Pagos",
  "Reserva",
  "Metas",
  "Confirmación",
] as const;

const PRIORITIES: PaymentPriority[] = ["critical", "important", "flexible"];

const inputClass =
  "w-full rounded-xl border border-white/70 bg-white/70 px-3 py-2.5 text-sm outline-none focus:border-brand/60";
const labelClass = "text-[11px] font-semibold uppercase tracking-wider text-inksoft";

function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function toISODate(value: string): string {
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {STEPS.map((label, i) => (
        <span
          key={label}
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
            i === step
              ? "gradient-brand text-white"
              : i < step
                ? "bg-brand/15 text-brand"
                : "bg-ink/5 text-inksoft"
          }`}
        >
          {i + 1}. {label}
        </span>
      ))}
    </div>
  );
}

function SetupWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<UserFinancialData>(() => emptyUserData());

  // Si ya existían datos, la configuración funciona como edición.
  useEffect(() => {
    const existing = getUserData();
    if (existing) setData(existing);
  }, []);

  const patch = (partial: Partial<UserFinancialData>) => setData((d) => ({ ...d, ...partial }));

  const [income, setIncome] = useState({ name: "", amount: "", date: todayISO(7) });
  const [payment, setPayment] = useState({
    name: "",
    amount: "",
    dueDate: todayISO(5),
    category: "",
    priority: "critical" as PaymentPriority,
  });
  const [goal, setGoal] = useState({
    name: "",
    targetAmount: "",
    savedAmount: "",
    monthlyContribution: "",
    targetDate: "",
  });

  const addIncome = () => {
    const amount = Number(income.amount);
    if (!income.name.trim() || !(amount > 0)) return;
    const entry: UserIncomeInput = {
      id: makeId("inc"),
      name: income.name.trim(),
      amount,
      date: toISODate(income.date),
    };
    patch({ incomes: [...data.incomes, entry] });
    setIncome({ name: "", amount: "", date: todayISO(7) });
  };

  const addPayment = () => {
    const amount = Number(payment.amount);
    if (!payment.name.trim() || !(amount > 0)) return;
    const entry: UserPaymentInput = {
      id: makeId("pay"),
      name: payment.name.trim(),
      amount,
      dueDate: toISODate(payment.dueDate),
      priority: payment.priority,
      category: payment.category.trim() || "General",
    };
    patch({ payments: [...data.payments, entry] });
    setPayment({ name: "", amount: "", dueDate: todayISO(5), category: "", priority: "critical" });
  };

  const addGoal = () => {
    const target = Number(goal.targetAmount);
    if (!goal.name.trim() || !(target > 0)) return;
    const entry: UserGoalInput = {
      id: makeId("goal"),
      name: goal.name.trim(),
      targetAmount: target,
      savedAmount: Math.max(0, Number(goal.savedAmount) || 0),
      monthlyContribution: Math.max(0, Number(goal.monthlyContribution) || 0),
      targetDate: goal.targetDate ? toISODate(goal.targetDate) : null,
    };
    patch({ goals: [...data.goals, entry] });
    setGoal({ name: "", targetAmount: "", savedAmount: "", monthlyContribution: "", targetDate: "" });
  };

  const canContinue = () => {
    if (step === 0) return data.name.trim().length > 0;
    if (step === 1) return data.availableMoney >= 0;
    return true;
  };

  const finish = () => {
    saveUserData({ ...data, createdAt: data.createdAt || new Date().toISOString() });
    navigate({ to: "/" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-5 py-8 text-ink md:px-8">
      <div className="pointer-events-none absolute -left-24 -top-24 size-[420px] rounded-full bg-brand/25 blur-3xl floaty" />
      <div className="pointer-events-none absolute -right-24 top-1/3 size-[420px] rounded-full bg-accent/20 blur-3xl floaty-slow" />

      <div className="relative mx-auto w-full max-w-2xl">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl gradient-brand font-display text-sm font-bold text-white shadow-brand-glow">
            OK
          </div>
          <div className="font-display text-lg font-bold tracking-tight">
            OK<span className="text-brand"> cash</span>
          </div>
        </div>

        <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">Configuremos tu dinero</h1>
        <p className="mt-2 text-sm text-inksoft">
          Estos datos son tuyos y se guardan en este dispositivo. Puedes editarlos cuando quieras.
        </p>

        <div className="mt-5">
          <Stepper step={step} />
        </div>

        <GlassCard className="mt-5">
          {step === 0 ? (
            <div>
              <h2 className="font-display text-lg font-bold">¿Cómo te llamamos?</h2>
              <input
                autoFocus
                className={`mt-4 ${inputClass}`}
                placeholder="Tu nombre"
                value={data.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </div>
          ) : null}

          {step === 1 ? (
            <div>
              <h2 className="font-display text-lg font-bold">¿Cuánto dinero tienes disponible actualmente?</h2>
              <p className="mt-2 text-[12px] text-inksoft">
                Solo el dinero con el que cuentas hoy. Los ingresos futuros los agregamos en el siguiente paso.
              </p>
              <div className="mt-4 flex items-center rounded-xl border border-white/70 bg-white/70 px-3">
                <span className="font-display text-lg text-inksoft">$</span>
                <input
                  type="number"
                  min={0}
                  step={50}
                  className="w-full bg-transparent px-2 py-3 font-display text-2xl font-bold outline-none"
                  value={data.availableMoney || ""}
                  onChange={(e) => patch({ availableMoney: Math.max(0, Number(e.target.value) || 0) })}
                />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <h2 className="font-display text-lg font-bold">¿Qué ingresos esperas?</h2>
              <p className="mt-2 text-[12px] text-inksoft">
                Un ingreso con fecha futura no cuenta como dinero disponible hoy.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className={labelClass}>Concepto</label>
                  <input
                    className={`mt-1 ${inputClass}`}
                    placeholder="Nómina"
                    value={income.name}
                    onChange={(e) => setIncome({ ...income, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Cantidad</label>
                  <input
                    type="number"
                    min={0}
                    className={`mt-1 ${inputClass}`}
                    value={income.amount}
                    onChange={(e) => setIncome({ ...income, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Fecha</label>
                  <input
                    type="date"
                    className={`mt-1 ${inputClass}`}
                    value={income.date}
                    onChange={(e) => setIncome({ ...income, date: e.target.value })}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={addIncome}
                className="mt-3 rounded-xl border border-white/70 bg-white/70 px-4 py-2 text-sm font-semibold text-brand hover:bg-white"
              >
                Agregar ingreso
              </button>

              <ItemList
                items={data.incomes.map((i) => ({
                  id: i.id,
                  title: i.name,
                  amount: i.amount,
                  detail: `llega el ${formatShortDate(i.date)}`,
                }))}
                empty="Aún no agregas ingresos."
                onRemove={(id) => patch({ incomes: data.incomes.filter((i) => i.id !== id) })}
              />
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <h2 className="font-display text-lg font-bold">¿Qué pagos y compromisos tienes?</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Nombre</label>
                  <input
                    className={`mt-1 ${inputClass}`}
                    placeholder="Escuela"
                    value={payment.name}
                    onChange={(e) => setPayment({ ...payment, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Cantidad</label>
                  <input
                    type="number"
                    min={0}
                    className={`mt-1 ${inputClass}`}
                    value={payment.amount}
                    onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Fecha límite</label>
                  <input
                    type="date"
                    className={`mt-1 ${inputClass}`}
                    value={payment.dueDate}
                    onChange={(e) => setPayment({ ...payment, dueDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Categoría</label>
                  <input
                    className={`mt-1 ${inputClass}`}
                    placeholder="Servicios"
                    value={payment.category}
                    onChange={(e) => setPayment({ ...payment, category: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className={labelClass}>Importancia</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPayment({ ...payment, priority: p })}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                        payment.priority === p
                          ? "gradient-brand text-white"
                          : "border border-white/70 bg-white/70 text-inksoft hover:bg-white"
                      }`}
                    >
                      {PRIORITY_LABEL[p]}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={addPayment}
                className="mt-3 rounded-xl border border-white/70 bg-white/70 px-4 py-2 text-sm font-semibold text-brand hover:bg-white"
              >
                Agregar pago
              </button>

              <ItemList
                items={data.payments.map((p) => ({
                  id: p.id,
                  title: p.name,
                  amount: p.amount,
                  detail: `${PRIORITY_LABEL[p.priority]} · vence ${formatShortDate(p.dueDate)}`,
                }))}
                empty="Aún no agregas pagos."
                onRemove={(id) => patch({ payments: data.payments.filter((p) => p.id !== id) })}
              />
            </div>
          ) : null}

          {step === 4 ? (
            <div>
              <h2 className="font-display text-lg font-bold">¿Cuánto dinero quieres conservar como reserva?</h2>
              <p className="mt-2 text-[12px] text-inksoft">
                Tú decides la cantidad. La usaremos para calcular tu margen ante imprevistos.
              </p>
              <div className="mt-4 flex items-center rounded-xl border border-white/70 bg-white/70 px-3">
                <span className="font-display text-lg text-inksoft">$</span>
                <input
                  type="number"
                  min={0}
                  step={50}
                  className="w-full bg-transparent px-2 py-3 font-display text-2xl font-bold outline-none"
                  value={data.reserve || ""}
                  onChange={(e) => patch({ reserve: Math.max(0, Number(e.target.value) || 0) })}
                />
              </div>
            </div>
          ) : null}

          {step === 5 ? (
            <div>
              <h2 className="font-display text-lg font-bold">¿Tienes metas de ahorro?</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Nombre</label>
                  <input
                    className={`mt-1 ${inputClass}`}
                    placeholder="Fondo para imprevistos"
                    value={goal.name}
                    onChange={(e) => setGoal({ ...goal, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Cantidad objetivo</label>
                  <input
                    type="number"
                    min={0}
                    className={`mt-1 ${inputClass}`}
                    value={goal.targetAmount}
                    onChange={(e) => setGoal({ ...goal, targetAmount: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Ya ahorrado</label>
                  <input
                    type="number"
                    min={0}
                    className={`mt-1 ${inputClass}`}
                    value={goal.savedAmount}
                    onChange={(e) => setGoal({ ...goal, savedAmount: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Aportación periódica</label>
                  <input
                    type="number"
                    min={0}
                    className={`mt-1 ${inputClass}`}
                    value={goal.monthlyContribution}
                    onChange={(e) => setGoal({ ...goal, monthlyContribution: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Fecha objetivo (opcional)</label>
                  <input
                    type="date"
                    className={`mt-1 ${inputClass}`}
                    value={goal.targetDate}
                    onChange={(e) => setGoal({ ...goal, targetDate: e.target.value })}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={addGoal}
                className="mt-3 rounded-xl border border-white/70 bg-white/70 px-4 py-2 text-sm font-semibold text-brand hover:bg-white"
              >
                Agregar meta
              </button>

              <ItemList
                items={data.goals.map((g) => ({
                  id: g.id,
                  title: g.name,
                  amount: g.targetAmount,
                  detail: `${formatMoney(g.savedAmount)} ahorrados${g.targetDate ? ` · ${formatShortDate(g.targetDate)}` : ""}`,
                }))}
                empty="Aún no agregas metas."
                onRemove={(id) => patch({ goals: data.goals.filter((g) => g.id !== id) })}
              />
            </div>
          ) : null}

          {step === 6 ? (
            <div>
              <h2 className="font-display text-lg font-bold">Revisa tus datos</h2>
              <div className="mt-4 space-y-3 text-sm">
                <SummaryRow label="Nombre" value={data.name || "—"} onEdit={() => setStep(0)} />
                <SummaryRow
                  label="Dinero disponible"
                  value={formatMoney(data.availableMoney)}
                  onEdit={() => setStep(1)}
                />
                <SummaryRow
                  label="Ingresos"
                  value={
                    data.incomes.length
                      ? data.incomes.map((i) => `${i.name} ${formatMoney(i.amount)}`).join(", ")
                      : "Sin ingresos registrados"
                  }
                  onEdit={() => setStep(2)}
                />
                <SummaryRow
                  label="Pagos"
                  value={
                    data.payments.length
                      ? data.payments.map((p) => `${p.name} ${formatMoney(p.amount)}`).join(", ")
                      : "Sin pagos registrados"
                  }
                  onEdit={() => setStep(3)}
                />
                <SummaryRow label="Reserva" value={formatMoney(data.reserve)} onEdit={() => setStep(4)} />
                <SummaryRow
                  label="Metas"
                  value={
                    data.goals.length
                      ? data.goals.map((g) => `${g.name} ${formatMoney(g.targetAmount)}`).join(", ")
                      : "Sin metas registradas"
                  }
                  onEdit={() => setStep(5)}
                />
              </div>
              <button
                type="button"
                onClick={finish}
                className="mt-6 w-full rounded-xl gradient-brand px-4 py-3 text-sm font-semibold text-white shadow-brand-glow"
              >
                Confirmar y entrar a OK cash
              </button>
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="rounded-xl border border-white/70 bg-white/60 px-4 py-2 text-sm font-semibold text-inksoft disabled:opacity-40"
            >
              Atrás
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                disabled={!canContinue()}
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="rounded-xl gradient-brand px-5 py-2 text-sm font-semibold text-white shadow-brand-glow disabled:opacity-40"
              >
                Continuar
              </button>
            ) : null}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function ItemList({
  items,
  empty,
  onRemove,
}: {
  items: { id: string; title: string; amount: number; detail: string }[];
  empty: string;
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="mt-4 text-[12px] text-inksoft">{empty}</p>;
  }
  return (
    <div className="mt-4 space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 rounded-xl glass-soft p-3">
          <div className="min-w-0 flex-1">
            <div className="flex justify-between gap-2 text-sm">
              <span className="truncate font-semibold">{item.title}</span>
              <span className="font-display font-bold">{formatMoney(item.amount)}</span>
            </div>
            <div className="text-[11px] text-inksoft">{item.detail}</div>
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="rounded-lg bg-ink/5 px-2 py-1 text-[11px] font-semibold text-inksoft hover:bg-ink/10"
          >
            Quitar
          </button>
        </div>
      ))}
    </div>
  );
}

function SummaryRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl glass-soft p-3">
      <div className="min-w-0">
        <div className={labelClass}>{label}</div>
        <div className="mt-0.5 break-words text-sm font-semibold">{value}</div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 rounded-lg bg-ink/5 px-2.5 py-1 text-[11px] font-semibold text-inksoft hover:bg-ink/10"
      >
        Editar
      </button>
    </div>
  );
}
