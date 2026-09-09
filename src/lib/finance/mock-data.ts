import type { FinancialSnapshot } from "./types";

/**
 * Datos de demostración. Es la ÚNICA fuente de datos ficticios de la app.
 * Cuando exista la API externa, este módulo se reemplaza por el proveedor real
 * sin tocar el motor de simulación ni la interfaz.
 */

const today = new Date();
const iso = (daysFromNow: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
};

export const mockSnapshot: FinancialSnapshot = {
  asOf: iso(0),
  user: {
    id: "user_demo",
    firstName: "Camila",
    lastName: "Ruiz",
    initials: "CR",
    currency: "MXN",
    minimumReserve: 800,
  },
  accounts: [
    { id: "acc_1", name: "Cuenta principal", kind: "checking", balance: 4200, maskedNumber: "•••• 4821" },
    { id: "acc_2", name: "Ahorro", kind: "savings", balance: 800, maskedNumber: "•••• 1093" },
  ],
  transactions: [
    { id: "t1", accountId: "acc_1", date: iso(-1), description: "Supermercado", category: "Despensa", amount: -640 },
    { id: "t2", accountId: "acc_1", date: iso(-3), description: "Transporte", category: "Transporte", amount: -120 },
    { id: "t3", accountId: "acc_1", date: iso(-5), description: "Pago de nómina", category: "Ingreso", amount: 6800 },
    { id: "t4", accountId: "acc_1", date: iso(-8), description: "Farmacia", category: "Salud", amount: -310 },
    { id: "t5", accountId: "acc_1", date: iso(-11), description: "Café", category: "Ocio", amount: -85 },
    { id: "t6", accountId: "acc_2", date: iso(-12), description: "Aporte a ahorro", category: "Ahorro", amount: 400 },
  ],
  payments: [
    {
      id: "p_school",
      name: "Escuela",
      amount: 1000,
      dueDate: iso(2),
      priority: "critical",
      category: "Educación",
      consequence: null,
      consequenceSource: null,
    },
    {
      id: "p_power",
      name: "Luz",
      amount: 700,
      dueDate: iso(4),
      priority: "important",
      category: "Servicios",
      consequence: null,
      consequenceSource: null,
    },
    {
      id: "p_internet",
      name: "Internet",
      amount: 500,
      dueDate: iso(8),
      priority: "flexible",
      category: "Servicios",
      consequence: null,
      consequenceSource: null,
    },
  ],
  expenses: [
    { id: "e_food", name: "Despensa", monthlyAmount: 1400, essential: true, category: "Despensa" },
    { id: "e_transport", name: "Transporte", monthlyAmount: 600, essential: true, category: "Transporte" },
    { id: "e_streaming", name: "Suscripciones", monthlyAmount: 260, essential: false, category: "Ocio" },
  ],
  incomes: [
    { id: "i_payroll", name: "Nómina", amount: 3400, date: iso(12) },
  ],
  goals: [
    {
      id: "g_emergency",
      name: "Fondo de emergencia",
      targetAmount: 6000,
      savedAmount: 2280,
      targetDate: iso(210),
      monthlyContribution: 600,
    },
    {
      id: "g_trip",
      name: "Viaje de fin de año",
      targetAmount: 12500,
      savedAmount: 7750,
      targetDate: iso(300),
      monthlyContribution: 900,
    },
  ],
};
