import { parseCrontabContent, auditScheduleCollisions } from '../dist/index.js';

const crontab = `
0 2 * * * /usr/bin/backup.sh
0 2 * * * /usr/bin/sync.sh
*/30 2 * * * /usr/bin/analytics.py
`;

const parsed = parseCrontabContent(crontab);
const audit = auditScheduleCollisions(parsed.jobs);

console.log(`Audited ${audit.totalJobs} jobs.`);
console.log(`Contention Risk: ${audit.riskScore}% (${audit.riskLevel})`);
console.log(`Collision count: ${audit.collisionCount}`);
console.log('\nRecommendations:');
audit.recommendations.forEach((r) => console.log(` - ${r}`));
