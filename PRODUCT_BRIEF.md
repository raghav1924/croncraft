# CronCraft - Product Brief & Specification

**Date:** 2026-11-18  
**Build:** #13  
**Author:** Jatin Sharma (<raghavjatin245@gmail.com>)  
**Portfolio:** [https://jatinsh.netlify.app/](https://jatinsh.netlify.app/)  
**Repository:** [https://github.com/raghav1924/croncraft](https://github.com/raghav1924/croncraft)

---

## 1. Executive Summary & Problem Space

Scheduled automation, distributed background jobs, and cloud event schedules (AWS EventBridge, Kubernetes CronJobs, Celery schedules, Unix crontab, GitHub Actions workflows) are essential to every backend and data architecture.

However, scheduled tasks suffer from insidious production failures:
1. **Cron Syntax Complexity & Ambiguities:** Developers frequently mistake day-of-week indexing (`0` vs `7` for Sunday), list vs range syntax, or step increments (`*/15` vs `15`).
2. **Hidden Resource Collisions & Stampedes:** Multiple teams deploy independent jobs that unintentionally trigger at the exact same minute (e.g. `0 0 * * *`), causing database CPU spikes, thread pool exhaustion, and deadlocks.
3. **Timezone & Daylight Savings Drifts:** Schedules written in UTC vs local times (EST, PST, IST, JST) drift during bi-annual daylight savings transitions, triggering payroll or billing jobs prematurely.
4. **Lack of Visual Multi-Job Timelines:** No lightweight, zero-dependency local tool lets developers visualize 24-hour execution densities, timeline waterfalls, or weekly calendar heatmaps.

**CronCraft** solves this as a developer-first, zero-dependency cron expression and schedule linter, multi-timezone collision detector, execution waterfall simulator, and real-time Bento Grid Web Studio built natively in TypeScript.

---

## 2. Core Capabilities

1. **Multi-Dialect Cron Engine:**
   - 5-field standard Unix format (`m h dom mon dow`).
   - 6-field format with seconds (`s m h dom mon dow`).
   - Extended presets: `@yearly`, `@monthly`, `@weekly`, `@daily`, `@hourly`, `@midnight`, `@reboot`.
   - Rich range (`1-5`), list (`1,15,30`), step intervals (`*/10`), and day name aliases (`MON-FRI`, `JAN-DEC`).

2. **Cron-to-Human & Human-to-Cron Natural Language Translation:**
   - Plain-English natural translation: e.g., `30 4 1,15 * 1-5` $\rightarrow$ *"At 04:30 on day-of-month 1 and 15 and Monday through Friday"*.
   - Bidirectional natural query builder: *"every 15 minutes on weekdays"*, *"daily at 3am"*.

3. **Multi-Timezone Execution Matrix Calculator:**
   - Calculates the exact next $N$ execution occurrences.
   - Shows real-time simultaneous timestamps across 6 key global developer timezones: UTC, US Eastern (EST/EDT), US Pacific (PST/PDT), GMT/BST, India (IST), and Tokyo (JST).

4. **Multi-Job Collision & Contention Auditor:**
   - Ingests crontab files, multiple cron schedules, or Kubernetes CronJob definitions.
   - Analyzes execution overlaps within a configurable contention window (e.g. $\le 5$ minutes).
   - Generates a Contention Risk Score (0-100%) and highlights peak concurrency bottlenecks.

5. **Embedded Bento Grid Studio (Port 6464):**
   - Zero-dependency web interface incorporating Bento Grid (#12), Dark Mode (#20), Cybercore (#24), Swiss Design (#3), Glassmorphism (#10), and Neumorphism (#8).
   - Interactive 24-Hour SVG Timeline Waterfall showing schedule density and collision hotspots.
   - 7-Day Weekly Frequency Heatmap.
   - Interactive multi-job crontab visual auditor and syntax validator.
   - Export schedules to Markdown documentation, JSON, or standard crontab.
