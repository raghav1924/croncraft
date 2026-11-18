#!/usr/bin/env bash
set -euo pipefail

echo "⚡ Running CronCraft CI validation pipeline..."
node dist/bin.js --version
echo "✔ CronCraft executable verified."
