/**
 * Guided emergency intake for the assistant widget.
 *
 * This is a deterministic, rule-based flow (keyword classification + one question
 * at a time). It is the placeholder for the OpenAI-powered chatbot: when that is
 * connected, `classifyEmergency` and step parsing can be replaced by model calls
 * while the UI and confirmation step stay the same.
 */
import { DISTRICTS, getDistrict } from "@/lib/data/districts";
import {
  EMERGENCY_TYPES,
  EMERGENCY_TYPE_LABEL,
  normalizePkPhone,
  type EmergencyRequestInput,
  type EmergencyType,
} from "@/lib/emergency";

export type Lang = "en" | "ur";

export type Step =
  | "describe"
  | "type"
  | "district"
  | "tehsil"
  | "location"
  | "name"
  | "phone"
  | "people"
  | "description"
  | "confirm"
  | "done";

export interface Chip {
  label: string;
  value: string;
}

export interface BotMessage {
  text: string;
  chips?: Chip[];
  summary?: Partial<EmergencyRequestInput>;
}

export interface IntakeState {
  step: Step;
  data: Partial<EmergencyRequestInput>;
}

export const initialIntake = (): IntakeState => ({ step: "describe", data: {} });

/* ---------------- classification ---------------- */

const KEYWORDS: Record<EmergencyType, string[]> = {
  rescue: [
    "rescue",
    "trapped",
    "stuck",
    "stranded",
    "drown",
    "boat",
    "roof",
    "swept",
    "evacuat",
    "bachao",
    "phans",
    "ریسکیو",
    "بچاؤ",
    "بچاو",
    "پھنس",
    "ڈوب",
    "کشتی",
    "چھت",
  ],
  medical: [
    "medical",
    "doctor",
    "injur",
    "hurt",
    "sick",
    "medicine",
    "ambulance",
    "bleed",
    "fever",
    "pregnan",
    "dawai",
    "zakhmi",
    "bimar",
    "طبی",
    "ڈاکٹر",
    "زخمی",
    "بیمار",
    "دوائی",
    "دوا",
    "ایمبولینس",
    "بخار",
  ],
  water: [
    "drinking water",
    "clean water",
    "thirst",
    "potable",
    "water to drink",
    "peenay",
    "peene",
    "پینے",
    "پیاس",
    "صاف پانی",
  ],
  food: ["food", "hungry", "ration", "meal", "khana", "khurak", "کھانا", "خوراک", "راشن", "بھوک"],
  shelter: [
    "shelter",
    "tent",
    "homeless",
    "house destroyed",
    "place to stay",
    "roofless",
    "panah",
    "khaima",
    "پناہ",
    "خیمہ",
    "رہائش",
    "بے گھر",
  ],
};

/** Priority order matters: life-safety first. */
const PRIORITY: EmergencyType[] = ["rescue", "medical", "water", "food", "shelter"];

export function classifyEmergency(text: string): EmergencyType | null {
  const t = text.toLowerCase();
  for (const type of PRIORITY) {
    if (KEYWORDS[type].some((k) => t.includes(k))) return type;
  }
  return null;
}

const URDU_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export function toLatinDigits(s: string) {
  return s.replace(/[۰-۹٠-٩]/g, (c) => {
    const i = URDU_DIGITS.indexOf(c);
    return String(i >= 0 ? i : ARABIC_DIGITS.indexOf(c));
  });
}

export function matchDistrict(text: string) {
  const t = text.trim().toLowerCase();
  return DISTRICTS.find(
    (d) => t.includes(d.name.toLowerCase()) || t.includes(d.nameUr) || t === d.id,
  );
}

/* ---------------- copy ---------------- */

