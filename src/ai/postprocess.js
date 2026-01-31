import { luhnCheck } from "./validators.js";

export function postProcessExtraction(result, confidenceThreshold = 0.8) {
  if (!result || typeof result !== "object") return result;
  const { fields = {}, confidence = {}, trace = {} } = result;
  const org = fields.organisation_number;
  if (org && !luhnCheck(org)) {
    confidence.organisation_number = Math.min(confidence.organisation_number || 0.5, 0.3);
  }
  const lowConfidence = Object.entries(confidence)
    .filter(([, value]) => typeof value === "number" && value < confidenceThreshold)
    .map(([key]) => key);
  return { fields, confidence, trace, lowConfidence };
}
