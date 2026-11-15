import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { SITE_TEXT, type SiteLang } from "./site-text";

const KEY = "kpf-site-lang";
const Ctx = createContext<{ lang: SiteLang; setLang: (l: SiteLang) => void }>({
  lang: "en",
  setLang: () => {},
});

export function SiteLanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<SiteLang>("en");
  useEffect(() => {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "ur" || saved === "ps") setLangState(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "en" ? "ltr" : "rtl";
  }, [lang]);
  const setLang = useCallback((l: SiteLang) => {
    setLangState(l);
    window.localStorage.setItem(KEY, l);
  }, []);
  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export function useSiteLanguage() {
  const { lang, setLang } = useContext(Ctx);
  return { lang, setLang, t: SITE_TEXT[lang], rtl: lang !== "en" };
}
