import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/data/districts";
import { RISK_LABEL } from "@/lib/data/districts";

export function DemoBadge({ className, label = "DEMO" }: { className?: string; label?: string }) {
  return (
    <Badge variant="demo" className={cn("text-[0.62rem]", className)}>
      {label}
    </Badge>
  );
}

export function DemoBanner({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-demo-foreground/20 bg-demo px-4 py-3 text-sm text-demo-foreground",
        className,
      )}
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  return (
    <Badge variant={level} className={cn("gap-1.5", className)}>
      <span
        className="size-2 rounded-full"
        style={{ background: `var(--risk-${level})` }}
        aria-hidden
      />
      {RISK_LABEL[level]}
    </Badge>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="border-b bg-muted/60">
      <div className="container-page flex flex-col gap-4 py-8 md:flex-row md:items-end md:justify-between md:py-10">
        <div className="max-w-2xl">
          <p className="eyebrow text-emergency">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-extrabold text-foreground md:text-4xl">{title}</h1>
          {description && <p className="mt-3 text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
