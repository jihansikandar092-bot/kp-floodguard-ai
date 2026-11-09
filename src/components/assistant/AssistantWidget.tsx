import { Link } from "@tanstack/react-router";
import { Bot, Mic, Phone, RotateCcw, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  advance,
  districtLabel,
  greeting,
  initialIntake,
  promptFor,
  restartedMessage,
  type BotMessage,
  type IntakeState,
  type Lang,
} from "@/lib/assistant/intake";
import { EMERGENCY_TYPE_LABEL } from "@/lib/emergency";
import { submitEmergencyRequest } from "@/lib/api/requests";

export const OPEN_ASSISTANT_EVENT = "kpfg:open-assistant";
export function openAssistant() {
  window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT));
}

interface ChatMessage extends BotMessage {
  id: number;
  role: "bot" | "user";
  requestId?: string;
}
// Server-side relay to the n8n Chat Agent (avoids CORS, keeps the webhook off the client).
const N8N_CHAT_PROXY = "/api/public/n8n-chat";

const UI = {
  en: {
    title: "Emergency Assistant",
    status: "Guided intake · AI model not connected yet",
    danger: "Life in danger? Call Rescue 1122 now.",
    placeholder: "Type your message…",
    mic: "Voice assistance (Retell AI) — coming soon",
    send: "Send",
    reset: "Start over",
    summaryTitle: "Request summary",
    saved: (id: string) =>
      `Your request has been recorded as ${id}. Important: it is saved on this device only as a demo record and has NOT been sent to rescue teams — the coordination system is not connected yet. If anyone is in danger, call Rescue 1122 immediately.`,
    newReq: "Start a new request",
  },
  ur: {
    title: "ہنگامی معاون",
    status: "رہنمائی والا فارم · AI ابھی منسلک نہیں",
    danger: "جان کو خطرہ ہے؟ فوراً ریسکیو 1122 پر کال کریں۔",
    placeholder: "اپنا پیغام لکھیں…",
    mic: "آواز کی سہولت (Retell AI) — جلد آ رہی ہے",
    send: "بھیجیں",
    reset: "دوبارہ شروع کریں",
    summaryTitle: "درخواست کا خلاصہ",
    saved: (id: string) =>
      `آپ کی درخواست ${id} کے طور پر درج ہو گئی ہے۔ اہم: یہ صرف اس ڈیوائس پر ڈیمو ریکارڈ کے طور پر محفوظ ہے اور ریسکیو ٹیموں کو نہیں بھیجی گئی — رابطہ نظام ابھی منسلک نہیں۔ خطرے کی صورت میں فوراً 1122 پر کال کریں۔`,
    newReq: "نئی درخواست شروع کریں",
  },
} as const;

