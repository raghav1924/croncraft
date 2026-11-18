import { ScheduledJob, CollisionAuditResult, CollisionEvent } from './types.js';
import { getNextRuns } from './calculator.js';

export function auditScheduleCollisions(
  jobs: ScheduledJob[],
  windowHours = 24,
  contentionThresholdMin = 5
): CollisionAuditResult {
  if (jobs.length === 0) {
    return {
      totalJobs: 0,
      collisionCount: 0,
      riskScore: 0,
      riskLevel: 'OPTIMAL',
      events: [],
      hourlyDensity: Array(24).fill(0),
      recommendations: ['No active scheduled jobs to audit.'],
    };
  }

  const now = new Date();
  const endTime = new Date(now.getTime() + windowHours * 60 * 60 * 1000);
  const hourlyDensity = Array(24).fill(0);

  // Map of minuteTimestamp -> list of job names triggering
  const timelineMap = new Map<number, string[]>();

  for (const job of jobs) {
    if (!job.parsed.isValid) continue;

    // Estimate number of runs in window
    // For safety, grab up to 100 runs per job
    const occurrences = getNextRuns(job.parsed, 100, now);

    for (const occ of occurrences) {
      if (occ.date > endTime) continue;

      const hour = occ.date.getHours();
      hourlyDensity[hour]++;

      // Normalize to minute epoch
      const minuteEpoch = Math.floor(occ.date.getTime() / (60 * 1000));

      if (!timelineMap.has(minuteEpoch)) {
        timelineMap.set(minuteEpoch, []);
      }
      timelineMap.get(minuteEpoch)!.push(job.name);
    }
  }

  // Detect collisions
  const sortedMinutes = Array.from(timelineMap.keys()).sort((a, b) => a - b);
  const events: CollisionEvent[] = [];
  const processedMinutes = new Set<number>();

  for (let i = 0; i < sortedMinutes.length; i++) {
    const minA = sortedMinutes[i];
    if (processedMinutes.has(minA)) continue;

    const overlappingJobs = new Set<string>(timelineMap.get(minA) || []);
    const clusteredMinutes = [minA];

    // Look ahead within contention threshold
    for (let j = i + 1; j < sortedMinutes.length; j++) {
      const minB = sortedMinutes[j];
      if (minB - minA <= contentionThresholdMin) {
        clusteredMinutes.push(minB);
        for (const jName of timelineMap.get(minB) || []) {
          overlappingJobs.add(jName);
        }
      } else {
        break;
      }
    }

    if (overlappingJobs.size > 1) {
      for (const m of clusteredMinutes) {
        processedMinutes.add(m);
      }

      const exactDate = new Date(minA * 60 * 1000);
      const jobList = Array.from(overlappingJobs);
      const isExactSameMinute = clusteredMinutes.length === 1;

      let severity: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (jobList.length >= 4 || isExactSameMinute) {
        severity = 'HIGH';
      } else if (jobList.length >= 2) {
        severity = 'MEDIUM';
      }

      events.push({
        timestamp: exactDate.toISOString(),
        jobs: jobList,
        severity,
        explanation: `${jobList.length} jobs scheduled within ${contentionThresholdMin}m window: ${jobList.join(', ')}`,
      });
    }
  }

  // Calculate risk score: 0 to 100
  let weightedCollisions = 0;
  for (const ev of events) {
    if (ev.severity === 'HIGH') weightedCollisions += 20;
    else if (ev.severity === 'MEDIUM') weightedCollisions += 10;
    else weightedCollisions += 5;
  }

  const rawScore = Math.min(100, Math.round(weightedCollisions * (jobs.length > 3 ? 1.2 : 1.0)));
  const riskScore = events.length === 0 ? 0 : Math.max(5, rawScore);

  let riskLevel: 'OPTIMAL' | 'ELEVATED' | 'CRITICAL' = 'OPTIMAL';
  if (riskScore >= 65) riskLevel = 'CRITICAL';
  else if (riskScore >= 25) riskLevel = 'ELEVATED';

  // Generate automated recommendations
  const recommendations: string[] = [];
  if (events.length === 0) {
    recommendations.push('✔ Schedules are cleanly distributed. Zero resource contention detected.');
  } else {
    recommendations.push(`Detected ${events.length} schedule clusters causing potential worker or database lock contention.`);

    // Find peak hour
    let peakHour = 0;
    let peakCount = 0;
    hourlyDensity.forEach((cnt, hr) => {
      if (cnt > peakCount) {
        peakCount = cnt;
        peakHour = hr;
      }
    });

    if (peakCount >= 3) {
      recommendations.push(
        `Peak concurrency occurs at ${String(peakHour).padStart(2, '0')}:00 with ${peakCount} task runs. Consider shifting non-critical batch jobs to quieter hours.`
      );
    }

    const highEvents = events.filter((e) => e.severity === 'HIGH');
    if (highEvents.length > 0) {
      const topEvent = highEvents[0];
      recommendations.push(
        `Immediate priority: Stagger [${topEvent.jobs.slice(0, 2).join('] and [')}] by at least 10 minutes to prevent resource lock stampedes.`
      );
    }
  }

  return {
    totalJobs: jobs.length,
    collisionCount: events.length,
    riskScore,
    riskLevel,
    events,
    hourlyDensity,
    recommendations,
  };
}
