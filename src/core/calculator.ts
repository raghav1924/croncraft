import { ParsedCron, NextRunOccurrence, MultiTimezoneRun } from './types.js';

export function isDateMatching(date: Date, parsed: ParsedCron): boolean {
  if (!parsed.isValid) return false;

  const sec = date.getSeconds();
  if (!parsed.seconds.includes(sec)) return false;

  const min = date.getMinutes();
  if (!parsed.minutes.includes(min)) return false;

  const hr = date.getHours();
  if (!parsed.hours.includes(hr)) return false;

  const dom = date.getDate();
  const dow = date.getDay(); // 0 is Sunday
  const mon = date.getMonth() + 1; // 1-12

  if (!parsed.months.includes(mon)) return false;

  // Standard cron behavior for DOM & DOW:
  // If both DOM and DOW are specified (not wildcard / all values), match if EITHER matches.
  // If one is wildcard, match the specified one.
  const allDom = parsed.daysOfMonth.length === 31;
  const allDow = parsed.daysOfWeek.length === 7;

  if (allDom && allDow) {
    return true;
  } else if (!allDom && allDow) {
    return parsed.daysOfMonth.includes(dom);
  } else if (allDom && !allDow) {
    return parsed.daysOfWeek.includes(dow);
  } else {
    // Both explicitly specified: union match
    return parsed.daysOfMonth.includes(dom) || parsed.daysOfWeek.includes(dow);
  }
}

export function getNextRuns(parsed: ParsedCron, count = 5, startDate: Date = new Date()): NextRunOccurrence[] {
  if (!parsed.isValid || count <= 0) return [];

  const results: NextRunOccurrence[] = [];
  const curr = new Date(startDate.getTime());

  // If 5-field cron, start from next full minute (seconds = 0)
  if (!parsed.isSixField) {
    curr.setSeconds(0, 0);
    curr.setMinutes(curr.getMinutes() + 1);
  } else {
    curr.setMilliseconds(0);
    curr.setSeconds(curr.getSeconds() + 1);
  }

  const stepSec = parsed.isSixField ? 1 : 60;
  const maxIterations = 500000; // Guard against unreachable infinite loops
  let iterations = 0;

  while (results.length < count && iterations < maxIterations) {
    iterations++;

    if (isDateMatching(curr, parsed)) {
      const runDate = new Date(curr.getTime());
      results.push({
        index: results.length + 1,
        date: runDate,
        iso: runDate.toISOString(),
        utcString: runDate.toUTCString(),
        relativeTime: formatRelativeTime(runDate, startDate),
      });
    }

    curr.setSeconds(curr.getSeconds() + stepSec);
  }

  return results;
}

export function formatRelativeTime(target: Date, reference: Date): string {
  const diffMs = target.getTime() - reference.getTime();
  if (diffMs <= 0) return 'now';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `in ${diffSec}s`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `in ${diffMin}m`;

  const diffHrs = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;
  if (diffHrs < 24) return `in ${diffHrs}h ${remMin > 0 ? `${remMin}m` : ''}`.trim();

  const diffDays = Math.floor(diffHrs / 24);
  const remHrs = diffHrs % 24;
  return `in ${diffDays}d ${remHrs > 0 ? `${remHrs}h` : ''}`.trim();
}

export function formatInTimezone(d: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export function computeMultiTimezoneMatrix(parsed: ParsedCron, count = 5): MultiTimezoneRun[] {
  const occurrences = getNextRuns(parsed, count);
  return occurrences.map((occ) => ({
    utc: formatInTimezone(occ.date, 'UTC'),
    est: formatInTimezone(occ.date, 'America/New_York'),
    pst: formatInTimezone(occ.date, 'America/Los_Angeles'),
    gmt: formatInTimezone(occ.date, 'Europe/London'),
    ist: formatInTimezone(occ.date, 'Asia/Kolkata'),
    jst: formatInTimezone(occ.date, 'Asia/Tokyo'),
    relative: occ.relativeTime,
  }));
}
