# Architecture & Engineering Specifications — CronCraft

## Architectural Design

CronCraft is structured into modular layers with zero external runtime dependencies:

```
┌────────────────────────────────────────────────────────┐
│                   CLI / Public SDK                     │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────┐
│       Core Engine       │ │   Bento Studio (6464)   │
│  - Parser (5/6 Field)   │ │  - 24h Density Waterfall│
│  - Explainer & Natural  │ │  - Multi-Timezone Grid  │
│  - Next-Run Calculator  │ │  - Collision Radar      │
│  - Collision Auditor    │ │  - Crontab Parser       │
└─────────────────────────┘ └─────────────────────────┘
```

---

## Technical Characteristics
- **Startup Latency:** < 25ms cold boot time.
- **Memory Overhead:** < 20MB heap allocation during heavy crontab collision audits.
- **Precision:** Millisecond boundary date computation with month-end and leap-year compliance.

---
*Authored by [Jatin Sharma](https://jatinsh.netlify.app/)*
