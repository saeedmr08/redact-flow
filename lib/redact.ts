/**
 * RedactFlow — detect and mask emails, phones, JWT-like tokens, AWS-like keys.
 */

export type RuleId = "email" | "phone" | "jwt" | "aws_key";

export type RedactRule = {
  id: RuleId;
  label: string;
  enabled: boolean;
  pattern: RegExp;
  replacement: string;
};

export type Finding = {
  ruleId: RuleId;
  match: string;
  index: number;
  length: number;
};

export type RedactResult = {
  redacted: string;
  findings: Finding[];
};

export const DEFAULT_RULES: RedactRule[] = [
  {
    id: "email",
    label: "Email",
    enabled: true,
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: "[EMAIL]",
  },
  {
    id: "phone",
    label: "Phone",
    enabled: true,
    // E.164-ish or common US formats
    pattern: /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g,
    replacement: "[PHONE]",
  },
  {
    id: "jwt",
    label: "JWT-like token",
    enabled: true,
    pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    replacement: "[JWT]",
  },
  {
    id: "aws_key",
    label: "AWS-like access key",
    enabled: true,
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
    replacement: "[AWS_KEY]",
  },
];

export function applyRules(
  text: string,
  rules: RedactRule[] = DEFAULT_RULES,
): RedactResult {
  const enabled = rules.filter((r) => r.enabled);
  const findings: Finding[] = [];

  // Collect all matches first to avoid index drift
  for (const rule of enabled) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags.includes("g") ? rule.pattern.flags : rule.pattern.flags + "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        ruleId: rule.id,
        match: m[0],
        index: m.index,
        length: m[0].length,
      });
    }
  }

  findings.sort((a, b) => a.index - b.index || b.length - a.length);

  // Drop overlapping matches (keep earliest / longest)
  const kept: Finding[] = [];
  let cursor = 0;
  for (const f of findings) {
    if (f.index < cursor) continue;
    kept.push(f);
    cursor = f.index + f.length;
  }

  const replacementFor = (id: RuleId) =>
    enabled.find((r) => r.id === id)?.replacement ?? "[REDACTED]";

  let redacted = "";
  let last = 0;
  for (const f of kept) {
    redacted += text.slice(last, f.index);
    redacted += replacementFor(f.ruleId);
    last = f.index + f.length;
  }
  redacted += text.slice(last);

  return { redacted, findings: kept };
}

export function toggleRule(rules: RedactRule[], id: RuleId, enabled: boolean): RedactRule[] {
  return rules.map((r) => (r.id === id ? { ...r, enabled } : r));
}

export function countByRule(findings: Finding[]): Record<RuleId, number> {
  const counts: Record<RuleId, number> = {
    email: 0,
    phone: 0,
    jwt: 0,
    aws_key: 0,
  };
  for (const f of findings) counts[f.ruleId] += 1;
  return counts;
}
