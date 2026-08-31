"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_RULES,
  countByRule,
  toggleRule,
  type Finding,
  type RedactRule,
  type RuleId,
} from "@/lib/redact";

type DiskJob = {
  text: string;
  enabledRuleIds: RuleId[];
  redacted: string;
  findings: Finding[];
  at: number;
};

const SAMPLE = `Support ticket #4821
From: alex.kim@contoso-mail.com
Phone: +1 (628) 555-0142

Auth header leftover in logs:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

Misconfigured env dump:
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
`;

const ONLY_EMAIL = `Please reply to ops@northwind.example when the ticket is done.`;

const NO_SECRETS = `The warehouse team posted the weekly summary for Northwind.`;

const CHIPS = [
  { label: "Support ticket", text: SAMPLE },
  { label: "Only email", text: ONLY_EMAIL },
  { label: "No secrets", text: NO_SECRETS },
] as const;

function trunc(value: string, n = 48): string {
  return value.length > n ? `${value.slice(0, n)}…` : value;
}

function rulesFromJob(job: DiskJob): RedactRule[] {
  const enabled = new Set(job.enabledRuleIds);
  return DEFAULT_RULES.map((r) => ({ ...r, enabled: enabled.has(r.id) }));
}

export default function HomePage() {
  const [text, setText] = useState(SAMPLE);
  const [rules, setRules] = useState<RedactRule[]>(DEFAULT_RULES);
  const [redacted, setRedacted] = useState("");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [hasResult, setHasResult] = useState(false);
  const [diskJob, setDiskJob] = useState<DiskJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counts = countByRule(findings);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/redact");
        const data = (await res.json()) as { job?: DiskJob | null };
        if (data.job) setDiskJob(data.job);
      } catch {
        /* inbox of last job is optional */
      }
    })();
  }, []);

  function onToggle(id: RuleId, enabled: boolean) {
    setRules((prev) => toggleRule(prev, id, enabled));
  }

  function restoreLastJob() {
    if (!diskJob) return;
    setText(diskJob.text);
    setRules(rulesFromJob(diskJob));
    setRedacted(diskJob.redacted);
    setFindings(diskJob.findings);
    setHasResult(true);
    setError(null);
  }

  async function runRedact() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/redact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          rules: rules.map((r) => ({ id: r.id, enabled: r.enabled })),
        }),
      });
      const data = (await res.json()) as {
        redacted?: string;
        findings?: Finding[];
        job?: DiskJob;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setRedacted(data.redacted ?? "");
      setFindings(data.findings ?? []);
      setHasResult(true);
      if (data.job) setDiskJob(data.job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <header className="hero">
        <p className="brand">RedactFlow</p>
        <h1>Black-bar the sensitive bits.</h1>
        <p className="lede">
          Synthetic text in, masked text out via <code>POST /api/redact</code>.
          Last job optionally saved to data/redact.json.
        </p>
      </header>

      {diskJob ? (
        <p className="disk">
          Last job on disk
          <button type="button" onClick={restoreLastJob}>
            Restore
          </button>
        </p>
      ) : null}

      <div className="chips">
        {CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            className={text === chip.text ? "on" : ""}
            onClick={() => {
              setText(chip.text);
              setHasResult(false);
              setRedacted("");
              setFindings([]);
              setError(null);
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="rules">
        {rules.map((r) => (
          <label key={r.id} className={r.enabled ? "on" : ""}>
            <input
              type="checkbox"
              checked={r.enabled}
              onChange={(e) => onToggle(r.id, e.target.checked)}
            />
            {r.label}
            <span>{counts[r.id]}</span>
          </label>
        ))}
      </div>

      <div className="actions">
        <button type="button" disabled={busy} onClick={() => void runRedact()}>
          {busy ? "Redacting…" : "Redact via API"}
        </button>
        {error ? <p className="err">{error}</p> : null}
      </div>

      <div className="panes">
        <label>
          Source
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} />
        </label>
        <label>
          Redacted
          <pre className="out">{redacted || "Run Redact via API to see output."}</pre>
        </label>
      </div>

      {hasResult ? (
        <section className="findings">
          <h2>Findings</h2>
          {findings.length === 0 ? (
            <p className="empty">No matches — rules did not fire on this text.</p>
          ) : (
            <ul>
              {findings.map((f, i) => (
                <li key={`${f.ruleId}-${f.index}-${i}`}>
                  <code>{f.ruleId}</code>
                  <span>{trunc(f.match)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <style jsx>{`
        .page {
          max-width: 1000px;
          margin: 0 auto;
          padding: 3rem 1.25rem 4rem;
        }
        .hero {
          margin-bottom: 1.5rem;
          animation: punch 0.55s ease both;
        }
        .brand {
          font-family: var(--font-archivo), var(--font-display);
          font-size: clamp(2.4rem, 9vw, 3.8rem);
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 0.95;
          background: linear-gradient(#fff 55%, transparent 55%),
            repeating-linear-gradient(
              90deg,
              var(--bar),
              var(--bar) 18px,
              transparent 18px,
              transparent 26px
            );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          filter: drop-shadow(0 1px 0 #000);
        }
        h1 {
          font-family: var(--font-archivo), var(--font-display);
          font-size: clamp(1.1rem, 3vw, 1.45rem);
          font-weight: 400;
          max-width: 14ch;
          margin: 1rem 0 0.55rem;
        }
        .lede {
          margin: 0;
          color: var(--fog);
          max-width: 48ch;
        }
        .disk {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0 0 1rem;
          color: var(--fog);
          font-size: 0.9rem;
        }
        .disk button {
          font-family: var(--font-archivo), var(--font-display);
          background: transparent;
          color: var(--white);
          border: 1px solid #2c2c32;
          padding: 0.4rem 0.75rem;
          cursor: pointer;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          margin-bottom: 0.85rem;
        }
        .chips button {
          font: inherit;
          font-size: 0.85rem;
          background: var(--panel);
          color: var(--fog);
          border: 1px solid #2c2c32;
          padding: 0.4rem 0.7rem;
          cursor: pointer;
        }
        .chips button.on {
          border-color: var(--bar-soft);
          color: var(--white);
          background: #1f1414;
        }
        .rules {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
          margin: 0.25rem 0 0.75rem;
          animation: punch 0.7s ease both;
        }
        .rules label {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 0.7rem;
          background: var(--panel);
          border: 1px solid #2c2c32;
          font-size: 0.9rem;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .rules label.on {
          border-color: var(--bar-soft);
          background: #1f1414;
        }
        .rules span {
          font-family: var(--font-jet), var(--font-mono);
          font-size: 0.75rem;
          color: var(--fog);
          margin-left: 0.25rem;
        }
        .actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .actions button {
          font-family: var(--font-archivo), var(--font-display);
          background: var(--bar);
          color: #fff;
          border: 0;
          padding: 0.65rem 1.1rem;
          cursor: pointer;
        }
        .actions button:disabled {
          opacity: 0.6;
          cursor: wait;
        }
        .err {
          margin: 0;
          color: #f07178;
          font-size: 0.85rem;
        }
        .panes {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        label {
          display: grid;
          gap: 0.4rem;
          font-size: 0.78rem;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--fog);
        }
        textarea,
        .out {
          font-family: var(--font-jet), var(--font-mono);
          font-size: 0.82rem;
          line-height: 1.45;
          background: var(--panel);
          color: var(--white);
          border: 1px solid #2c2c32;
          padding: 0.9rem;
          min-height: 320px;
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          text-transform: none;
          letter-spacing: normal;
        }
        textarea {
          width: 100%;
          resize: vertical;
        }
        .out {
          animation: punch 0.45s ease both;
          box-shadow: inset 8px 0 0 var(--bar);
        }
        .findings {
          margin-top: 1.25rem;
          animation: punch 0.4s ease both;
        }
        .findings h2 {
          font-family: var(--font-archivo), var(--font-display);
          font-size: 0.95rem;
          font-weight: 400;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin: 0 0 0.65rem;
        }
        .empty {
          margin: 0;
          color: var(--fog);
        }
        .findings ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 0.4rem;
        }
        .findings li {
          display: flex;
          gap: 0.75rem;
          align-items: baseline;
          background: var(--panel);
          border: 1px solid #2c2c32;
          padding: 0.5rem 0.75rem;
          font-size: 0.85rem;
        }
        .findings code {
          font-family: var(--font-jet), var(--font-mono);
          font-size: 0.75rem;
          color: #e07070;
          min-width: 5.5rem;
        }
        .findings span {
          font-family: var(--font-jet), var(--font-mono);
          color: var(--fog);
          word-break: break-all;
        }
        @keyframes punch {
          from {
            opacity: 0;
            transform: scale(0.985);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @media (max-width: 800px) {
          .panes {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
