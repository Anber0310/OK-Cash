import { emptyUserData, makeId, type UserFinancialData } from "./user-data";

/**
 * Perfil de demostración.
 *
 * Contiene EXCLUSIVAMENTE el caso de prueba definido para la presentación:
 * saldo inicial, reserva, tres pagos, un ingreso y una meta. Las fechas se
 * colocan en los próximos días para que la línea de tiempo tenga sentido
 * cuando se repita la demo. No representa datos reales de nadie y no se usa
 * para alimentar el perfil personal.
 */

function inDays(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

export function demoUserData(name = "Perfil demo"): UserFinancialData {
  return {
    ...emptyUserData(),
    name,
    availableMoney: 5000,
    reserve: 800,
    incomes: [{ id: makeId("inc"), name: "Nómina", amount: 3400, date: inDays(10) }],
    payments: [
      {
        id: makeId("pay"),
        name: "Renta",
        amount: 1000,
        dueDate: inDays(0),
        priority: "critical",
        category: "Vivienda",
      },
      {
        id: makeId("pay"),
        name: "Escuela",
        amount: 700,
        dueDate: inDays(2),
        priority: "critical",
        category: "Educación",
      },
      {
        id: makeId("pay"),
        name: "Servicios",
        amount: 500,
        dueDate: inDays(6),
        priority: "important",
        category: "Servicios",
      },
    ],
    goals: [
      {
        id: makeId("goal"),
        name: "Viaje",
        targetAmount: 12000,
        savedAmount: 3000,
        monthlyContribution: 1000,
        targetDate: null,
      },
    ],
  };
}
