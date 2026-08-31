# Security notes — RedactFlow

- **Synthetic data only:** Patterns are heuristics for demos; they will false-positive and false-negative on real corpora.
- **Client-side:** Text stays in the browser for this portfolio app — do not paste production secrets into demos.
- **Not DLP:** No policy engine, no logging sink, no compliance certification.
- **AWS / JWT patterns:** Simplified signatures for teaching; real secret scanning needs broader detectors and entropy checks.
