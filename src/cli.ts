import * as fs from 'node:fs';
import { parseCron } from './core/parser.js';
import { explainCron, naturalLanguageToCron } from './core/explainer.js';
import { getNextRuns, computeMultiTimezoneMatrix } from './core/calculator.js';
import { parseCrontabContent } from './core/crontab.js';
import { auditScheduleCollisions } from './core/collision.js';
import { StudioServer } from './server/studio.js';
import {
  printBanner,
  printSingleCronSummary,
  printCollisionAuditTable,
  generateMarkdownScheduleReport,
  colors,
} from './utils/logger.js';

export async function runCli(argv: string[]): Promise<void> {
  const args = argv.slice(2);
  const command = args[0] || 'help';

  if (command === '-v' || command === '--version' || command === 'version') {
    process.stdout.write('CronCraft v1.0.0\n');
    return;
  }

  if (command === '-h' || command === '--help' || command === 'help') {
    printBanner();
    process.stdout.write(`
${colors.bold}USAGE:${colors.reset}
  croncraft next "<expr>" [options]     Calculate upcoming next execution occurrences
  croncraft explain "<expr>"            Translate cron expression into plain English
  croncraft natural "<phrase>"          Convert natural language into cron expression
  croncraft audit <crontab-file>        Audit multi-job crontab for schedule collisions
  croncraft studio [--port 6464]        Launch embedded Bento Grid Web Studio
  croncraft help                        Show this documentation

${colors.bold}OPTIONS:${colors.reset}
  -n, --count <number>         Number of upcoming runs to compute (default: 5)
  --json                       Emit structured JSON output
  --markdown                   Emit formatted Markdown schedule report
  -o, --output <filepath>      Write report to designated file
  --port <port>                Port for Web Studio (default: 6464)

${colors.bold}EXAMPLES:${colors.reset}
  $ croncraft next "*/15 * * * *" -n 5
  $ croncraft next "30 4 1,15 * 1-5"
  $ croncraft explain "0 0 * * 0"
  $ croncraft natural "every 10 minutes on weekdays"
  $ croncraft audit /etc/crontab
  $ croncraft studio --port 6464
\n`);
    return;
  }

  if (command === 'studio') {
    let port = 6464;
    const portIdx = args.indexOf('--port');
    if (portIdx !== -1 && args[portIdx + 1]) {
      port = parseInt(args[portIdx + 1], 10);
    }

    printBanner();
    const studio = new StudioServer({ port });
    const url = await studio.start();
    process.stdout.write(`\n${colors.cyan}${colors.bold}⏳ CronCraft Bento Grid Studio is active!${colors.reset}\n`);
    process.stdout.write(`  ${colors.brightWhite}URL:${colors.reset} ${colors.green}${url}${colors.reset}\n`);
    process.stdout.write(`  ${colors.dim}Open the URL in your browser to inspect timelines and audit schedules.${colors.reset}\n`);
    process.stdout.write(`  ${colors.dim}Press Ctrl+C to terminate.${colors.reset}\n\n`);

    process.on('SIGINT', async () => {
      await studio.stop();
      process.stdout.write(`\n${colors.yellow}CronCraft Studio stopped.${colors.reset}\n`);
      process.exit(0);
    });
    return;
  }

  if (command === 'explain') {
    const expr = args[1];
    if (!expr) {
      process.stderr.write(`${colors.red}Error: Cron expression required. Example: croncraft explain "*/15 * * * *" \x1b[0m\n`);
      process.exit(1);
    }
    const parsed = parseCron(expr);
    if (!parsed.isValid) {
      process.stderr.write(`${colors.red}Invalid Expression: ${parsed.errors.join('; ')}\x1b[0m\n`);
      process.exit(1);
    }
    process.stdout.write(`\n${colors.cyan}${parsed.raw}${colors.reset} → ${colors.green}${colors.bold}${explainCron(parsed)}${colors.reset}\n\n`);
    return;
  }

  if (command === 'natural') {
    const phrase = args.slice(1).join(' ');
    if (!phrase) {
      process.stderr.write(`${colors.red}Error: Natural query required. Example: croncraft natural "every 15 minutes on weekdays"\x1b[0m\n`);
      process.exit(1);
    }
    const res = naturalLanguageToCron(phrase);
    if (res.cron) {
      process.stdout.write(`\n${colors.dim}"${phrase}"${colors.reset} → ${colors.bold}${colors.green}${res.cron}${colors.reset} (${res.explanation})\n\n`);
    } else {
      process.stderr.write(`\n${colors.red}${res.error}${colors.reset}\n\n`);
      process.exit(1);
    }
    return;
  }

  if (command === 'next') {
    const expr = args[1];
    if (!expr) {
      process.stderr.write(`${colors.red}Error: Cron expression required. Example: croncraft next "0 2 * * *" \x1b[0m\n`);
      process.exit(1);
    }

    let count = 5;
    const countIdx = args.indexOf('-n') !== -1 ? args.indexOf('-n') : args.indexOf('--count');
    if (countIdx !== -1 && args[countIdx + 1]) {
      count = parseInt(args[countIdx + 1], 10);
    }

    const parsed = parseCron(expr);
    if (!parsed.isValid) {
      process.stderr.write(`${colors.red}Invalid Expression: ${parsed.errors.join('; ')}\x1b[0m\n`);
      process.exit(1);
    }

    const explanation = explainCron(parsed);
    const occurrences = getNextRuns(parsed, count);
    const timezoneMatrix = computeMultiTimezoneMatrix(parsed, count);

    const isJson = args.includes('--json');
    if (isJson) {
      process.stdout.write(JSON.stringify({ parsed, explanation, occurrences, timezoneMatrix }, null, 2) + '\n');
      return;
    }

    printBanner();
    printSingleCronSummary(parsed, explanation, occurrences, timezoneMatrix);
    return;
  }

  if (command === 'audit') {
    const filePath = args[1];
    if (!filePath) {
      process.stderr.write(`${colors.red}Error: Crontab file path required. Example: croncraft audit ./crontab\x1b[0m\n`);
      process.exit(1);
    }

    if (!fs.existsSync(filePath)) {
      process.stderr.write(`${colors.red}Error: File not found: "${filePath}"\x1b[0m\n`);
      process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const parsedFile = parseCrontabContent(content);

    if (parsedFile.syntaxErrors.length > 0) {
      process.stderr.write(`${colors.yellow}Warning: ${parsedFile.syntaxErrors.length} syntax issues found in crontab:${colors.reset}\n`);
      for (const err of parsedFile.syntaxErrors) {
        process.stderr.write(`  • ${err}\n`);
      }
    }

    const audit = auditScheduleCollisions(parsedFile.jobs);

    const isJson = args.includes('--json');
    const isMarkdown = args.includes('--markdown');

    if (isJson) {
      process.stdout.write(JSON.stringify({ jobs: parsedFile.jobs, audit }, null, 2) + '\n');
    } else if (isMarkdown) {
      process.stdout.write(generateMarkdownScheduleReport(parsedFile.jobs, audit) + '\n');
    } else {
      printBanner();
      printCollisionAuditTable(audit, parsedFile.jobs);
    }

    const outIdx = args.indexOf('-o') !== -1 ? args.indexOf('-o') : args.indexOf('--output');
    if (outIdx !== -1 && args[outIdx + 1]) {
      const outFile = args[outIdx + 1];
      const data = outFile.endsWith('.md')
        ? generateMarkdownScheduleReport(parsedFile.jobs, audit)
        : JSON.stringify({ jobs: parsedFile.jobs, audit }, null, 2);
      fs.writeFileSync(outFile, data, 'utf-8');
      process.stdout.write(`${colors.green}✔ Report saved to ${outFile}${colors.reset}\n\n`);
    }

    if (audit.riskLevel === 'CRITICAL') {
      process.exit(1);
    }
    return;
  }

  process.stderr.write(`${colors.red}Unknown command: "${command}". Run "croncraft help" for usage.\x1b[0m\n`);
  process.exit(1);
}
