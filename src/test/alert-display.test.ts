import { describe, expect, it } from "vitest";
import {
  alertStatusText,
  displayReason,
  formatDay,
  isWithdrawn,
  stripWithdrawalNote,
  withdrawalLabel,
  withdrawalSentence,
  WITHDRAWAL_NOTE_EN,
} from "@/lib/alerts/alert-display";

// Fixed fixtures for tests only; never shown in the UI.
const UR_NOTE = "درست کردہ اسکورنگ اصول کی وجہ سے سابقہ انتباہ بند کر دیا گیا۔";
const PS_NOTE = "د سم شوي نمرې اصولو له امله پخوانی خبرداری وتړل شو.";
const REASON_EN = "Little rain forecast (0 mm in 72 h).";
const REASON_UR = "بارش کی پیش گوئی نہیں۔";
const REASON_PS = "د بارش وړاندوینه نشته.";

const withdrawnEn = `${REASON_EN} ${WITHDRAWAL_NOTE_EN}`;
const withdrawnUr = `${REASON_UR} ${UR_NOTE}`;
const withdrawnPs = `${REASON_PS} ${PS_NOTE}`;

const base = {
  resolved_at: null,
  type: "active",
  horizon_hours: null,
  expected_by: null,
};

describe("withdrawn alert detection", () => {
  it("flags only rows whose stored reason ends with the correction note", () => {
    expect(isWithdrawn({ reason_text: withdrawnEn })).toBe(true);
    expect(isWithdrawn({ reason_text: REASON_EN })).toBe(false);
    expect(isWithdrawn({ reason_text: `${WITHDRAWAL_NOTE_EN} caused this` })).toBe(false);
  });

  it("removes the note from every language template", () => {
    expect(stripWithdrawalNote(withdrawnEn, "en")).toBe(REASON_EN);
    expect(stripWithdrawalNote(withdrawnUr, "ur")).toBe(REASON_UR);
    expect(stripWithdrawalNote(withdrawnPs, "ps")).toBe(REASON_PS);
    expect(stripWithdrawalNote(REASON_EN, "en")).toBe(REASON_EN);
  });

  it("shows the original reason without the note, per language", () => {
    const alert = {
      ...base,
      reason_text: withdrawnEn,
      reason_templates: { en: withdrawnEn, ur: withdrawnUr },
    };
    expect(displayReason(alert, "en")).toBe(REASON_EN);
    expect(displayReason(alert, "ur")).toBe(REASON_UR);
    // Pashto template missing -> English fallback, still without the note.
    expect(displayReason(alert, "ps")).toBe(REASON_EN);
  });

  it("keeps ordinary reasons untouched", () => {
    const alert = { ...base, reason_text: REASON_EN, reason_templates: { en: REASON_EN } };
    expect(displayReason(alert, "en")).toBe(REASON_EN);
  });
});

describe("alert status line", () => {
  it("never describes a resolved alert as active", () => {
    const text = alertStatusText({
      ...base,
      reason_text: REASON_EN,
      resolved_at: "2026-11-15T15:06:45.796Z",
    });
    expect(text).toBe("Resolved 2026-11-15 15:06 UTC");
    expect(text).not.toContain("Active now");
  });

  it("keeps active and expected wording", () => {
    expect(alertStatusText({ ...base, reason_text: REASON_EN })).toBe("Active now");
    expect(
      alertStatusText({
        ...base,
        reason_text: REASON_EN,
        type: "expected",
        horizon_hours: 24,
        expected_by: "2026-11-16T00:00:00Z",
      }),
    ).toBe("Expected within 24 hours · By 2026-11-16 00:00 UTC");
    expect(
      alertStatusText({
        ...base,
        reason_text: REASON_EN,
        type: "expected",
        horizon_hours: 24,
        expected_by: null,
      }),
    ).toBe("Expected within 24 hours · By Not available");
  });
});

describe("withdrawn wording", () => {
  it("replaces the risk level with a withdrawal label", () => {
    expect(withdrawalLabel("en")).toBe("Withdrawn: scoring correction");
    expect(withdrawalLabel("ur")).toBe("واپس لیا گیا: اسکورنگ اصلاح");
    expect(withdrawalLabel("ps")).toBe("شپښول شوی: د نمرې سمون");
  });

  it("states the correction as a full sentence with the resolved date", () => {
    expect(formatDay("2026-11-15T15:06:45.796Z")).toBe("15 Nov 2026");
    expect(withdrawalSentence("2026-11-15T15:06:45.796Z", "en")).toBe(
      "Withdrawn after a scoring correction on 15 Nov 2026.",
    );
    expect(withdrawalSentence("2026-11-15T15:06:45.796Z", "ur")).toBe(
      "اسکورنگ اصلاح کے بعد 15 Nov 2026 کو واپس لیا گیا۔",
    );
    expect(withdrawalSentence("2026-11-15T15:06:45.796Z", "ps")).toBe(
      "د نمرې له سمون وروسته د 15 Nov 2026 په ورځ شپښول شو.",
    );
  });
});
