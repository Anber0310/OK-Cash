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

export function formatShortDate(isoDate: string): string {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(new Date(isoDate));
}

export function formatLongDate(isoDate: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(isoDate));
}

export function daysUntil(isoDate: string, from: string): number {
  const a = new Date(isoDate).setHours(0, 0, 0, 0);
  const b = new Date(from).setHours(0, 0, 0, 0);
  return Math.round((a - b) / 86_400_000);
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