const FIELD_LABELS = {
  en: { type: "Type", district: "District", tehsil: "Tehsil", location: "Location", fullName: "Name", phone: "Phone", peopleAffected: "People", description: "Details" },
  ur: { type: "قسم", district: "ضلع", tehsil: "تحصیل", location: "مقام", fullName: "نام", phone: "فون", peopleAffected: "افراد", description: "تفصیل" },
} as const;

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [state, setState] = useState<IntakeState>(initialIntake);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionIdRef = useRef(crypto.randomUUID());
  const [chatMode, setChatMode] = useState<"intake" | "ai">("intake");
  const idRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const push = useCallback((msgs: Omit<ChatMessage, "id">[]) => {
    setMessages((prev) => [...prev, ...msgs.map((m) => ({ ...m, id: ++idRef.current }))]);
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_ASSISTANT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) push([{ role: "bot", ...greeting(lang) }]);
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const changeLang = (next: Lang) => {
    if (next === lang) return;
    setLang(next);
    if (state.step === "describe" || state.step === "done") {
      push([{ role: "bot", ...greeting(next) }]);
    } else {
      push([{ role: "bot", ...promptFor(state.step, state, next) }]);
    }
  };
  const switchChatMode = (mode: "intake" | "ai") => {
  setChatMode(mode);
  setMessages([]);
  if (mode === "ai") {
    push([
      {
        role: "bot",
        text:
          lang === "ur"
            ? "السلام علیکم! میں FloodGuard AI ہوں۔ آپ سیلاب، موسم، پانی کی سطح یا حفاظتی اقدامات کے بارے میں پوچھ سکتے ہیں۔"
            : "Hello! I am FloodGuard AI. Ask me about floods, weather, river levels, or safety guidance.",
      },
    ]);
  } else {
    push([{ role: "bot", ...greeting(lang) }]);
  }
};

  const reset = () => {
    setState(initialIntake());
    push([{ role: "bot", ...restartedMessage(lang) }]);
  };

  const handle = async (raw: string, display?: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    if (chatMode === "ai") {
      push([{ role: "user", text }]);
setInput("");
  setBusy(true);
  try {
    const response = await fetch(N8N_CHAT_PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sessionIdRef.current, chatInput: text }),
    });
    const data = (await response.json().catch(() => ({}))) as { reply?: string; error?: string };
    if (!response.ok || !data.reply) throw new Error(data.error ?? "upstream_error");
    push([{ role: "bot", text: data.reply }]);
      } catch (error) {
        console.error("AI Chat Error:", error);
        const code = error instanceof Error ? error.message : "";
        const inactive = code === "workflow_inactive";
        push([
          {
            role: "bot",
            text:
              lang === "ur"
                ? inactive
                  ? "AI معاون اس وقت دستیاب نہیں ہے۔ براہ کرم بعد میں کوشش کریں۔ ہنگامی صورت میں فوراً 1122 پر کال کریں۔"
                  : "معذرت، AI معاون سے رابطہ نہیں ہو سکا۔ دوبارہ کوشش کریں۔ ہنگامی صورت میں فوراً 1122 پر کال کریں۔"
                : inactive
                  ? "The AI assistant is currently unavailable. Please try again later. If anyone is in danger, call Rescue 1122 now."
                  : "Sorry, I couldn't reach the AI assistant. Please try again. If anyone is in danger, call Rescue 1122 now.",
          },
        ]);
      } finally {
        setBusy(false);
      }
      return;
    }
    let current = state;
    if (state.step === "done") {
      if (text === "__new") return reset();
      current = initialIntake();
    }
    push([{ role: "user", text: display ?? text }]);
    setInput("");
    const result = advance(current, text, lang);
    if (result.kind === "reply") {
      setState(result.state);
      push(result.messages.map((m) => ({ role: "bot" as const, ...m })));
    } else if (result.kind === "restart") {
      setState(result.state);
      push([{ role: "bot", ...restartedMessage(lang) }]);
    } else {
      setBusy(true);
      try {
        const { request } = await submitEmergencyRequest(result.data, "assistant");
        setState(result.state);
        push([
          {
            role: "bot",
            text: UI[lang].saved(request.id),
            requestId: request.id,
            chips: [{ label: UI[lang].newReq, value: "__new" }],
          },
        ]);
      } finally {
        setBusy(false);
      }
    }
  };

  const ui = UI[lang];
  const lastBotId = [...messages].reverse().find((m) => m.role === "bot")?.id;
  const rtl = lang === "ur";

  return (
    <TooltipProvider delayDuration={150}>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2.5 rounded-full bg-primary py-3 pl-3 pr-5 text-sm font-semibold text-primary-foreground shadow-float transition-transform hover:-translate-y-0.5 focus-visible:outline-offset-4"
          aria-label="Open emergency assistant"
        >
          <span className="relative grid size-8 place-items-center rounded-full bg-emergency">
            <span className="absolute inset-0 rounded-full bg-emergency animate-pulse-ring" aria-hidden />
            <Bot className="relative size-4.5" aria-hidden />
          </span>
          Emergency Assistant
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={ui.title}
          className="fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] flex-col overflow-hidden rounded-t-2xl border bg-card shadow-float animate-fade-up sm:inset-x-auto sm:bottom-5 sm:right-5 sm:h-[min(640px,calc(100dvh-6rem))] sm:w-[400px] sm:rounded-2xl"
        >
          <header className="bg-navy-deep px-4 pb-3 pt-4 text-navy-foreground">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-emergency">
                  <Bot className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-display font-bold leading-tight" lang={lang} dir={rtl ? "rtl" : "ltr"}>{ui.title}</p>
                  <p className="text-xs text-navy-muted" lang={lang} dir={rtl ? "rtl" : "ltr"}>{ui.status}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="on-navy" size="icon" className="size-8 border-0" onClick={reset} aria-label={ui.reset}>
                  <RotateCcw />
                </Button>
                <Button variant="on-navy" size="icon" className="size-8 border-0" onClick={() => setOpen(false)} aria-label="Close assistant">
                  <X />
                </Button>
              </div>
            </div>
            <div className="mt-3 flex gap-1 rounded-lg bg-navy p-1 text-xs" role="group" aria-label="Language">
              <LangButton active={lang === "en"} onClick={() => changeLang("en")}>English</LangButton>
              <LangButton active={lang === "ur"} onClick={() => changeLang("ur")} lang="ur">اردو</LangButton>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex-1">
                    <LangButton active={false} disabled lang="ps">پښتو · soon</LangButton>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Pashto support will be added with the AI language model.</TooltipContent>
              </Tooltip>
            </div>
            <div className="mt-3 flex gap-2">
  <button
    type="button"
    onClick={() => switchChatMode("intake")}
    className={cn("flex-1 rounded-md px-3 py-2 text-xs font-semibold", chatMode === "intake" ? "bg-white text-slate-900" : "bg-navy text-white")}
  >
    {lang === "ur" ? "ہنگامی فارم" : "Emergency Form"}
  </button>
  <button
    type="button"
    onClick={() => switchChatMode("ai")}
    className={cn("flex-1 rounded-md px-3 py-2 text-xs font-semibold", chatMode === "ai" ? "bg-white text-slate-900" : "bg-navy text-white")}
  >
    {lang === "ur" ? "AI چیٹ" : "AI Chat"}
  </button>
</div>
          </header>

          <a href="tel:1122" className="flex items-center gap-2 bg-emergency px-4 py-2 text-xs font-semibold text-emergency-foreground" lang={lang} dir={rtl ? "rtl" : "ltr"}>
            <Phone className="size-3.5 shrink-0" aria-hidden /> {ui.danger}
          </a>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-muted/50 px-4 py-4" aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
                <div
                  lang={lang}
                  dir="auto"
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm border bg-card text-card-foreground",
                    m.requestId && "border-demo-foreground/30 bg-demo text-demo-foreground",
                  )}
                >
                  {m.text}
                  {m.summary && <Summary data={m.summary} lang={lang} title={ui.summaryTitle} />}
                  {m.requestId && (
                    <Link to="/admin" className="mt-2 block text-xs font-semibold underline" onClick={() => setOpen(false)}>
                      View in coordinator preview →
                    </Link>
                  )}
                </div>
                {m.chips && m.id === lastBotId && (
                  <div className="mt-2 flex max-w-full flex-wrap gap-1.5" dir={rtl ? "rtl" : "ltr"}>
                    {m.chips.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        disabled={busy}
                        onClick={() => handle(c.value, c.label)}
                        className={cn(
                          "rounded-full border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:bg-secondary",
                          c.value === "__confirm" && "border-emergency bg-emergency text-emergency-foreground hover:bg-emergency/90 hover:border-emergency",
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && chatMode === "ai" && (
              <div className="flex items-start" role="status" aria-label="AI is typing">
                <div className="flex gap-1 rounded-2xl rounded-bl-sm border bg-card px-3.5 py-3">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <form
            className="flex items-center gap-2 border-t bg-card p-3"
            onSubmit={(e) => {
              e.preventDefault();
              handle(input);
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button type="button" variant="outline" size="icon" disabled aria-label={ui.mic}>
                    <Mic />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{ui.mic}</TooltipContent>
            </Tooltip>
            <label htmlFor="assistant-input" className="sr-only">{ui.placeholder}</label>
            <input
              id="assistant-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={ui.placeholder}
              dir="auto"
              lang={lang}
              autoComplete="off"
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || busy} aria-label={ui.send}>
              <Send />
            </Button>
          </form>
        </div>
      )}
    </TooltipProvider>
  );
}

function LangButton({
  active,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean; lang?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "w-full flex-1 rounded-md px-2 py-1.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        active ? "bg-navy-foreground text-navy-deep" : "text-navy-foreground hover:bg-navy-line",
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Summary({ data, lang, title }: { data: BotMessage["summary"]; lang: Lang; title: string }) {
  if (!data) return null;
  const L = FIELD_LABELS[lang];
  const rows: [string, string | undefined][] = [
    [L.type, data.type ? EMERGENCY_TYPE_LABEL[data.type][lang] : undefined],
    [L.district, districtLabel(data.district, lang)],
    [L.tehsil, data.tehsil],
    [L.location, data.location],
    [L.fullName, data.fullName],
    [L.phone, data.phone],
    [L.peopleAffected, data.peopleAffected?.toString()],
    [L.description, data.description],
  ];
  return (
    <div className="mt-3 rounded-lg border bg-muted/60 p-3">
      <p className="eyebrow text-muted-foreground">{title}</p>
      <dl className="mt-2 space-y-1.5 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[80px_1fr] gap-2">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="break-words font-medium">{v || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
