import {
  ParsedCron,
  NextRunOccurrence,
  MultiTimezoneRun,
  CollisionAuditResult,
  ScheduledJob,
} from '../core/types.js';

export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  brightWhite: '\x1b[97m',
};

export function printBanner(): void {
  const banner = `
${colors.cyan}  ╔══════════════════════════════════════════════════════════════════╗
  ║   ${colors.bold}${colors.brightWhite}⏳ CRONCRAFT${colors.reset}${colors.cyan} v1.0.0 — Modern Schedule & Collision Engine        ║
  ║   Cron Linter • Multi-Timezone Matrix • Bento Grid Studio • Node   ║
  ║   Author: Jatin Sharma (https://jatinsh.netlify.app/)            ║
  ╚══════════════════════════════════════════════════════════════════╝${colors.reset}
`;
  process.stdout.write(banner + '\n');
}

export function printSingleCronSummary(
  parsed: ParsedCron,
  explanation: string,
  occurrences: NextRunOccurrence[],
  timezoneMatrix: MultiTimezoneRun[]
): void {
  const divider = `${colors.gray}──────────────────────────────────────────────────────────────────${colors.reset}`;

  process.stdout.write(`\n${colors.bold}${colors.brightWhite}▶ SCHEDULE SPECIFICATION${colors.reset}\n`);
  process.stdout.write(`${divider}\n`);
  process.stdout.write(`  ${colors.dim}Expression:${colors.reset}       ${colors.cyan}${colors.bold}${parsed.raw}${colors.reset} (${parsed.isSixField ? '6-field seconds format' : '5-field standard format'})\n`);
  process.stdout.write(`  ${colors.dim}Natural English:${colors.reset}  ${colors.green}${colors.bold}${explanation}${colors.reset}\n`);
  process.stdout.write(`${divider}\n`);

  process.stdout.write(`\n${colors.bold}${colors.brightWhite}▶ UPCOMING RUN OCCURRENCES (NEXT ${occurrences.length})${colors.reset}\n`);
  process.stdout.write(`${divider}\n`);
  for (const occ of occurrences) {
    const num = `#${occ.index}`.padEnd(5);
    const dateStr = occ.date.toUTCString().padEnd(30);
    process.stdout.write(`  ${colors.cyan}${num}${colors.reset} ${colors.brightWhite}${dateStr}${colors.reset} (${colors.yellow}${occ.relativeTime}${colors.reset})\n`);
  }
  process.stdout.write(`${divider}\n`);

  if (timezoneMatrix.length > 0) {
    process.stdout.write(`\n${colors.bold}${colors.brightWhite}▶ MULTI-TIMEZONE RUN MATRIX${colors.reset}\n`);
    process.stdout.write(`${divider}\n`);
    process.stdout.write(`  ${colors.dim}UTC                 EST (New York)      IST (India)         JST (Tokyo)${colors.reset}\n`);
    for (const tz of timezoneMatrix) {
      const u = tz.utc.slice(0, 18).padEnd(20);
      const e = tz.est.slice(0, 18).padEnd(20);
      const i = tz.ist.slice(0, 18).padEnd(20);
      const j = tz.jst.slice(0, 18);
      process.stdout.write(`  ${colors.brightWhite}${u}${colors.reset}${colors.cyan}${e}${colors.reset}${colors.yellow}${i}${colors.reset}${colors.green}${j}${colors.reset}\n`);
    }
    process.stdout.write(`${divider}\n\n`);
  }
}

