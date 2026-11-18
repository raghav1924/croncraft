import { ParsedCron } from './types.js';

const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function explainCron(parsed: ParsedCron): string {
  if (!parsed.isValid) {
    return `Invalid schedule: ${parsed.errors.join('; ')}`;
  }

  const { seconds, minutes, hours, daysOfMonth, months, daysOfWeek, isSixField } = parsed;

  const parts: string[] = [];

  // 1. Seconds
  if (isSixField) {
    if (seconds.length === 60) {
      parts.push('Every second');
    } else if (seconds.length === 1 && seconds[0] === 0) {
      // standard zero second, omit
    } else {
      parts.push(`At second ${seconds.join(', ')}`);
    }
  }

  // 2. Minutes & Hours
  if (minutes.length === 60 && hours.length === 24) {
    if (!isSixField || (seconds.length === 1 && seconds[0] === 0)) {
      parts.push('Every minute');
    }
  } else if (minutes.length === 1 && hours.length === 24) {
    parts.push(`Every hour at minute ${minutes[0]}`);
  } else if (minutes.length === 60 && hours.length === 1) {
    parts.push(`Every minute between ${hours[0]}:00 and ${hours[0]}:59`);
  } else if (hours.length === 1 && minutes.length === 1) {
    const hh = String(hours[0]).padStart(2, '0');
    const mm = String(minutes[0]).padStart(2, '0');
    parts.push(`At ${hh}:${mm}`);
  } else {
    const minText = minutes.length === 60 ? 'every minute' : `minute ${minutes.join(',')}`;
    const hourText = hours.length === 24 ? 'every hour' : `hour ${hours.join(',')}`;
    parts.push(`At ${minText} past ${hourText}`);
  }

  // 3. Day of Month
  if (daysOfMonth.length < 31) {
    parts.push(`on day ${daysOfMonth.join(', ')} of the month`);
  }

  // 4. Month
  if (months.length < 12) {
    const mNames = months.map((m) => MONTH_NAMES[m] || String(m));
    parts.push(`in ${mNames.join(', ')}`);
  }

  // 5. Day of Week
  if (daysOfWeek.length < 7) {
    if (daysOfWeek.length === 5 && daysOfWeek.every((d) => d >= 1 && d <= 5)) {
      parts.push('on weekdays (Mon-Fri)');
    } else if (daysOfWeek.length === 2 && daysOfWeek.includes(0) && daysOfWeek.includes(6)) {
      parts.push('on weekends (Sat-Sun)');
    } else {
      const dNames = daysOfWeek.map((d) => DOW_NAMES[d] || String(d));
      parts.push(`on ${dNames.join(', ')}`);
    }
  }

  return parts.join(' ');
}

export function naturalLanguageToCron(input: string): { cron?: string; explanation?: string; error?: string } {
  const query = input.trim().toLowerCase();

  if (query.includes('every minute') || query === '* * * * *') {
    return { cron: '* * * * *', explanation: 'Every minute' };
  }
  if (query.includes('hourly') || query === 'every hour') {
    return { cron: '0 * * * *', explanation: 'At minute 0 of every hour' };
  }
  if (query.includes('every 5 minutes')) {
    return { cron: '*/5 * * * *', explanation: 'Every 5 minutes' };
  }
  if (query.includes('every 10 minutes')) {
    return { cron: '*/10 * * * *', explanation: 'Every 10 minutes' };
  }
  if (query.includes('every 15 minutes')) {
    return { cron: '*/15 * * * *', explanation: 'Every 15 minutes' };
  }
  if (query.includes('every 30 minutes')) {
    return { cron: '*/30 * * * *', explanation: 'Every 30 minutes' };
  }
  if (query.includes('weekdays at') || query.includes('every weekday at')) {
    const match = query.match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
    if (match) {
      let hour = parseInt(match[1], 10);
      const minute = match[2] ? parseInt(match[2], 10) : 0;
      const meridiem = match[3];
      if (meridiem === 'pm' && hour < 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;
      return { cron: `${minute} ${hour} * * 1-5`, explanation: `At ${hour}:${String(minute).padStart(2, '0')} Monday through Friday` };
    }
  }
  if (query.includes('every day at') || query.includes('daily at')) {
    const match = query.match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
    if (match) {
      let hour = parseInt(match[1], 10);
      const minute = match[2] ? parseInt(match[2], 10) : 0;
      const meridiem = match[3];
      if (meridiem === 'pm' && hour < 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;
      return { cron: `${minute} ${hour} * * *`, explanation: `At ${hour}:${String(minute).padStart(2, '0')} every day` };
    }
  }
  if (query === 'daily' || query.includes('midnight') || query.includes('every day at midnight')) {
    return { cron: '0 0 * * *', explanation: 'At 00:00 every day' };
  }
  if (query.includes('weekly') || query.includes('every sunday')) {
    return { cron: '0 0 * * 0', explanation: 'At 00:00 on Sunday' };
  }
  if (query.includes('monthly') || query.includes('first of the month')) {
    return { cron: '0 0 1 * *', explanation: 'At 00:00 on day 1 of every month' };
  }

  return {
    error: `Could not translate natural phrase "${input}" automatically. Try standard patterns like "every 15 minutes", "daily at 4:30pm", or "weekdays at 9am".`
  };
}
