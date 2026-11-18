import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { parseCron } from '../core/parser.js';

describe('Cron Parser', () => {
  it('should parse valid 5-field standard cron expressions', () => {
    const res = parseCron('*/15 * * * *');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.isSixField, false);
    assert.deepStrictEqual(res.minutes, [0, 15, 30, 45]);
    assert.strictEqual(res.hours.length, 24);
    assert.strictEqual(res.daysOfMonth.length, 31);
    assert.strictEqual(res.months.length, 12);
    assert.strictEqual(res.daysOfWeek.length, 7);
  });

  it('should parse 6-field cron expressions with seconds', () => {
    const res = parseCron('30 0 2 * * *');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.isSixField, true);
    assert.deepStrictEqual(res.seconds, [30]);
    assert.deepStrictEqual(res.minutes, [0]);
    assert.deepStrictEqual(res.hours, [2]);
  });

  it('should resolve standard presets correctly', () => {
    const daily = parseCron('@daily');
    assert.strictEqual(daily.isValid, true);
    assert.deepStrictEqual(daily.minutes, [0]);
    assert.deepStrictEqual(daily.hours, [0]);

    const hourly = parseCron('@hourly');
    assert.strictEqual(hourly.isValid, true);
    assert.deepStrictEqual(hourly.minutes, [0]);
    assert.strictEqual(hourly.hours.length, 24);
  });

  it('should parse day of week and month text aliases', () => {
    const res = parseCron('0 0 1 JAN-MAR MON-FRI');
    assert.strictEqual(res.isValid, true);
    assert.deepStrictEqual(res.months, [1, 2, 3]);
    assert.deepStrictEqual(res.daysOfWeek, [1, 2, 3, 4, 5]);
  });

  it('should reject invalid expressions and collect syntax errors', () => {
    const res = parseCron('99 75 * * *');
    assert.strictEqual(res.isValid, false);
    assert.ok(res.errors.length > 0);
  });
});
