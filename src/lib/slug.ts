import { randomBytes } from "crypto";

// 12 URL-safe characters — short enough to read out loud, random enough
// that a report link can't be guessed by walking nearby slugs.
export function generateReportSlug(): string {
  return randomBytes(9).toString("base64url");
}
