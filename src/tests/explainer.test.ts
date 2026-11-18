import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { parseCron } from '../core/parser.js';
import { explainCron, naturalLanguageToCron } from '../core/explainer.js';

describe('Cron Explainer & Natural Language Engine', () => {
  it('should generate clear English explanations for cron expressions', () => {
    const p1 = parseCron('0 0 * * *');
    assert.strictEqual(explainCron(p1), 'At 00:00');

    const p2 = parseCron('30 2 * * 1-5');
    assert.ok(explainCron(p2).includes('At 02:30'));
    assert.ok(explainCron(p2).includes('weekdays (Mon-Fri)'));
  });

  it('should translate natural language queries to cron expressions', () => {
    const r1 = naturalLanguageToCron('every 15 minutes');
    assert.strictEqual(r1.cron, '*/15 * * * *');

    const r2 = naturalLanguageToCron('hourly');
    assert.strictEqual(r2.cron, '0 * * * *');

    const r3 = naturalLanguageToCron('daily at 4pm');
    assert.strictEqual(r3.cron, '0 16 * * *');
  });
});
