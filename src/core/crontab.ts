import { CrontabFileParseResult, ScheduledJob } from './types.js';
import { parseCron } from './parser.js';
import { explainCron } from './explainer.js';

export function parseCrontabContent(content: string): CrontabFileParseResult {
  const lines = content.split(/\r?\n/);
  const jobs: ScheduledJob[] = [];
  const environmentVars: Record<string, string> = {};
  const comments: string[] = [];
  const syntaxErrors: string[] = [];

  let lastComment = '';
  let jobCounter = 1;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const rawLine = lines[lineNum];
    const line = rawLine.trim();

    if (!line) {
      lastComment = '';
      continue;
    }

    if (line.startsWith('#')) {
      const commentText = line.replace(/^#+\s*/, '');
      comments.push(commentText);
      lastComment = commentText;
      continue;
    }

    // Check environment variable assignment: KEY=VALUE
    if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*=/.test(line)) {
      const eqIdx = line.indexOf('=');
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      environmentVars[key] = val;
      lastComment = '';
      continue;
    }

    // Attempt to parse cron schedule + command
    // Either starts with @preset or 5/6 tokens
    let expr = '';
    let cmd = '';

    if (line.startsWith('@')) {
      const parts = line.split(/\s+/);
      expr = parts[0];
      cmd = parts.slice(1).join(' ');
    } else {
      const parts = line.split(/\s+/);
      if (parts.length >= 6) {
        // Test 5 fields vs 6 fields
        // Standard crontab has 5 fields: min hr dom mon dow command
        expr = parts.slice(0, 5).join(' ');
        cmd = parts.slice(5).join(' ');
      } else {
        syntaxErrors.push(`Line ${lineNum + 1}: Incomplete crontab line: "${line}"`);
        continue;
      }
    }

    const parsed = parseCron(expr);
    if (!parsed.isValid) {
      syntaxErrors.push(`Line ${lineNum + 1}: ${parsed.errors.join('; ')} in "${expr}"`);
      continue;
    }

    // Infer job name
    let jobName = lastComment || (cmd ? cmd.split(/\s+/)[0] : `Job #${jobCounter}`);
    if (jobName.length > 35) {
      jobName = jobName.slice(0, 32) + '...';
    }

    jobs.push({
      id: `job-${jobCounter++}`,
      name: jobName,
      expression: expr,
      command: cmd || undefined,
      parsed,
      description: explainCron(parsed),
    });

    lastComment = '';
  }

  return {
    jobs,
    environmentVars,
    comments,
    syntaxErrors,
  };
}
