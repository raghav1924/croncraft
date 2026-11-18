# ⏳ CronCraft

> **Developer-First Cron & Schedule Linter, Multi-Timezone Collision Detector, Execution Waterfall Simulator & Bento Grid Studio.**

[![CI](https://github.com/raghav1924/croncraft/actions/workflows/ci.yml/badge.svg)](https://github.com/raghav1924/croncraft/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success)](package.json)
[![Author](https://img.shields.io/badge/author-Jatin%20Sharma-38bdf8)](https://jatinsh.netlify.app/)

---

## ⚡ Overview

Scheduled jobs, background workers, and automation tasks frequently suffer from:
1. Syntax confusion between 5-field and 6-field formats, Sunday index quirks (`0` vs `7`), and step ranges.
2. Silent resource stampedes when multiple batch jobs unintentionally trigger concurrently (e.g. top-of-hour or midnight).
3. Daylight saving time drift across global cloud regions.

**CronCraft** is a zero-dependency TypeScript engine and interactive **Bento Grid Web Studio** (Port `6464`) that lints cron expressions, calculates next-run occurrences across 6 developer timezones, detects concurrent schedule collisions, and translates plain English to cron syntax.

---

## 🎨 Master Design System Integration

CronCraft integrates aesthetics from the **29 Master Design Patterns Catalog**:
- **Bento Grid (#12):** Modular 12-column layout partitioning expression inspection, multi-timezone matrices, 24h density waterfalls, and collision heatmaps.
- **Dark Mode UI (#20):** Deep obsidian background (`#07090e`) with electric sky-blue (`#38bdf8`) and violet (`#a855f7`) cyber highlights.
- **Cybercore (#24):** Monospace telemetry, live SVG density meters, and high-contrast status pills.
- **Swiss Design (#3):** Clean data grids with **Plus Jakarta Sans** and **JetBrains Mono**.
- **Glassmorphism (#10) & Neumorphism (#8):** Translucent card backdrops with soft radial glows.

---

## 🌟 Key Capabilities

- **Zero External npm Dependencies:** Built natively on Node.js runtimes (`node:http`, `node:crypto`, `node:fs`, `node:path`).
- **Multi-Dialect Parser:** Supports 5-field Unix, 6-field seconds, presets (`@daily`, `@weekly`, `@hourly`), text aliases (`MON-FRI`, `JAN-DEC`), and step intervals (`*/15`).
- **Multi-Timezone Matrix:** Real-time synchronized next-run matrix across UTC, EST (New York), PST (San Francisco), GMT (London), IST (India), and JST (Tokyo).
- **Collision & Contention Auditor:** Ingests single schedules or entire crontabs, scoring concurrency risk (0-100%) and surfacing cluster hotspots.
- **Natural Language Translation:** Bidirectional conversion between plain English ("every 15 minutes on weekdays") and standard cron syntax.
- **Interactive Bento Studio (Port 6464):** One-command visual workspace with live SVG density charts and schedule stagger recommendations.

---

## 📦 Quickstart

### Run with NPX
```bash
npx croncraft next "*/15 * * * *" -n 5
```

### Launch Bento Grid Web Studio
```bash
croncraft studio --port 6464
```
Navigate to `http://localhost:6464` in your browser.

---

## 💻 CLI Commands

```
croncraft next "<expr>" [-n 5]     Compute next run dates with multi-timezone matrix
croncraft explain "<expr>"          Translate cron expression to plain English
croncraft natural "<phrase>"        Convert English phrase to cron expression
croncraft audit <crontab-file>      Audit multi-job file for schedule collisions
croncraft studio [--port 6464]      Launch interactive Bento Grid Web Studio
```

---

## 👤 Author Attribution

- **Creator:** Jatin Sharma
- **Portfolio:** [https://jatinsh.netlify.app/](https://jatinsh.netlify.app/)
- **GitHub:** [@raghav1924](https://github.com/raghav1924)
- **Email:** [raghavjatin245@gmail.com](mailto:raghavjatin245@gmail.com)
- **Lab Build:** #13 (2026-11-18)

---

## 📄 License

Licensed under the [MIT License](LICENSE).