const COPY = {
  en: {
    greet:
      "Assalam-o-Alaikum. I can help you report a flood emergency. Briefly describe what is happening.",
    type: "What kind of help do you need?",
    understood: (t: string) => `Understood — this looks like a ${t} request.`,
    district: "Which district are you in?",
    tehsil: "Which tehsil?",
    location: "What is the exact location? Include village, street or a nearby landmark.",
    name: "What is your full name?",
    phone: "What mobile number can rescuers call? (e.g. 0300 1234567)",
    phoneErr:
      "That number doesn't look right. Please enter a Pakistani mobile number like 0300 1234567.",
    people: "How many people are affected?",
    peopleErr: "Please enter the number of people as a number, e.g. 5.",
    description: "Please describe the situation in a little more detail.",
    tooShort: "Could you add a bit more detail?",
    confirm: "Please check these details. Shall I submit this request?",
    confirmYes: "Confirm & submit",
    restart: "Start over",
    restarted: "No problem — let's start again. Briefly describe what is happening.",
    confirmHint: "Choose “Confirm & submit” or “Start over”.",
  },
  ur: {
    greet:
      "السلام علیکم۔ میں سیلاب کی ہنگامی صورتحال رپورٹ کرنے میں آپ کی مدد کر سکتا ہوں۔ مختصر بتائیں کیا ہو رہا ہے؟",
    type: "آپ کو کس قسم کی مدد چاہیے؟",
    understood: (t: string) => `سمجھ گیا — یہ ${t} کی درخواست ہے۔`,
    district: "آپ کس ضلع میں ہیں؟",
    tehsil: "کون سی تحصیل؟",
    location: "صحیح مقام کیا ہے؟ گاؤں، گلی یا قریبی نشانی بتائیں۔",
    name: "آپ کا پورا نام کیا ہے؟",
    phone: "ریسکیو ٹیم کس موبائل نمبر پر رابطہ کرے؟ (مثلاً 0300 1234567)",
    phoneErr: "نمبر درست نہیں لگ رہا۔ براہ کرم 0300 1234567 جیسا موبائل نمبر لکھیں۔",
    people: "کتنے لوگ متاثر ہیں؟",
    peopleErr: "براہ کرم تعداد عدد میں لکھیں، مثلاً 5۔",
    description: "براہ کرم صورتحال تھوڑی تفصیل سے بتائیں۔",
    tooShort: "تھوڑی مزید تفصیل بتائیں۔",
    confirm: "براہ کرم تفصیلات چیک کریں۔ کیا میں یہ درخواست جمع کر دوں؟",
    confirmYes: "تصدیق کریں اور جمع کریں",
    restart: "دوبارہ شروع کریں",
    restarted: "کوئی بات نہیں — دوبارہ شروع کرتے ہیں۔ مختصر بتائیں کیا ہو رہا ہے؟",
    confirmHint: "“تصدیق کریں” یا “دوبارہ شروع کریں” منتخب کریں۔",
  },
} as const;

export const greeting = (lang: Lang): BotMessage => ({ text: COPY[lang].greet });
export const restartedMessage = (lang: Lang): BotMessage => ({ text: COPY[lang].restarted });

const typeChips = (lang: Lang): Chip[] =>
  EMERGENCY_TYPES.map((t) => ({ label: EMERGENCY_TYPE_LABEL[t][lang], value: t }));

export function promptFor(step: Step, state: IntakeState, lang: Lang): BotMessage {
  const c = COPY[lang];
  switch (step) {
    case "type":
      return { text: c.type, chips: typeChips(lang) };
    case "district":
      return {
        text: c.district,
        chips: DISTRICTS.map((d) => ({ label: lang === "ur" ? d.nameUr : d.name, value: d.name })),
      };
    case "tehsil": {
      const d = DISTRICTS.find((x) => x.name === state.data.district);
      return { text: c.tehsil, chips: d ? d.tehsils.map((t) => ({ label: t, value: t })) : [] };
    }
    case "location":
      return { text: c.location };
    case "name":
      return { text: c.name };
    case "phone":
      return { text: c.phone };
    case "people":
      return {
        text: c.people,
        chips: ["1", "2-5", "6-20", "20+"].map((v) => ({ label: v, value: v })),
      };
    case "description":
      return { text: c.description };
    case "confirm":
      return {
        text: c.confirm,
        summary: state.data,
        chips: [
          { label: c.confirmYes, value: "__confirm" },
          { label: c.restart, value: "__restart" },
        ],
      };
    default:
      return { text: "" };
  }
}

const ORDER: Step[] = [
  "type",
  "district",
  "tehsil",
  "location",
  "name",
  "phone",
  "people",
  "description",
  "confirm",
];

