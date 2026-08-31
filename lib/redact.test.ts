import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULES,
  applyRules,
  countByRule,
  toggleRule,
} from "./redact";

const SAMPLE = [
  "Contact jane.doe@example.com or +1 (415) 555-0199.",
  "Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  "Key AKIAIOSFODNN7EXAMPLE must stay masked.",
].join("\n");

describe("applyRules", () => {
  it("masks email, phone, jwt, and aws-like keys", () => {
    const { redacted, findings } = applyRules(SAMPLE);
    expect(redacted).toContain("[EMAIL]");
    expect(redacted).toContain("[PHONE]");
    expect(redacted).toContain("[JWT]");
    expect(redacted).toContain("[AWS_KEY]");
    expect(redacted).not.toContain("jane.doe@example.com");
    expect(redacted).not.toContain("AKIAIOSFODNN7EXAMPLE");
    const counts = countByRule(findings);
    expect(counts.email).toBe(1);
    expect(counts.phone).toBe(1);
    expect(counts.jwt).toBe(1);
    expect(counts.aws_key).toBe(1);
  });

  it("respects disabled rules", () => {
    const rules = toggleRule(DEFAULT_RULES, "email", false);
    const { redacted, findings } = applyRules(SAMPLE, rules);
    expect(redacted).toContain("jane.doe@example.com");
    expect(countByRule(findings).email).toBe(0);
  });
});
