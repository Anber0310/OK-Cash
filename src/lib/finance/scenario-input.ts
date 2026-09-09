const KEY = "clarity.lastScenarioInput";

export interface ScenarioInput {
  amount: number;
  label: string;
}

export const defaultScenarioInput: ScenarioInput = {
  amount: 1500,
  label: "Si realizo la compra",
};

/** Guarda la última decisión simulada para poder abrir su resumen. */
export function saveScenarioInput(input: ScenarioInput): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(input));
}

export function loadScenarioInput(): ScenarioInput {
  if (typeof window === "undefined") return defaultScenarioInput;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultScenarioInput;
    const parsed = JSON.parse(raw) as Partial<ScenarioInput>;
    return {
      amount: typeof parsed.amount === "number" ? parsed.amount : defaultScenarioInput.amount,
      label: typeof parsed.label === "string" ? parsed.label : defaultScenarioInput.label,
    };
  } catch {
    return defaultScenarioInput;
  }
}
