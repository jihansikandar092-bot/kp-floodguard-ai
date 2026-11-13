import { Link } from "@tanstack/react-router";
import { Menu, Phone, Siren } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "./Logo";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/map", label: "Flood Map" },
  { to: "/admin", label: "Coordinators" },
  { to: "/integrations", label: "Integrations" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40">
      <div className="bg-navy-deep text-navy-foreground">
        <div className="container-page flex h-9 items-center justify-between gap-4 text-xs">
          <p className="hidden sm:block text-navy-muted">
            Prototype platform · Not an official emergency service
          </p>
          <div className="flex items-center gap-4 ml-auto">
            <a
              href="tel:1122"
              className="inline-flex items-center gap-1.5 font-semibold hover:underline"
            >
              <Phone className="size-3.5" aria-hidden /> Rescue 1122
            </a>
            <a href="tel:1700" className="inline-flex items-center gap-1.5 hover:underline">
              PDMA KP 1700
            </a>
          </div>
        </div>
      </div>
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="container-page flex h-16 items-center justify-between gap-6">
          <Link to="/" className="shrink-0" aria-label="KP FloodGuard AI home">
            <Logo />
          </Link>
          <nav aria-label="Main" className="hidden lg:flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
                activeProps={{ className: "text-primary bg-secondary" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="emergency" className="hidden sm:inline-flex">
              <Link to="/emergency">
                <Siren /> Request Help
              </Link>
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>
                    <Logo />
                  </SheetTitle>
                </SheetHeader>
                <nav aria-label="Mobile" className="mt-6 flex flex-col gap-1 px-4">
                  <Link
                    to="/"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2.5 font-medium hover:bg-muted"
                    activeOptions={{ exact: true }}
                    activeProps={{ className: "bg-secondary text-primary" }}
                  >
                    Home
                  </Link>
                  {NAV.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="rounded-md px-3 py-2.5 font-medium hover:bg-muted"
                      activeProps={{ className: "bg-secondary text-primary" }}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Button asChild variant="emergency" className="mt-4">
                    <Link to="/emergency" onClick={() => setOpen(false)}>
                      <Siren /> Request Emergency Help
                    </Link>
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