function nextStep(data: Partial<EmergencyRequestInput>, from: Step): Step {
  const start = from === "describe" ? 0 : ORDER.indexOf(from) + 1;
  for (const s of ORDER.slice(start)) {
    if (s === "type" && data.type) continue;
    if (s === "description" && data.description) continue;
    return s;
  }
  return "confirm";
}

export type AdvanceResult =
  | { kind: "reply"; state: IntakeState; messages: BotMessage[] }
  | { kind: "submit"; state: IntakeState; data: EmergencyRequestInput }
  | { kind: "restart"; state: IntakeState };

/** Feeds one user answer into the flow and returns the next single question. */
export function advance(state: IntakeState, input: string, lang: Lang): AdvanceResult {
  const c = COPY[lang];
  const text = input.trim();
  const data = { ...state.data };
  const reply = (step: Step, prefix?: string): AdvanceResult => {
    const next = { step, data };
    const msgs: BotMessage[] = [];
    if (prefix) msgs.push({ text: prefix });
    msgs.push(promptFor(step, next, lang));
    return { kind: "reply", state: next, messages: msgs };
  };
  const retry = (msg: string): AdvanceResult => ({
    kind: "reply",
    state,
    messages: [{ text: msg }],
  });

  switch (state.step) {
    case "describe": {
      if (text.length < 3) return retry(c.tooShort);
      const type = classifyEmergency(text);
      if (type) data.type = type;
      if (text.length >= 10) data.description = text;
      const d = matchDistrict(text);
      const step = nextStep(data, "describe");
      if (d && step === "district") {
        data.district = d.name;
        return reply("tehsil", type ? c.understood(EMERGENCY_TYPE_LABEL[type][lang]) : undefined);
      }
      return reply(step, type ? c.understood(EMERGENCY_TYPE_LABEL[type][lang]) : undefined);
    }
    case "type": {
      const type = (EMERGENCY_TYPES as readonly string[]).includes(text)
        ? (text as EmergencyType)
        : classifyEmergency(text);
      if (!type) return { kind: "reply", state, messages: [promptFor("type", state, lang)] };
      data.type = type;
      return reply(nextStep(data, "type"));
    }
    case "district": {
      const d = matchDistrict(text);
      if (!d && text.length < 3) return retry(c.tooShort);
      data.district = d?.name ?? text;
      return reply("tehsil");
    }
    case "tehsil":
      if (text.length < 2) return retry(c.tooShort);
      data.tehsil = text;
      return reply("location");
    case "location":
      if (text.length < 5) return retry(c.tooShort);
      data.location = text;
      return reply("name");
    case "name":
      if (text.length < 2) return retry(c.tooShort);
      data.fullName = text;
      return reply("phone");
    case "phone": {
      const phone = normalizePkPhone(toLatinDigits(text));
      if (!phone) return retry(c.phoneErr);
      data.phone = phone;
      return reply("people");
    }
    case "people": {
      const m = toLatinDigits(text).match(/\d+/);
      const n = m ? parseInt(m[0], 10) : NaN;
      if (!Number.isFinite(n) || n < 1 || n > 100000) return retry(c.peopleErr);
      data.peopleAffected = n;
      return reply(nextStep(data, "people"));
    }
    case "description":
      if (text.length < 10) return retry(c.tooShort);
      data.description = text;
      return reply("confirm");
    case "confirm": {
      const t = text.toLowerCase();
      if (text === "__restart" || /^(no|nahi|نہیں)/.test(t)) {
        return { kind: "restart", state: initialIntake() };
      }
      if (text === "__confirm" || /^(yes|haan|han|ji|جی|ہاں|confirm)/.test(t)) {
        return {
          kind: "submit",
          state: { step: "done", data },
          data: data as EmergencyRequestInput,
        };
      }
      return retry(c.confirmHint);
    }
    default:
      return { kind: "reply", state, messages: [] };
  }
}

export function districtLabel(name: string | undefined, lang: Lang) {
  if (!name) return "";
  const d = DISTRICTS.find((x) => x.name === name) ?? getDistrict(name);
  return lang === "ur" && d ? d.nameUr : name;
}
