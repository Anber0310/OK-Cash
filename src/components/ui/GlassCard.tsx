import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function GlassCard({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl glass p-5", interactive && "lift", className)}>{children}</div>
  );
}

export function SectionTitle({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="font-display text-sm font-bold tracking-tight">{title}</div>
      {aside}
    </div>
  );
}

export function Metric({
  label,
  value,
  hint,
  tone = "ink",
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: "ink" | "brand" | "mint" | "rose";
}) {
  const toneClass = {
    ink: "text-ink",
    brand: "text-brand",
    mint: "text-mint",
    rose: "text-rose",
  }[tone];

  return (
    <div className="rounded-2xl glass p-4 lift">
      <div className="text-[11px] font-medium uppercase tracking-wider text-inksoft">{label}</div>
      <div className={cn("mt-1 font-display text-[26px] font-bold tracking-tight", toneClass)}>{value}</div>
      {hint ? <div className="text-[11px] text-inksoft">{hint}</div> : null}
    </div>
  );
}
