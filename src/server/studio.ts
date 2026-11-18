import * as http from 'node:http';
import { URL } from 'node:url';
import { parseCron } from '../core/parser.js';
import { explainCron, naturalLanguageToCron } from '../core/explainer.js';
import { getNextRuns, computeMultiTimezoneMatrix } from '../core/calculator.js';
import { parseCrontabContent } from '../core/crontab.js';
import { auditScheduleCollisions } from '../core/collision.js';
import { generateMarkdownScheduleReport } from '../utils/logger.js';
import { ScheduledJob } from '../core/types.js';

export interface StudioServerOptions {
  port?: number;
}

export class StudioServer {
  private server: http.Server | null = null;
  private port: number;
  private sampleJobs: ScheduledJob[] = [];

  constructor(options: StudioServerOptions = {}) {
    this.port = options.port ?? 6464;
    this.initializeDefaultJobs();
  }

  private initializeDefaultJobs(): void {
    const defaultCrontab = `
# Nightly database backup
0 2 * * * /usr/local/bin/backup-postgres.sh

# Hourly metrics aggregation
0 * * * * /usr/bin/node /app/metrics.js

# Daily analytics ETL
30 2 * * * /usr/bin/python3 /app/etl_pipeline.py

# Healthcheck every 5 minutes
*/5 * * * * curl -s https://api.internal/health

# Weekly security audit on Sunday midnight
0 0 * * 0 /usr/bin/security-audit.sh
`;
    const parsed = parseCrontabContent(defaultCrontab);
    this.sampleJobs = parsed.jobs;
  }

