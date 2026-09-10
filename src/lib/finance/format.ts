export function formatMoney(amount: number, options: { compact?: boolean } = {}): string {
  const value = Math.round(amount);
  const formatted = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
    notation: options.compact ? "compact" : "standard",
  }).format(value);
  return formatted.replace("MX$", "$");
}

/**
 * Interpreta fechas del tipo "YYYY-MM-DD" como día local.
 * `new Date("2026-09-15")` se interpreta como UTC y en México se veía un día antes.
 */
export function parseDate(isoDate: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  return new Date(isoDate);
}

export function formatShortDate(isoDate: string): string {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(parseDate(isoDate));
}

export function formatLongDate(isoDate: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseDate(isoDate));
}

export function daysUntil(isoDate: string, from: string): number {
  const a = parseDate(isoDate).setHours(0, 0, 0, 0);
  const b = parseDate(from).setHours(0, 0, 0, 0);
  return Math.round((a - b) / 86_400_000);
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
