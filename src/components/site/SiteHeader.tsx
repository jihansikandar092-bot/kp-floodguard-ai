import { Link } from "@tanstack/react-router";
import { LogIn, Menu, Phone, Siren } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "./Logo";
import { useSiteLanguage } from "@/lib/i18n/site-language";
import type { SiteLang } from "@/lib/i18n/site-text";

const NAV = [
  { to: "/dashboard", key: "dashboard" },
  { to: "/map", key: "map" },
  { to: "/alerts", key: "alerts" },
  { to: "/integrations", key: "integrations" },
  { to: "/contact", key: "contact" },
] as const;

function LanguageSelect({ className }: { className?: string }) {
  const { lang, setLang, t } = useSiteLanguage();
  return (
    <select
      aria-label={t.language}
      value={lang}
      onChange={(e) => setLang(e.target.value as SiteLang)}
      className={"h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground " + (className ?? "")}
    >
      <option value="en">English</option>
      <option value="ur">اردو</option>
      <option value="ps">پښتو</option>
    </select>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { t } = useSiteLanguage();
  return (
    <header className="sticky top-0 z-40">
      <div className="bg-navy-deep text-navy-foreground">
        <div className="container-page flex h-9 items-center justify-between gap-4 text-xs">
          <p className="hidden sm:block text-navy-muted">
            {t.prototype}
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
                {t.nav[item.key]}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSelect />
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to="/login">
                <LogIn /> {t.login}
              </Link>
            </Button>
            <Button asChild variant="emergency" className="hidden sm:inline-flex">
              <Link to="/emergency">
                <Siren /> {t.help}
              </Link>
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label={t.menu}>
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
                    {t.nav.home}
                  </Link>
                  {NAV.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="rounded-md px-3 py-2.5 font-medium hover:bg-muted"
                      activeProps={{ className: "bg-secondary text-primary" }}
                    >
                      {t.nav[item.key]}
                    </Link>
                  ))}
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="mt-2 inline-flex items-center gap-2 rounded-md px-3 py-2.5 font-medium hover:bg-muted"
                  >
                    <LogIn className="size-4" aria-hidden /> {t.login}
                  </Link>
                  <Button asChild variant="emergency" className="mt-4">
                    <Link to="/emergency" onClick={() => setOpen(false)}>
                      <Siren /> {t.helpLong}
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
