export const anomalyLabelMap: Record<string, string> = {
  sybil_pattern_detected: "Suspicious transaction pattern",
  low_diversity: "Limited payment history",
  new_identity: "Recently registered agent",
  simulation_failure: "Transaction failed in safety check",
  simulation_timeout: "Safety check timed out",
};

export function describeAnomalyFlag(flag: string): string {
  return anomalyLabelMap[flag] ?? flag;
}

export function scoreBand(score: number): "green" | "amber" | "red" {
  if (score >= 70) {
    return "green";
  }

  if (score >= 40) {
    return "amber";
  }

  return "red";
}