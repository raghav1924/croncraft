import { parseCron, getNextRuns } from '../dist/index.js';
console.log(getNextRuns(parseCron('@daily'), 1));
