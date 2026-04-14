/**
 * Hook that computes summary-strip data for the scheduler page header.
 *
 * Derives the selected date object, its formatted label, whether it is
 * in the past, the display text (selected day vs. today), and the
 * appointment count for the relevant day.
 *
 * @module useSchedulerSummary
 */
import { useMemo } from 'react';
import { formatLongDate, isPastCalendarDay } from '../utils/scheduler-datetime';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';

/** Configuration for {@link useSchedulerSummary}. */
interface UseSchedulerSummaryArgs {
  /** Currently selected day-of-month (1-based), or `null` if no day is selected. */
  readonly selectedDay: number | null;
  /** Currently displayed calendar year. */
  readonly calendarYear: number;
  /** Currently displayed calendar month (1-based). */
  readonly calendarMonth: number;
  /** All appointments loaded for the current month. */
  readonly monthAppointments: AppointmentDto[];
  /** Number of today's appointments (from the dedicated today endpoint). */
  readonly todayAppointmentsCount: number;
  /** Active i18n locale code (e.g. "en", "hu"). */
  readonly locale: string;
  /** i18next translation function. */
  readonly t: (key: string, options?: Record<string, unknown>) => string;
}

/**
 * Computes display data for the scheduler summary strip.
 *
 * @returns `selectedDate`, `isSelectedDateInPast`, `selectedDateLabel`,
 *          `summaryDateText`, and `summaryCount`.
 */
export function useSchedulerSummary({
  selectedDay,
  calendarYear,
  calendarMonth,
  monthAppointments,
  todayAppointmentsCount,
  locale,
  t,
}: UseSchedulerSummaryArgs) {
  const selectedDate = useMemo(() => {
    if (selectedDay === null) {
      return null;
    }

    const maxDayInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
    if (selectedDay < 1 || selectedDay > maxDayInMonth) {
      return null;
    }

    return new Date(calendarYear, calendarMonth - 1, selectedDay);
  }, [calendarMonth, calendarYear, selectedDay]);

  const isSelectedDateInPast = useMemo(() => {
    if (!selectedDate) {
      return false;
    }

    return isPastCalendarDay(selectedDate);
  }, [selectedDate]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) {
      return null;
    }

    return formatLongDate(selectedDate, locale);
  }, [locale, selectedDate]);

  const todayFormatted = useMemo(() => {
    return formatLongDate(new Date(), locale);
  }, [locale]);

  const summaryDateText = useMemo(() => {
    if (selectedDateLabel) {
      return t('scheduler.selectedDate', { date: selectedDateLabel });
    }

    return t('scheduler.todayDate', { date: todayFormatted });
  }, [selectedDateLabel, t, todayFormatted]);

  const summaryCount = useMemo(() => {
    if (!selectedDate) {
      return todayAppointmentsCount;
    }

    return monthAppointments.filter((appointment) => {
      const scheduled = new Date(appointment.scheduledDate);
      return scheduled.getFullYear() === selectedDate.getFullYear() &&
        scheduled.getMonth() === selectedDate.getMonth() &&
        scheduled.getDate() === selectedDate.getDate();
    }).length;
  }, [monthAppointments, selectedDate, todayAppointmentsCount]);

  return {
    selectedDate,
    isSelectedDateInPast,
    selectedDateLabel,
    summaryDateText,
    summaryCount,
  };
}
