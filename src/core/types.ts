export type CronFieldType = 'second' | 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek';

export interface FieldConstraint {
  min: number;
  max: number;
  names?: Record<string, number>;
}

export interface ParsedCron {
  raw: string;
  isSixField: boolean;
  seconds: number[];
  minutes: number[];
  hours: number[];
  daysOfMonth: number[];
  months: number[];
  daysOfWeek: number[];
  isValid: boolean;
  errors: string[];
}

export interface NextRunOccurrence {
  index: number;
  date: Date;
  iso: string;
  utcString: string;
  relativeTime: string;
}

export interface MultiTimezoneRun {
  utc: string;
  est: string;
  pst: string;
  gmt: string;
  ist: string;
  jst: string;
  relative: string;
}

export interface ScheduledJob {
  id: string;
  name: string;
  expression: string;
  command?: string;
  parsed: ParsedCron;
  description: string;
}

export interface CollisionEvent {
  timestamp: string;
  jobs: string[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
}

export interface CollisionAuditResult {
  totalJobs: number;
  collisionCount: number;
  riskScore: number; // 0 to 100
  riskLevel: 'OPTIMAL' | 'ELEVATED' | 'CRITICAL';
  events: CollisionEvent[];
  hourlyDensity: number[]; // 24 buckets representing jobs triggering in each hour
  recommendations: string[];
}

export interface CrontabFileParseResult {
  jobs: ScheduledJob[];
  environmentVars: Record<string, string>;
  comments: string[];
  syntaxErrors: string[];
}
