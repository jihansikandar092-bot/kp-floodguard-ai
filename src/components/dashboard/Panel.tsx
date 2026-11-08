import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DemoBadge } from "@/components/site/Demo";

export function Panel({
  title,
  subtitle,
  children,
  className,
  bodyClassName,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-xl border bg-card shadow-card", className)} aria-label={title}>
      <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action ?? <DemoBadge />}
      </header>
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  hint,
  tone = "navy",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  tone?: "navy" | "water" | "emergency";
}) {
  const toneClass = {
    navy: "bg-secondary text-primary",
    water: "bg-accent text-water",
    emergency: "bg-emergency-soft text-emergency",
  }[tone];
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card transition-transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <span className={cn("grid size-9 place-items-center rounded-lg", toneClass)}>
          <Icon className="size-4.5" aria-hidden />
        </span>
        <DemoBadge />
      </div>
      <p className="mt-4 text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold tracking-tight">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
