import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  DEFAULT_RULES,
  applyRules,
  type Finding,
  type RedactRule,
  type RuleId,
} from "./redact";

const DATA_FILE = path.join(process.cwd(), "data", "redact.json");

export type RedactJob = {
  text: string;
  enabledRuleIds: RuleId[];
  redacted: string;
  findings: Finding[];
  at: number;
};

export type RuleToggle = { id: RuleId; enabled: boolean };

export function loadLastJob(): RedactJob | null {
  try {
    const raw = JSON.parse(readFileSync(DATA_FILE, "utf8")) as RedactJob;
    if (!raw || typeof raw.text !== "string" || !Array.isArray(raw.findings)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function rulesFromToggles(toggles?: RuleToggle[]): RedactRule[] {
  if (!toggles?.length) return DEFAULT_RULES;
  const map = new Map(toggles.map((t) => [t.id, t.enabled]));
  return DEFAULT_RULES.map((r) => ({
    ...r,
    enabled: map.has(r.id) ? Boolean(map.get(r.id)) : r.enabled,
  }));
}

export function runRedact(
  text: string,
  toggles?: RuleToggle[],
): { result: ReturnType<typeof applyRules>; job: RedactJob } {
  const rules = rulesFromToggles(toggles);
  const result = applyRules(text, rules);
  const job: RedactJob = {
    text,
    enabledRuleIds: rules.filter((r) => r.enabled).map((r) => r.id),
    redacted: result.redacted,
    findings: result.findings,
    at: Date.now(),
  };
  mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  writeFileSync(DATA_FILE, `${JSON.stringify(job, null, 2)}\n`);
  return { result, job };
}
