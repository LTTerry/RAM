export type SupportedTimezone = 'Asia/Hong_Kong' | 'UTC' | 'local' | 'America/Los_Angeles' | 'America/New_York';

export interface TimezoneOption {
  key: SupportedTimezone;
  label: string;
  badge: string;
  offsetLabel: string;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { key: 'Asia/Hong_Kong', label: 'Hong Kong Time', badge: 'HKT', offsetLabel: 'UTC+8' },
  { key: 'UTC', label: 'Universal Time', badge: 'UTC', offsetLabel: 'UTC+0' },
  { key: 'local', label: 'Local Device Time', badge: 'LOCAL', offsetLabel: 'System' },
  { key: 'America/Los_Angeles', label: 'US Pacific Time', badge: 'PDT', offsetLabel: 'UTC-7' },
  { key: 'America/New_York', label: 'US Eastern Time', badge: 'EDT', offsetLabel: 'UTC-4' },
];

/**
 * Format an ISO string or Date object into a readable date/time based on the selected timezone
 */
export function formatToTimezone(
  dateInput: string | number | Date | null | undefined,
  tz: SupportedTimezone | string = 'Asia/Hong_Kong',
  options: {
    includeSeconds?: boolean;
    includeDayOfWeek?: boolean;
    shortDate?: boolean;
  } = {}
): {
  dateString: string;
  dayOfWeek: string;
  timeString: string;
  fullString: string;
  tzBadge: string;
  tzOffsetLabel: string;
} {
  if (!dateInput) {
    return {
      dateString: 'N/A',
      dayOfWeek: '',
      timeString: '',
      fullString: 'Pending',
      tzBadge: '',
      tzOffsetLabel: '',
    };
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return {
      dateString: String(dateInput),
      dayOfWeek: '',
      timeString: '',
      fullString: String(dateInput),
      tzBadge: '',
      tzOffsetLabel: '',
    };
  }

  const tzOpt = TIMEZONE_OPTIONS.find(o => o.key === tz) || TIMEZONE_OPTIONS[0];
  const timeZone = tz === 'local' ? undefined : tz;

  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: options.includeDayOfWeek !== false ? 'long' : undefined,
    month: options.shortDate ? 'short' : 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: options.includeSeconds ? '2-digit' : undefined,
    hour12: true,
  });

  const parts = dtf.formatToParts(d);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';

  const dayOfWeek = getPart('weekday');
  const month = getPart('month');
  const day = getPart('day');
  const year = getPart('year');
  const hour = getPart('hour');
  const minute = getPart('minute');
  const second = getPart('second');
  const dayPeriod = getPart('dayPeriod');

  const dateString = `${month} ${day}, ${year}`;
  const timeString = options.includeSeconds 
    ? `${hour}:${minute}:${second} ${dayPeriod}` 
    : `${hour}:${minute} ${dayPeriod}`;

  const tzSuffix = tz === 'local' 
    ? `(Local: ${Intl.DateTimeFormat().resolvedOptions().timeZone})` 
    : `(${tzOpt.offsetLabel} ${tzOpt.badge})`;

  const fullString = dayOfWeek 
    ? `${dayOfWeek}, ${dateString} at ${timeString} ${tzSuffix}`
    : `${dateString} at ${timeString} ${tzSuffix}`;

  return {
    dateString,
    dayOfWeek,
    timeString,
    fullString,
    tzBadge: tzOpt.badge,
    tzOffsetLabel: tzOpt.offsetLabel,
  };
}
