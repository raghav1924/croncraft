import { parseCron, explainCron, getNextRuns, computeMultiTimezoneMatrix } from '../dist/index.js';

const expr = '*/15 * * * 1-5';
console.log(`Parsing schedule: ${expr}`);

const parsed = parseCron(expr);
console.log(`Plain English: ${explainCron(parsed)}`);

const runs = getNextRuns(parsed, 3);
console.log('\nUpcoming Runs:');
runs.forEach((r) => console.log(` - ${r.utcString} (${r.relativeTime})`));

const tzMatrix = computeMultiTimezoneMatrix(parsed, 2);
console.log('\nMulti-Timezone Matrix:');
console.table(tzMatrix);
