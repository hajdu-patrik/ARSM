/** Pure helpers of the scheduler calendar window: the month trio around the viewed month and the merged lists. */

import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';

/** Calendar coordinates of one scheduler month read. */
export interface CalendarMonthView {
  readonly year: number;
  readonly month: number;
}

/** Shared empty list, so a read without data yet keeps one stable reference between renders. */
export const EMPTY_APPOINTMENTS: AppointmentDto[] = [];

/** The month (local time) that holds the given date. */
export function getMonthViewOfDate(date: Date): CalendarMonthView {
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

/** Builds the previous-current-next month window used to hydrate the scheduler calendar grid. */
export function getAdjacentMonthViews(year: number, month: number): readonly [CalendarMonthView, CalendarMonthView, CalendarMonthView] {
  return [
    getMonthViewOfDate(new Date(year, month - 2, 1)),
    getMonthViewOfDate(new Date(year, month - 1, 1)),
    getMonthViewOfDate(new Date(year, month, 1)),
  ];
}

/** Merges appointment groups, keeping the first occurrence of each appointment id. */
export function mergeUniqueAppointments(...appointmentGroups: readonly (readonly AppointmentDto[])[]): AppointmentDto[] {
  const merged = new Map<number, AppointmentDto>();

  for (const group of appointmentGroups) {
    for (const appointment of group) {
      if (!merged.has(appointment.id)) {
        merged.set(appointment.id, appointment);
      }
    }
  }

  return Array.from(merged.values());
}
