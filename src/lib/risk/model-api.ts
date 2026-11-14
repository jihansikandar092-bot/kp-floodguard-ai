import { assessRisk, type RiskAssessment, type RiskInput } from "./engine";

/** Contract a trained ML model must implement to replace the rule-based engine. */
export interface RiskModelAdapter {
  readonly name: string;
  /** Return null when the model cannot assess this input; the rule engine is then used. */
  assess(input: RiskInput & { districtId: string }): Promise<RiskAssessment | null>;
}

/** No ML model is connected yet; callers pass null and always get the rule-based engine. */
export async function assessWithFallback(
  model: RiskModelAdapter | null,
  input: RiskInput & { districtId: string },
): Promise<{ assessment: RiskAssessment | null; engine: string }> {
  if (model) {
    try {
      const result = await model.assess(input);
      if (result)
        return {
          assessment: { ...result, confidence: result.confidence === "Medium" ? "Medium" : "Low" },
          engine: model.name,
        };
    } catch (error) {
      console.error("Risk model failed; using rule-based engine", error);
    }
  }
  return { assessment: assessRisk(input), engine: "rule-based-v1" };
}
