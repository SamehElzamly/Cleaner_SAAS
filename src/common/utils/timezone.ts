// Timezone math without extra dependencies (uses Intl, built into Node).
// Needed because "Monday 09:00" in a staff availability slot means 09:00 in
// the TENANT's local time, not the server's (usually UTC).

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getZonedParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
    second: Number(p.second),
    dayOfWeek: WEEKDAYS.indexOf(p.weekday),
  };
}

// Local "HH:mm" of an instant in the given timezone.
export function toLocalHHmm(date: Date, timeZone: string): string {
  const { hour, minute } = getZonedParts(date, timeZone);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function getOffsetMs(date: Date, timeZone: string): number {
  const p = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function localMidnightToUtc(y: number, m: number, d: number, timeZone: string): Date {
  const guess = Date.UTC(y, m - 1, d);
  const off1 = getOffsetMs(new Date(guess), timeZone);
  let start = guess - off1;
  const off2 = getOffsetMs(new Date(start), timeZone);
  if (off2 !== off1) start = guess - off2; // DST boundary correction
  return new Date(start);
}

// [start, end) of a local calendar day ("YYYY-MM-DD") as UTC instants.
export function zonedDayRange(dateStr: string, timeZone: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return {
    start: localMidnightToUtc(y, m, d, timeZone),
    end: localMidnightToUtc(y, m, d + 1, timeZone),
  };
}