  public async start(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
        this.handleRequest(req, res).catch((err) => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        });
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        resolve(`http://127.0.0.1:${this.port}`);
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  public async handleRequest(req: any, res: any): Promise<void> {
    const url = new URL(req.url || '/', `http://127.0.0.1:${this.port}`);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // API: Parse single cron expression
    if (url.pathname === '/api/parse' && req.method === 'GET') {
      const expr = url.searchParams.get('expr') || '* * * * *';
      const parsed = parseCron(expr);
      const explanation = explainCron(parsed);
      const nextRuns = getNextRuns(parsed, 6);
      const timezoneMatrix = computeMultiTimezoneMatrix(parsed, 6);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        parsed,
        explanation,
        nextRuns,
        timezoneMatrix,
      }));
      return;
    }

    // API: Translate natural language to cron
    if (url.pathname === '/api/natural' && req.method === 'GET') {
      const query = url.searchParams.get('q') || '';
      const result = naturalLanguageToCron(query);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    // API: Audit Crontab Content
    if (url.pathname === '/api/audit' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => (body += chunk));
      req.on('end', () => {
        try {
          const data = JSON.parse(body || '{}');
          const content = data.crontab || '';
          const parsed = parseCrontabContent(content);
          const audit = auditScheduleCollisions(parsed.jobs.length > 0 ? parsed.jobs : this.sampleJobs);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            jobs: parsed.jobs.length > 0 ? parsed.jobs : this.sampleJobs,
            environmentVars: parsed.environmentVars,
            syntaxErrors: parsed.syntaxErrors,
            audit,
          }));
        } catch (err: any) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // API: Export report
    if (url.pathname === '/api/export' && req.method === 'GET') {
      const format = url.searchParams.get('format') || 'json';
      const audit = auditScheduleCollisions(this.sampleJobs);

      if (format === 'markdown') {
        res.writeHead(200, {
          'Content-Type': 'text/markdown',
          'Content-Disposition': 'attachment; filename="croncraft-audit.md"',
        });
        res.end(generateMarkdownScheduleReport(this.sampleJobs, audit));
        return;
      } else {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="croncraft-audit.json"',
        });
        res.end(JSON.stringify({ jobs: this.sampleJobs, audit }, null, 2));
        return;
      }
    }

    // Serve HTML Dashboard
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(this.renderStudioHtml());
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  private renderStudioHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CronCraft Studio — Schedule Linter & Multi-Timezone Collision Engine</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #07090e;
      --card-bg: rgba(16, 20, 30, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #38bdf8;
      --accent-glow: rgba(56, 189, 248, 0.35);
      --accent-purple: #a855f7;
      --accent-green: #10b981;
      --accent-red: #f43f5e;
      --accent-yellow: #f59e0b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(56, 189, 248, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(168, 85, 247, 0.08) 0%, transparent 40%),
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 32px 32px, 32px 32px;
      color: var(--text);
      font-family: var(--font-sans);
      min-height: 100vh;
      padding: 24px;
    }

    .container { max-width: 1400px; margin: 0 auto; }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      margin-bottom: 24px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    .brand { display: flex; align-items: center; gap: 14px; }
    .logo-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #38bdf8 0%, #a855f7 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 0 20px var(--accent-glow);
    }

    .brand-title h1 {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-title span.tag {
      font-family: var(--font-mono);
      font-size: 11px;
      padding: 2px 8px;
      background: rgba(56, 189, 248, 0.15);
      color: var(--accent);
      border-radius: 6px;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }

    .brand-title p { font-size: 12px; color: var(--text-muted); }

    .header-actions { display: flex; align-items: center; gap: 12px; }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 10px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: var(--font-sans);
    }

    .btn-primary {
      background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
      color: #04101e;
      box-shadow: 0 4px 16px rgba(56, 189, 248, 0.3);
    }
    .btn-primary:hover {
      box-shadow: 0 6px 24px rgba(56, 189, 248, 0.5);
      transform: translateY(-1px);
    }

    .btn-outline {
      background: rgba(255, 255, 255, 0.04);
      color: var(--text);
      border-color: var(--card-border);
    }
    .btn-outline:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
    }

    /* Bento Grid */
    .bento-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 20px;
    }

    .bento-card {
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 22px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      transition: border-color 0.3s;
    }
    .bento-card:hover { border-color: rgba(56, 189, 248, 0.3); }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }

    .card-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-title .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 8px var(--accent);
    }

    .col-4 { grid-column: span 4; }
    .col-6 { grid-column: span 6; }
    .col-8 { grid-column: span 8; }
    .col-12 { grid-column: span 12; }

    /* Inputs */
    input, textarea, select {
      width: 100%;
      background: rgba(10, 14, 22, 0.8);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 12px 14px;
      border-radius: 8px;
      font-family: var(--font-mono);
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus, textarea:focus {
      border-color: var(--accent);
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.25);
    }

    .preset-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }
    .preset-pill {
      font-family: var(--font-mono);
      font-size: 11px;
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--card-border);
      border-radius: 6px;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s;
    }
    .preset-pill:hover {
      background: rgba(56, 189, 248, 0.15);
      border-color: rgba(56, 189, 248, 0.3);
      color: var(--accent);
    }

    /* Explanation Banner */
    .explanation-banner {
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 10px;
      padding: 14px;
      margin-top: 16px;
      font-size: 15px;
      font-weight: 600;
      color: #bae6fd;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Metrics Grid */
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 14px;
    }
    .metric-box {
      background: rgba(10, 14, 22, 0.6);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 14px;
    }
    .metric-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
    .metric-val { font-family: var(--font-mono); font-size: 20px; font-weight: 700; color: var(--text); margin-top: 4px; }

    /* Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 10px;
    }
    .data-table th {
      text-align: left;
      padding: 10px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--card-border);
      font-weight: 600;
    }
    .data-table td {
      padding: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      font-family: var(--font-mono);
    }
    .data-table tr:hover { background: rgba(255, 255, 255, 0.02); }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      font-family: var(--font-mono);
    }
    .badge-ok { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-warn { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-err { background: rgba(244, 63, 94, 0.15); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.3); }

    /* SVG Timeline Chart */
    .timeline-container {
      width: 100%;
      height: 220px;
      margin-top: 10px;
    }

    footer {
      margin-top: 32px;
      text-align: center;
      padding: 20px;
      color: var(--text-muted);
      font-size: 12px;
      border-top: 1px solid var(--card-border);
    }
    footer a { color: var(--accent); text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="logo-badge">⏳</div>
        <div class="brand-title">
          <h1>CronCraft <span class="tag">STUDIO v1.0</span></h1>
          <p>Schedule Linter, Multi-Timezone Matrix & Collision Heatmap</p>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline" onclick="exportData('markdown')">
          <span>Export Markdown</span>
        </button>
        <button class="btn btn-outline" onclick="exportData('json')">
          <span>Export JSON</span>
        </button>
      </div>
    </header>

    <div class="bento-grid">
      <!-- Card 1: Interactive Expression Linter (span 6) -->
      <div class="bento-card col-6">
        <div class="card-header">
          <div class="card-title"><span class="dot"></span>Live Cron Expression Linter</div>
          <span id="cronBadge" class="badge badge-ok">VALID</span>
        </div>
        <input type="text" id="cronInput" value="30 4 1,15 * 1-5" oninput="updateCron()" placeholder="e.g. */15 * * * *" />
        
        <div class="preset-pills">
          <span class="preset-pill" onclick="setExpr('* * * * *')">Every Minute</span>
          <span class="preset-pill" onclick="setExpr('*/15 * * * *')">Every 15m</span>
          <span class="preset-pill" onclick="setExpr('0 * * * *')">Hourly</span>
          <span class="preset-pill" onclick="setExpr('0 0 * * *')">Daily Midnight</span>
          <span class="preset-pill" onclick="setExpr('30 2 * * 1-5')">Weekdays 02:30</span>
          <span class="preset-pill" onclick="setExpr('@weekly')">Weekly</span>
          <span class="preset-pill" onclick="setExpr('0 0 1 * *')">Monthly</span>
        </div>

        <div class="explanation-banner" id="explanationBox">
          <span>⚡</span>
          <span id="explanationText">At 04:30 on day 1, 15 of the month on weekdays (Mon-Fri)</span>
        </div>

        <div style="margin-top: 18px;">
          <div class="card-title" style="margin-bottom: 8px;"><span class="dot"></span>Natural Language Query Builder</div>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="naturalInput" placeholder="e.g. every 10 minutes on weekdays" />
            <button class="btn btn-primary" onclick="convertNatural()">Convert</button>
          </div>
        </div>
      </div>

      <!-- Card 2: Multi-Timezone Execution Matrix (span 6) -->
      <div class="bento-card col-6">
        <div class="card-header">
          <div class="card-title"><span class="dot"></span>Multi-Timezone Execution Matrix</div>
          <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">6 Global Developer Hubs</span>
        </div>
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Relative</th>
                <th>UTC</th>
                <th>EST (New York)</th>
                <th>IST (India)</th>
                <th>JST (Tokyo)</th>
              </tr>
            </thead>
            <tbody id="tzMatrixBody">
              <tr><td colspan="5" style="text-align:center;">Loading occurrences...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Card 3: 24-Hour Execution Density Waterfall (span 8) -->
      <div class="bento-card col-8">
        <div class="card-header">
          <div class="card-title"><span class="dot"></span>24-Hour Execution Density Waterfall</div>
          <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">Concurrent Task Density (UTC)</span>
        </div>
        <div class="timeline-container">
          <svg width="100%" height="100%" viewBox="0 0 700 200" preserveAspectRatio="none" id="densitySvg">
            <line x1="40" y1="170" x2="680" y2="170" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
          </svg>
        </div>
      </div>

      <!-- Card 4: Contention Risk & Collision Radar (span 4) -->
      <div class="bento-card col-4">
        <div class="card-header">
          <div class="card-title"><span class="dot"></span>Collision & Contention Radar</div>
          <span id="riskBadge" class="badge badge-ok">OPTIMAL</span>
        </div>
        
        <div style="text-align: center; margin: 10px 0;">
          <div style="font-size: 42px; font-weight: 800; font-family: var(--font-mono); color: var(--accent);" id="riskScore">0%</div>
          <div style="font-size: 12px; color: var(--text-muted);">Concurrent Contention Risk</div>
        </div>

        <div id="recommendationsBox" style="font-size: 12px; color: var(--text-muted); line-height: 1.5; margin-top: 14px; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;">
          ✔ Schedules are cleanly distributed across hours.
        </div>
      </div>

      <!-- Card 5: Crontab File Batch Auditor (span 12) -->
      <div class="bento-card col-12">
        <div class="card-header">
          <div class="card-title"><span class="dot"></span>Crontab Batch Auditor & Schedule Matrix</div>
          <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;" onclick="auditCrontab()">Re-Audit Crontab</button>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; display: block;">CRONTAB FILE CONTENT</label>
            <textarea id="crontabArea" rows="8" style="font-size: 12px; resize: vertical;"># Nightly database backup
0 2 * * * /usr/local/bin/backup-postgres.sh

# Hourly metrics aggregation
0 * * * * /usr/bin/node /app/metrics.js

# Daily analytics ETL
30 2 * * * /usr/bin/python3 /app/etl_pipeline.py

# Healthcheck every 5 minutes
*/5 * * * * curl -s https://api.internal/health

# Weekly security audit on Sunday midnight
0 0 * * 0 /usr/bin/security-audit.sh</textarea>
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; display: block;">AUDITED JOBS & DESCRIPTIONS</label>
            <div id="jobListDiv" style="max-height: 170px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;"></div>
          </div>
        </div>
      </div>
    </div>

    <footer>
      <p>CronCraft v1.0.0 — Crafted by <a href="https://jatinsh.netlify.app/" target="_blank">Jatin Sharma</a> • <a href="https://github.com/raghav1924/croncraft" target="_blank">GitHub Repository</a> • Portfolio Lab Build #13</p>
    </footer>
  </div>

  <script>
    async function updateCron() {
      const expr = document.getElementById('cronInput').value;
      try {
        const res = await fetch('/api/parse?expr=' + encodeURIComponent(expr));
        const data = await res.json();
        
        const badge = document.getElementById('cronBadge');
        const box = document.getElementById('explanationText');

        if (!data.parsed.isValid) {
          badge.className = 'badge badge-err';
          badge.innerText = 'INVALID';
          box.innerText = data.parsed.errors.join('; ');
          return;
        }

        badge.className = 'badge badge-ok';
        badge.innerText = 'VALID';
        box.innerText = data.explanation;

        // Render Multi-timezone matrix
        const tbody = document.getElementById('tzMatrixBody');
        tbody.innerHTML = data.timezoneMatrix.map(tz => '<tr>' +
          '<td><span class="badge badge-ok">' + tz.relative + '</span></td>' +
          '<td>' + tz.utc + '</td>' +
          '<td>' + tz.est + '</td>' +
          '<td>' + tz.ist + '</td>' +
          '<td>' + tz.jst + '</td>' +
        '</tr>').join('');
      } catch (err) {
        console.error(err);
      }
    }

    function setExpr(expr) {
      document.getElementById('cronInput').value = expr;
      updateCron();
    }

    async function convertNatural() {
      const q = document.getElementById('naturalInput').value;
      if (!q) return;
      try {
        const res = await fetch('/api/natural?q=' + encodeURIComponent(q));
        const data = await res.json();
        if (data.cron) {
          document.getElementById('cronInput').value = data.cron;
          updateCron();
        } else {
          alert(data.error);
        }
      } catch (err) {
        alert('Translation failed: ' + err.message);
      }
    }

    async function auditCrontab() {
      const crontab = document.getElementById('crontabArea').value;
      try {
        const res = await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ crontab })
        });
        const data = await res.json();
        
        // Update Radar
        document.getElementById('riskScore').innerText = data.audit.riskScore + '%';
        const rBadge = document.getElementById('riskBadge');
        rBadge.innerText = data.audit.riskLevel;
        rBadge.className = 'badge ' + (data.audit.riskLevel === 'OPTIMAL' ? 'badge-ok' : data.audit.riskLevel === 'ELEVATED' ? 'badge-warn' : 'badge-err');

        // Update Recommendations
        document.getElementById('recommendationsBox').innerHTML = data.audit.recommendations.map(r => '• ' + r).join('<br/>');

        // Update Job List
        const jDiv = document.getElementById('jobListDiv');
        jDiv.innerHTML = data.jobs.map(j => '<div style="background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:6px; font-family:var(--font-mono); font-size:12px;">' +
          '<div style="font-weight:700; color:#38bdf8;">' + j.name + ' <span style="color:#94a3b8; font-weight:normal;">[' + j.expression + ']</span></div>' +
          '<div style="color:#bae6fd; margin-top:2px;">' + j.description + '</div>' +
        '</div>').join('');

        // Render Density SVG
        renderDensitySvg(data.audit.hourlyDensity);
      } catch (err) {
        console.error(err);
      }
    }

    function renderDensitySvg(density) {
      const svg = document.getElementById('densitySvg');
      const maxCount = Math.max(...density, 1);
      const width = 640;
      const height = 140;
      const offsetX = 40;
      const barWidth = Math.floor(width / 24) - 4;

      let content = '<line x1="40" y1="160" x2="680" y2="160" stroke="rgba(255,255,255,0.1)" stroke-width="1" />';

      density.forEach((cnt, hr) => {
        const barHeight = Math.max(3, Math.round((cnt / maxCount) * height));
        const x = offsetX + hr * (barWidth + 4);
        const y = 160 - barHeight;
        const color = cnt >= 4 ? '#f43f5e' : cnt >= 2 ? '#f59e0b' : '#38bdf8';

        content += '<rect x="' + x + '" y="' + y + '" width="' + barWidth + '" height="' + barHeight + '" fill="' + color + '" rx="2" opacity="0.85" />';
        if (cnt > 0) {
          content += '<text x="' + (x + barWidth / 2) + '" y="' + (y - 4) + '" fill="#38bdf8" font-family="monospace" text-anchor="middle" font-size="9">' + cnt + '</text>';
        }
        if (hr % 3 === 0) {
          content += '<text x="' + (x + barWidth / 2) + '" y="176" fill="#94a3b8" font-family="monospace" text-anchor="middle" font-size="9">' + hr + 'h</text>';
        }
      });

      svg.innerHTML = content;
    }

    function exportData(format) {
      window.location.href = '/api/export?format=' + format;
    }

    // Init
    updateCron();
    auditCrontab();
  </script>
</body>
</html>`;
  }
}
