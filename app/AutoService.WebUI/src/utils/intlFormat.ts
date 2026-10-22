/** Locale mapping, memoized Intl formatters and the canonical 24-hour date presets; feature code
 * never builds its own Intl objects. See app/AutoService.WebUI/CLAUDE.md. */

const INVALID_DATE_TEXT = '-';

const dateTimeFormats = new Map<string, Intl.DateTimeFormat>();
const numberFormats = new Map<string, Intl.NumberFormat>();

/** Maps the app language (`hu` | `en`) to its Intl locale; anything but English is Hungarian, the fallback language. */
function toIntlLocale(language: string): 'hu-HU' | 'en-GB' {
  return language.toLowerCase().startsWith('en') ? 'en-GB' : 'hu-HU';
}

function getDateTimeFormat(language: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const locale = toIntlLocale(language);
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = dateTimeFormats.get(key);

  if (format === undefined) {
    format = new Intl.DateTimeFormat(locale, options);
    dateTimeFormats.set(key, format);
  }

  return format;
}

export function getNumberFormat(language: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const locale = toIntlLocale(language);
  const key = `${locale}|${options === undefined ? '' : JSON.stringify(options)}`;
  let format = numberFormats.get(key);

  if (format === undefined) {
    format = new Intl.NumberFormat(locale, options);
    numberFormats.set(key, format);
  }

  return format;
}

/** Wall-clock time, always 24-hour with a zero-padded hour (HH:mm). */
const TIME_OPTIONS: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };

const SHORT_DATE_OPTIONS: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };

const SHORT_DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = { ...SHORT_DATE_OPTIONS, ...TIME_OPTIONS };

const LONG_DATE_OPTIONS: Intl.DateTimeFormatOptions = { dateStyle: 'full' };

/** `dateStyle` cannot be combined with `hour`/`minute`, so the same full date is spelled out as fields. */
const LONG_DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  ...TIME_OPTIONS,
};

const MONTH_YEAR_OPTIONS: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };

const MONTH_NAME_OPTIONS: Intl.DateTimeFormatOptions = { month: 'long' };

const WEEKDAY_SHORT_OPTIONS: Intl.DateTimeFormatOptions = { weekday: 'short' };

/** Formats a date or ISO string with a preset; unparsable input yields a dash instead of throwing. */
function formatPreset(options: Intl.DateTimeFormatOptions, value: Date | string, language: string): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return INVALID_DATE_TEXT;
  }

  return getDateTimeFormat(language, options).format(date);
}

/** Short date: DD/MM/YYYY in English, `YYYY. MM. DD.` in Hungarian. */
export function formatShortDate(value: Date | string, language: string): string {
  return formatPreset(SHORT_DATE_OPTIONS, value, language);
}

/** Short date plus 24-hour time (HH:mm). */
export function formatShortDateTime(value: Date | string, language: string): string {
  return formatPreset(SHORT_DATE_TIME_OPTIONS, value, language);
}

/** Full date with weekday and month name. */
export function formatLongDate(value: Date | string, language: string): string {
  return formatPreset(LONG_DATE_OPTIONS, value, language);
}

/** Full date with weekday and month name, plus 24-hour time (HH:mm). */
export function formatLongDateTime(value: Date | string, language: string): string {
  return formatPreset(LONG_DATE_TIME_OPTIONS, value, language);
}

export function formatMonthYear(value: Date | string, language: string): string {
  return formatPreset(MONTH_YEAR_OPTIONS, value, language);
}

export function formatMonthName(value: Date | string, language: string): string {
  return formatPreset(MONTH_NAME_OPTIONS, value, language);
}

export function formatWeekdayShort(value: Date | string, language: string): string {
  return formatPreset(WEEKDAY_SHORT_OPTIONS, value, language);
}
