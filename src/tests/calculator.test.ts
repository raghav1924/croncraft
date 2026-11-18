import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { parseCron } from '../core/parser.js';
import { getNextRuns, computeMultiTimezoneMatrix, isDateMatching } from '../core/calculator.js';

describe('Cron Calculator & Timezone Engine', () => {
  it('should accurately calculate next run occurrences', () => {
    const parsed = parseCron('0 12 * * *'); // Daily at noon
    const anchor = new Date('2026-11-18T00:00:00Z');

    const runs = getNextRuns(parsed, 3, anchor);
    assert.strictEqual(runs.length, 3);
    assert.strictEqual(runs[0].date.getHours(), 12);
    assert.strictEqual(runs[0].date.getMinutes(), 0);
  });

  it('should evaluate date matching correctly', () => {
    const parsed = parseCron('30 15 * * 5'); // Friday at 15:30
    const matchDate = new Date('2026-11-20T15:30:00'); // Assuming Friday
    const isFri = matchDate.getDay() === 5;

    if (isFri) {
      assert.strictEqual(isDateMatching(matchDate, parsed), true);
    }
  });

  it('should compute multi-timezone matrix', () => {
    const parsed = parseCron('0 0 * * *');
    const matrix = computeMultiTimezoneMatrix(parsed, 2);

    assert.strictEqual(matrix.length, 2);
    assert.ok(matrix[0].utc.length > 0);
    assert.ok(matrix[0].est.length > 0);
    assert.ok(matrix[0].ist.length > 0);
  });
});
