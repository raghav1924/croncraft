import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { parseCrontabContent } from '../core/crontab.js';

describe('Crontab File Parser', () => {
  it('should parse environment variables, comments, and scheduled commands', () => {
    const content = `
# System environment
SHELL=/bin/bash
MAILTO=admin@example.com

# Hourly cleanup
0 * * * * /usr/bin/cleanup.sh

# Nightly sync
30 2 * * * /usr/bin/sync.py
`;
    const res = parseCrontabContent(content);

    assert.strictEqual(res.jobs.length, 2);
    assert.strictEqual(res.environmentVars['SHELL'], '/bin/bash');
    assert.strictEqual(res.environmentVars['MAILTO'], 'admin@example.com');
    assert.strictEqual(res.syntaxErrors.length, 0);
  });
});
