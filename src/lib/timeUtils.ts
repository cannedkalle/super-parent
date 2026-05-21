/**
 * Converts a time string (e.g., '9:00 AM', '3:00 PM', '12:30 PM') into minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  // Regex to match "H:MM AM/PM" or "HH:MM AM/PM"
  const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return 0;

  const [_, hoursStr, minutesStr, meridiem] = match;
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (meridiem.toUpperCase() === 'PM' && hours !== 12) {
    hours += 12;
  } else if (meridiem.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

/**
 * Checks if camp hours extend outside standard 9:00 AM to 5:00 PM schedule.
 */
export function needsExtendedCare(startTime: string, endTime: string): boolean {
  if (!startTime || !endTime) return false;
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);
  
  const nineAM = 9 * 60; // 540 minutes
  const fivePM = 17 * 60; // 1020 minutes

  return startMin < nineAM || endMin > fivePM;
}

/**
 * Formats a date string (YYYY-MM-DD) into a nice weekly range label
 * (e.g., "Week 1: Jun 8").
 */
export function getWeeks(startDateStr: string, numWeeks: number): { dateStr: string; label: string }[] {
  const weeks = [];
  // Use T00:00:00 to parse locally and prevent timezone offsets
  const startDate = new Date(startDateStr + 'T00:00:00');
  
  for (let i = 0; i < numWeeks; i++) {
    const weekDate = new Date(startDate);
    weekDate.setDate(startDate.getDate() + i * 7);

    const month = weekDate.toLocaleString('en-US', { month: 'short' });
    const day = weekDate.getDate();
    const label = `Week ${i + 1}: ${month} ${day}`;

    const yyyy = weekDate.getFullYear();
    const mm = String(weekDate.getMonth() + 1).padStart(2, '0');
    const dd = String(weekDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    weeks.push({ dateStr, label });
  }
  return weeks;
}
