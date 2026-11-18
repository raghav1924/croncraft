#!/usr/bin/env node

import { runCli } from './cli.js';

runCli(process.argv).catch((err) => {
  process.stderr.write(`\x1b[31mFatal Error: ${err.message || err}\x1b[0m\n`);
  process.exit(1);
});
