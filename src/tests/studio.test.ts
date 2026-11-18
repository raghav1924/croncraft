import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { URL } from 'node:url';
import { StudioServer } from '../server/studio.js';
import { createVirtualTransport } from './test-utils.js';

describe('StudioServer Endpoints', () => {
  it('should serve HTML dashboard and parse/audit APIs', async () => {
    const studio = new StudioServer({ port: 6465 });
    const transport = createVirtualTransport((req, res) => {
      studio.handleRequest(req, res);
    });

    // 1. Test GET /
    const html = await new Promise<string>((resolve, reject) => {
      const clientReq = transport(new URL('http://127.0.0.1:6465/'), {}, (res: any) => {
        assert.strictEqual(res.statusCode, 200);
        assert.ok(String(res.headers['content-type']).includes('text/html'));
        let body = '';
        res.on('data', (c: any) => (body += c));
        res.on('end', () => resolve(body));
      });
      clientReq.on('error', reject);
      clientReq.end();
    });

    assert.ok(html.includes('CronCraft'));
    assert.ok(html.includes('bento-grid'));

    // 2. Test GET /api/parse
    const parseRes = await new Promise<any>((resolve, reject) => {
      const clientReq = transport(new URL('http://127.0.0.1:6465/api/parse?expr=*/10%20*%20*%20*%20*'), {}, (res: any) => {
        let body = '';
        res.on('data', (c: any) => (body += c));
        res.on('end', () => resolve(JSON.parse(body)));
      });
      clientReq.on('error', reject);
      clientReq.end();
    });

    assert.strictEqual(parseRes.parsed.isValid, true);
    assert.ok(Array.isArray(parseRes.nextRuns));
  });
});
