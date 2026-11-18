import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { parseCron } from '../core/parser.js';
import { auditScheduleCollisions } from '../core/collision.js';
import { ScheduledJob } from '../core/types.js';

describe('Collision & Contention Auditor', () => {
  it('should detect collisions when multiple jobs trigger at the same minute', () => {
    const jobs: ScheduledJob[] = [
      {
        id: '1',
        name: 'Database Backup',
        expression: '0 2 * * *',
        parsed: parseCron('0 2 * * *'),
        description: 'At 02:00',
      },
      {
        id: '2',
        name: 'Analytics Aggregation',
        expression: '0 2 * * *',
        parsed: parseCron('0 2 * * *'),
        description: 'At 02:00',
      },
    ];

    const audit = auditScheduleCollisions(jobs);
    assert.ok(audit.collisionCount > 0);
    assert.ok(audit.riskScore > 0);
    assert.strictEqual(audit.hourlyDensity.length, 24);
  });

  it('should report OPTIMAL when schedules are staggered', () => {
    const jobs: ScheduledJob[] = [
      {
        id: '1',
        name: 'Job A',
        expression: '0 2 * * *',
        parsed: parseCron('0 2 * * *'),
        description: 'At 02:00',
      },
      {
        id: '2',
        name: 'Job B',
        expression: '30 4 * * *',
        parsed: parseCron('30 4 * * *'),
        description: 'At 04:30',
      },
    ];

    const audit = auditScheduleCollisions(jobs);
    assert.strictEqual(audit.collisionCount, 0);
    assert.strictEqual(audit.riskLevel, 'OPTIMAL');
  });
});
