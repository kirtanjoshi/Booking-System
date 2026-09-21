/**
 * Timezone utility helpers for local time <-> UTC conversions and formatting.
 * Uses standard Intl and Date APIs without external heavy dependencies.
 */

export function localTimeToUtc(dateStr: string, timeStr: string, timeZone: string = 'Asia/Kathmandu'): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);

  // Approximate UTC date from the provided wall-clock numbers
  const approxUtc = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));

  // Determine what wall-clock time that UTC timestamp represents in the target timeZone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(approxUtc);

  const getPart = (type: string) => {
    const val = parts.find((p) => p.type === type)?.value;
    return val ? parseInt(val, 10) : 0;
  };

  const tzYear = getPart('year');
  const tzMonth = getPart('month');
  const tzDay = getPart('day');
  let tzHour = getPart('hour');
  if (tzHour === 24) tzHour = 0;
  const tzMin = getPart('minute');

  const tzTimeAsUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMin, 0, 0);
  const offsetMs = tzTimeAsUtc - approxUtc.getTime();

  return new Date(approxUtc.getTime() - offsetMs);
}

export function formatInTimeZone(
  date: Date,
  timeZone: string = 'Asia/Kathmandu',
  options: Intl.DateTimeFormatOptions,
  locale: string = 'en-US',
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    ...options,
  }).format(date);
}

export function getLocalDateString(offsetDays: number = 0, timeZone: string = 'Asia/Kathmandu'): string {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}