export function printCollisionAuditTable(audit: CollisionAuditResult, jobs: ScheduledJob[]): void {
  const divider = `${colors.gray}──────────────────────────────────────────────────────────────────${colors.reset}`;
  const levelColor = audit.riskLevel === 'OPTIMAL' ? colors.green : audit.riskLevel === 'ELEVATED' ? colors.yellow : colors.red;

  process.stdout.write(`\n${colors.bold}${colors.brightWhite}▶ SCHEDULE CONTENTION & COLLISION AUDIT${colors.reset}\n`);
  process.stdout.write(`${divider}\n`);
  process.stdout.write(`  ${colors.dim}Audited Jobs:${colors.reset}     ${colors.bold}${jobs.length}${colors.reset} active schedules\n`);
  process.stdout.write(`  ${colors.dim}Risk Score:${colors.reset}       ${levelColor}${colors.bold}${audit.riskScore}% (${audit.riskLevel})${colors.reset}\n`);
  process.stdout.write(`  ${colors.dim}Collisions Found:${colors.reset} ${audit.collisionCount > 0 ? colors.red : colors.green}${audit.collisionCount} contentious time clusters${colors.reset}\n`);
  process.stdout.write(`${divider}\n`);

  // 24-Hour Density ASCII Visualizer
  process.stdout.write(`\n${colors.bold}${colors.brightWhite}▶ 24-HOUR EXECUTION DENSITY TIMELINE (00:00 - 23:00)${colors.reset}\n`);
  const maxDensity = Math.max(...audit.hourlyDensity, 1);
  for (let hr = 0; hr < 24; hr++) {
    const count = audit.hourlyDensity[hr];
    const hourLabel = `${String(hr).padStart(2, '0')}:00`.padEnd(7);
    const barLen = Math.round((count / maxDensity) * 25);
    const bar = '■'.repeat(barLen) + ' '.repeat(Math.max(0, 25 - barLen));
    const barColor = count >= 4 ? colors.red : count >= 2 ? colors.yellow : colors.cyan;
    process.stdout.write(`  ${colors.dim}${hourLabel}${colors.reset} [${barColor}${bar}${colors.reset}] ${count.toString().padStart(3)} runs\n`);
  }
  process.stdout.write(`${divider}\n`);

  if (audit.events.length > 0) {
    process.stdout.write(`\n${colors.bold}${colors.brightWhite}▶ CONTENTION HOTSPOTS DETECTED${colors.reset}\n`);
    for (const ev of audit.events) {
      const sevColor = ev.severity === 'HIGH' ? colors.red : ev.severity === 'MEDIUM' ? colors.yellow : colors.cyan;
      process.stdout.write(`  ${sevColor}[${ev.severity}]${colors.reset} ${colors.brightWhite}${ev.timestamp}${colors.reset}\n`);
      process.stdout.write(`    ${colors.dim}Jobs in collision:${colors.reset} ${ev.jobs.join(', ')}\n`);
    }
    process.stdout.write(`${divider}\n`);
  }

  process.stdout.write(`\n${colors.bold}${colors.brightWhite}▶ AUTOMATED RECOMMENDATIONS${colors.reset}\n`);
  for (const rec of audit.recommendations) {
    process.stdout.write(`  • ${colors.brightWhite}${rec}${colors.reset}\n`);
  }
  process.stdout.write(`${divider}\n\n`);
}

export function generateMarkdownScheduleReport(
  jobs: ScheduledJob[],
  audit: CollisionAuditResult
): string {
  return `# CronCraft Schedule Audit Report

**Generated:** ${new Date().toISOString()}  
**Total Jobs:** ${jobs.length}  
**Contention Risk Score:** ${audit.riskScore}% (${audit.riskLevel})  

---

## Active Schedules

| Job Name | Expression | Natural Description | Shell Command |
| :--- | :--- | :--- | :--- |
${jobs.map((j) => `| **${j.name}** | \`${j.expression}\` | ${j.description} | \`${j.command || '-'}\` |`).join('\n')}

---

## 24-Hour Execution Density

| Hour (UTC) | Scheduled Runs | Relative Volume |
| :--- | :--- | :--- |
${audit.hourlyDensity.map((cnt, hr) => `| ${String(hr).padStart(2, '0')}:00 | ${cnt} | ${'█'.repeat(Math.min(20, cnt * 2))} |`).join('\n')}

---

## Contention & Collision Warnings

${audit.events.length === 0
  ? '✔ **No schedule collisions detected.** All tasks are cleanly distributed.'
  : audit.events.map((e) => `- **[${e.severity}]** \`${e.timestamp}\`: ${e.explanation}`).join('\n')}

---

## Automated Recommendations
${audit.recommendations.map((r) => `- ${r}`).join('\n')}

---
*Report synthesized by [CronCraft](https://github.com/raghav1924/croncraft) — Authored by [Jatin Sharma](https://jatinsh.netlify.app/)*
`;
}
