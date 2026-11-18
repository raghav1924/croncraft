import { ParsedCron, FieldConstraint, CronFieldType } from './types.js';

export const FIELD_CONSTRAINTS: Record<CronFieldType, FieldConstraint> = {
  second: { min: 0, max: 59 },
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  dayOfMonth: { min: 1, max: 31 },
  month: {
    min: 1,
    max: 12,
    names: {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
    }
  },
  dayOfWeek: {
    min: 0,
    max: 7,
    names: {
      sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
    }
  }
};

export const PRESETS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

export function parseField(rawSegment: string, constraint: FieldConstraint, isDow = false): { values: number[]; error?: string } {
  let segment = rawSegment.trim().toLowerCase();

  // Replace text names with integers if provided
  if (constraint.names) {
    for (const [name, val] of Object.entries(constraint.names)) {
      const reg = new RegExp(`\\b${name}\\b`, 'gi');
      segment = segment.replace(reg, String(val));
    }
  }

  const valuesSet = new Set<number>();
  const parts = segment.split(',');

  for (const part of parts) {
    if (!part) continue;

    // Check for step: e.g. */5 or 10-30/5 or 0/15
    const stepSplit = part.split('/');
    if (stepSplit.length > 2) {
      return { values: [], error: `Invalid step expression: "${part}"` };
    }

    const rangePart = stepSplit[0];
    const step = stepSplit.length === 2 ? parseInt(stepSplit[1], 10) : 1;

    if (isNaN(step) || step <= 0) {
      return { values: [], error: `Invalid step interval: "${stepSplit[1]}" in "${part}"` };
    }

    let start = constraint.min;
    let end = constraint.max;

    if (rangePart === '*' || rangePart === '?') {
      start = constraint.min;
      end = constraint.max;
    } else if (rangePart.includes('-')) {
      const bounds = rangePart.split('-');
      if (bounds.length !== 2) {
        return { values: [], error: `Invalid range syntax: "${rangePart}"` };
      }
      start = parseInt(bounds[0], 10);
      end = parseInt(bounds[1], 10);

      if (isNaN(start) || isNaN(end)) {
        return { values: [], error: `Non-numeric bounds in range: "${rangePart}"` };
      }
      if (start > end) {
        return { values: [], error: `Start value ${start} is greater than end value ${end} in "${rangePart}"` };
      }
    } else {
      const exact = parseInt(rangePart, 10);
      if (isNaN(exact)) {
        return { values: [], error: `Unrecognized token: "${rangePart}"` };
      }
      if (stepSplit.length === 1) {
        start = exact;
        end = exact;
      } else {
        // e.g. 5/10 means starting at 5 to max with step 10
        start = exact;
        end = constraint.max;
      }
    }

    // Constraint boundary verification
    if (start < constraint.min || start > constraint.max) {
      return { values: [], error: `Value ${start} out of bounds (${constraint.min}-${constraint.max})` };
    }
    if (end < constraint.min || end > constraint.max) {
      return { values: [], error: `Value ${end} out of bounds (${constraint.min}-${constraint.max})` };
    }

    for (let i = start; i <= end; i += step) {
      if (isDow && i === 7) {
        valuesSet.add(0); // Sunday can be 0 or 7
      } else {
        valuesSet.add(i);
      }
    }
  }

  const values = Array.from(valuesSet).sort((a, b) => a - b);
  return { values };
}

export function parseCron(expression: string): ParsedCron {
  const trimmed = expression.trim();
  const errors: string[] = [];

  // Check presets
  let actualExpr = trimmed;
  if (actualExpr.startsWith('@')) {
    const resolved = PRESETS[actualExpr.toLowerCase()];
    if (!resolved) {
      return {
        raw: expression,
        isSixField: false,
        seconds: [],
        minutes: [],
        hours: [],
        daysOfMonth: [],
        months: [],
        daysOfWeek: [],
        isValid: false,
        errors: [`Unrecognized preset shortcut: "${actualExpr}"`],
      };
    }
    actualExpr = resolved;
  }

  const tokens = actualExpr.split(/\s+/).filter(Boolean);

  if (tokens.length !== 5 && tokens.length !== 6) {
    return {
      raw: expression,
      isSixField: false,
      seconds: [],
      minutes: [],
      hours: [],
      daysOfMonth: [],
      months: [],
      daysOfWeek: [],
      isValid: false,
      errors: [`Expected 5 or 6 fields, but received ${tokens.length}`],
    };
  }

  const isSixField = tokens.length === 6;
  let secTokens = '0';
  let minTokens: string;
  let hourTokens: string;
  let domTokens: string;
  let monTokens: string;
  let dowTokens: string;

  if (isSixField) {
    [secTokens, minTokens, hourTokens, domTokens, monTokens, dowTokens] = tokens;
  } else {
    [minTokens, hourTokens, domTokens, monTokens, dowTokens] = tokens;
  }

  const secRes = parseField(secTokens, FIELD_CONSTRAINTS.second);
  if (secRes.error) errors.push(`Second: ${secRes.error}`);

  const minRes = parseField(minTokens, FIELD_CONSTRAINTS.minute);
  if (minRes.error) errors.push(`Minute: ${minRes.error}`);

  const hourRes = parseField(hourTokens, FIELD_CONSTRAINTS.hour);
  if (hourRes.error) errors.push(`Hour: ${hourRes.error}`);

  const domRes = parseField(domTokens, FIELD_CONSTRAINTS.dayOfMonth);
  if (domRes.error) errors.push(`Day of Month: ${domRes.error}`);

  const monRes = parseField(monTokens, FIELD_CONSTRAINTS.month);
  if (monRes.error) errors.push(`Month: ${monRes.error}`);

  const dowRes = parseField(dowTokens, FIELD_CONSTRAINTS.dayOfWeek, true);
  if (dowRes.error) errors.push(`Day of Week: ${dowRes.error}`);

  return {
    raw: expression,
    isSixField,
    seconds: secRes.values,
    minutes: minRes.values,
    hours: hourRes.values,
    daysOfMonth: domRes.values,
    months: monRes.values,
    daysOfWeek: dowRes.values,
    isValid: errors.length === 0,
    errors,
  };
}
