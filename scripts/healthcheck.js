#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

console.log('🔍 Executing CronCraft runtime healthcheck...');

const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajor < 18) {
  console.error(`❌ Node.js version >= 18 required. Current: ${process.version}`);
  process.exit(1);
}
console.log(`✔ Node runtime: ${process.version}`);

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
console.log(`✔ Package: ${pkg.name} v${pkg.version}`);
console.log('🎉 CronCraft healthcheck PASSED.');
