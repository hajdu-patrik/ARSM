/** Computes summary-strip data for the scheduler page header: selected date, label, and appointment count. */
import { useMemo } from 'react';
import type { TFunction } from 'i18next';
import { formatLongDate, isPastCalendarDay, isScheduledOn } from '../utils/scheduler-datetime';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';

interface UseSchedulerSummaryArgs {
  readonly selectedDay: number | null;
  readonly calendarYear: number;
  readonly calendarMonth: number;
  readonly monthAppointments: AppointmentDto[];
  /** Number of today's appointments, derived from the loaded month reads. */
  readonly todayAppointmentsCount: number;
  readonly locale: string;
  readonly t: TFunction;
}

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

    return monthAppointments.filter((appointment) => isScheduledOn(appointment, selectedDate)).length;
  }, [monthAppointments, selectedDate, todayAppointmentsCount]);

  return {
    selectedDate,
    isSelectedDateInPast,
    selectedDateLabel,
    summaryDateText,
    summaryCount,
  };
}
