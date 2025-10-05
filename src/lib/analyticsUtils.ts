import { startOfDay, startOfWeek, startOfMonth, subDays, isAfter } from 'date-fns';

interface TimeEntry {
  start_time: string;
  end_time?: string;
  duration_seconds: number;
}

export const calculateTimeBreakdown = (entries: TimeEntry[]) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  let dayTotal = 0;
  let weekTotal = 0;
  let monthTotal = 0;

  entries.forEach((entry) => {
    if (!entry.end_time) return;
    
    const entryDate = new Date(entry.start_time);
    
    if (isAfter(entryDate, todayStart)) {
      dayTotal += entry.duration_seconds;
    }
    if (isAfter(entryDate, weekStart)) {
      weekTotal += entry.duration_seconds;
    }
    if (isAfter(entryDate, monthStart)) {
      monthTotal += entry.duration_seconds;
    }
  });

  return {
    day: dayTotal,
    week: weekTotal,
    month: monthTotal,
  };
};

export const calculateStreak = (entries: TimeEntry[]): number => {
  if (entries.length === 0) return 0;

  const completedEntries = entries.filter(e => e.end_time);
  if (completedEntries.length === 0) return 0;

  // Get unique days with entries
  const daysWithEntries = new Set(
    completedEntries.map(entry => 
      startOfDay(new Date(entry.start_time)).getTime()
    )
  );

  const sortedDays = Array.from(daysWithEntries).sort((a, b) => b - a);
  
  let streak = 0;
  const today = startOfDay(new Date()).getTime();
  
  // Check if there's an entry today or yesterday to start counting
  if (sortedDays[0] !== today && sortedDays[0] !== subDays(today, 1).getTime()) {
    return 0;
  }

  // Count consecutive days
  let expectedDay = sortedDays[0];
  for (const day of sortedDays) {
    if (day === expectedDay) {
      streak++;
      expectedDay = subDays(expectedDay, 1).getTime();
    } else {
      break;
    }
  }

  return streak;
};

export const formatCompactTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours === 0 && minutes === 0) return '0m';
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  
  return `${hours}h ${minutes}m`;
};
