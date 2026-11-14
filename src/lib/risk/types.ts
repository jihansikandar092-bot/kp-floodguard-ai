import type { Confidence, FactorKey, RiskFactor, RiskLevel } from "./engine";

export interface StoredRiskAssessment {
  districtId: string;
  snapshotId: string | null;
  score: number;
  level: RiskLevel;
  confidence: Confidence;
  factors: Record<FactorKey, RiskFactor>;
  reasonText: string;
  computedAt: string;
}
