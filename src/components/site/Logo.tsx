import { cn } from "@/lib/utils";

export function Logo({ inverted = false, className }: { inverted?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative grid size-9 place-items-center rounded-md",
          inverted ? "bg-navy-foreground text-navy-deep" : "bg-primary text-primary-foreground",
        )}
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 2.5 4 5.5v6c0 4.8 3.4 8.6 8 10 4.6-1.4 8-5.2 8-10v-6l-8-3Z" />
          <path d="M7.5 13c1.2-1 2.3-1 3.5 0s2.3 1 3.5 0 2.3-1 2.5-.8" strokeLinecap="round" />
        </svg>
        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-emergency ring-2 ring-background" />
      </span>
      <span className="leading-none">
        <span
          className={cn(
            "block font-display text-[1.05rem] font-extrabold tracking-tight",
            inverted ? "text-navy-foreground" : "text-foreground",
          )}
        >
          KP FloodGuard <span className="text-emergency">AI</span>
        </span>
        <span
          className={cn(
            "block eyebrow mt-1 !text-[0.6rem]",
            inverted ? "text-navy-muted" : "text-muted-foreground",
          )}
        >
          Khyber Pakhtunkhwa
        </span>
      </span>
    </span>
  );
}
