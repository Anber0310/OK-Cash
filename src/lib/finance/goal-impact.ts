import { formatMoney } from "./format";
import type { Goal } from "./types";

/**
 * Explicación del efecto de una decisión simulada sobre una meta.
 *
 * Es una función pura y NO forma parte del motor temporal: solo interpreta
 * resultados que el motor ya calculó. Nunca inventa aportaciones periódicas ni
 * cantidades que la persona no haya registrado; cuando falta información,
 * prefiere una explicación prudente.
 */

export type GoalImpactLevel = "none" | "reduces" | "delays" | "usesSetAside";

export interface GoalDecisionImpact {
  level: GoalImpactLevel;
  /** Progreso actual del apartado: apartado / objetivo. */
  progress: number;
  message: string;
}

export interface GoalImpactInput {
  goal: Goal;
  /** Dinero de la decisión simulada. */
  amountUsed: number;
  /** Dinero que puede usarse hoy sin bajar de la reserva ("Para gastar"). */
  availableToDecide: number;
  /** Margen respecto a la reserva en el punto más bajo del periodo. */
  marginAtMinimum: number;
}

export function goalProgress(goal: Goal): number {
  return goal.targetAmount > 0 ? Math.min(1, Math.max(0, goal.savedAmount / goal.targetAmount)) : 0;
}

export function describeGoalDecisionImpact({
  goal,
  amountUsed,
  availableToDecide,
  marginAtMinimum,
}: GoalImpactInput): GoalDecisionImpact {
  const progress = goalProgress(goal);
  const setAside = Math.max(0, goal.savedAmount);
  const missing = Math.max(0, goal.targetAmount - setAside);
  const available = Math.max(0, availableToDecide);

  if (amountUsed <= 0) {
    return {
      level: "none",
      progress,
      message: `Tienes ${formatMoney(setAside)} apartados para esta meta. Sin una decisión de gasto, nada cambia.`,
    };
  }

  // La decisión cabe con holgura en el dinero disponible: el apartado no se toca.
  if (amountUsed <= available * 0.5) {
    return {
      level: "none",
      progress,
      message: `Esta decisión sale de tu dinero disponible: no necesitas usar los ${formatMoney(setAside)} apartados para esta meta.`,
    };
  }

  // Cabe, pero consume casi todo el margen: baja la capacidad de seguir ahorrando.
  if (amountUsed <= available) {
    const rest = available - amountUsed;
    const tail =
      goal.monthlyContribution > 0
        ? ` Después te quedarían ${formatMoney(rest)} de holgura, menos de lo que sueles apartar cada periodo (${formatMoney(goal.monthlyContribution)}).`
        : ` Después te quedarían ${formatMoney(rest)} de holgura para seguir apartando dinero a esta meta.`;
    return {
      level: "reduces",
      progress,
      message: `No toca los ${formatMoney(setAside)} apartados, pero reduce la capacidad que te queda para completar esta meta.${tail}`,
    };
  }

  const shortfall = amountUsed - available;

  // El punto más bajo del periodo cae por debajo de la reserva: para sostener la
  // decisión habría que usar dinero apartado.
  if (marginAtMinimum < 0 && setAside > 0) {
    const needed = Math.min(shortfall, setAside);
    const remaining = setAside - needed;
    return {
      level: "usesSetAside",
      progress,
      message: `Para sostener esta decisión tendrías que disponer de alrededor de ${formatMoney(needed)} de lo apartado en esta meta. El apartado quedaría en ${formatMoney(remaining)} y su avance retrocedería.`,
    };
  }

  const delayTail =
    goal.monthlyContribution > 0
      ? ` Serían unos ${Math.max(1, Math.round((shortfall / goal.monthlyContribution) * 10) / 10)} periodos de aportación que dejarías de hacer.`
      : ` No registraste una aportación periódica para esta meta, así que no podemos calcular cuántos meses exactamente.`;

  return {
    level: "delays",
    progress,
    message: `Esta decisión usa ${formatMoney(shortfall)} más de lo que tienes libre hoy, así que podría retrasar el cumplimiento de esta meta (te faltan ${formatMoney(missing)}).${delayTail}`,
  };
}
