/**
 * Scheduler state store.
 *
 * Manages appointment data (today and month views), calendar navigation
 * (year, month, selected day), and loading/error states. View state
 * is persisted per browser tab via {@code sessionStorage}.
 * @module store/scheduler.store
 */

import { create } from 'zustand';
import type { AppointmentDto } from '../types/scheduler/scheduler.types';

/**
 * Shape of the scheduler Zustand store.
 */
interface SchedulerState {
  /** Appointments scheduled for today. */
  todayAppointments: AppointmentDto[];
  /** Appointments for the currently viewed calendar month. */
  monthAppointments: AppointmentDto[];
  /** Appointments used by the month grid, including leading/trailing overflow days. */
  calendarAppointments: AppointmentDto[];
  /** Currently viewed calendar year. */
  calendarYear: number;
  /** Currently viewed calendar month (1–12). */
  calendarMonth: number;
  /** Currently selected day-of-month, or {@code null} if no day is selected. */
  selectedDay: number | null;
  /** Whether today's appointments are being fetched. */
  isLoadingToday: boolean;
  /** Whether the month's appointments are being fetched. */
  isLoadingMonth: boolean;
  /** Current error message key, or {@code null} if no error. */
  error: string | null;
  /** Replaces the today appointment list. */
  setTodayAppointments: (appts: AppointmentDto[]) => void;
  /** Replaces the month appointment list. */
  setMonthAppointments: (appts: AppointmentDto[]) => void;
  /** Replaces calendar-grid appointments, including adjacent month overflow days. */
  setCalendarAppointments: (appts: AppointmentDto[]) => void;
  /** Navigates to a different calendar month, clearing the selected day. */
  setCalendarMonth: (year: number, month: number) => void;
  /** Sets or clears the selected day within the current month. */
  setSelectedDay: (day: number | null) => void;
  /** Inserts or updates an appointment in both today and month lists as appropriate. */
  upsertAppointment: (updated: AppointmentDto) => void;
  /** Removes a hard-deleted appointment from the today, month, and calendar-grid lists. */
  removeAppointment: (id: number) => void;
  /** Updates the today loading state. */
  setIsLoadingToday: (isLoadingToday: boolean) => void;
  /** Updates the month loading state. */
  setIsLoadingMonth: (isLoadingMonth: boolean) => void;
  /** Sets or clears the error message. */
  setError: (error: string | null) => void;
}

/** {@code sessionStorage} key for persisting the scheduler view state per tab. */
const SCHEDULER_SESSION_KEY = 'scheduler-selected-view';

/**
 * Serializable scheduler view state stored in {@code sessionStorage}.
 */
interface SchedulerSessionState {
  /** Calendar year. */
  year: number;
  /** Calendar month (1–12). */
  month: number;
  /** Selected day-of-month, or {@code null}. */
  day: number | null;
}

/**
 * Reads the persisted scheduler view state from {@code sessionStorage}.
 * Falls back to today's date if no valid state is found.
 * @param fallbackDate - Date to use as the default when no session state exists.
 * @returns The restored or fallback view state.
 */
function readSessionState(fallbackDate: Date): SchedulerSessionState {
  const fallbackState: SchedulerSessionState = {
    year: fallbackDate.getFullYear(),
    month: fallbackDate.getMonth() + 1,
    day: fallbackDate.getDate(),
  };

  if (typeof globalThis === 'undefined' || !('sessionStorage' in globalThis)) {
    return fallbackState;
  }

  try {
    const raw = globalThis.sessionStorage.getItem(SCHEDULER_SESSION_KEY);
    if (!raw) {
      return fallbackState;
    }

    const parsed = JSON.parse(raw) as Partial<SchedulerSessionState>;
    const year = typeof parsed.year === 'number' ? parsed.year : fallbackState.year;
    const month = typeof parsed.month === 'number' ? parsed.month : fallbackState.month;
    const day = parsed.day === null || typeof parsed.day === 'number' ? parsed.day : fallbackState.day;

    return { year, month, day };
  } catch {
    return fallbackState;
  }
}

/**
 * Persists the current scheduler view state to {@code sessionStorage}.
 * Silently ignores storage failures to keep in-memory state functional.
 * @param state - The view state to persist.
 */
function writeSessionState(state: SchedulerSessionState): void {
  if (typeof globalThis === 'undefined' || !('sessionStorage' in globalThis)) {
    return;
  }

  try {
    globalThis.sessionStorage.setItem(SCHEDULER_SESSION_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures and keep in-memory state functional.
  }
}

/**
 * Zustand store for scheduler state.
 * Initializes calendar view from {@code sessionStorage} (falling back to today)
 * and keeps session state synchronized on every navigation change.
 */
export const useSchedulerStore = create<SchedulerState>((set) => {
  const initNow = new Date();
  const initialSessionState = readSessionState(initNow);

  /** Checks whether a date matches the provided year-month-day tuple. */
  const isSameDay = (date: Date, year: number, month: number, day: number) => {
    return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
  };

  /**
   * Removes an appointment by id, returning the original array when the id is absent so
   * untouched buckets keep referential equality and do not re-render.
   */
  const omitById = (appointments: AppointmentDto[], id: number): AppointmentDto[] => {
    return appointments.some((appointment) => appointment.id === id)
      ? appointments.filter((appointment) => appointment.id !== id)
      : appointments;
  };

  /**
   * Inserts, replaces, or removes an appointment by id so a bucket never keeps a stale copy.
   *
   * Rescheduling can move an appointment out of a bucket, so membership has to be re-evaluated
   * on every write; returning the original array when nothing changed keeps referential equality
   * and avoids needless re-renders.
   */
  const placeById = (
    appointments: AppointmentDto[],
    updated: AppointmentDto,
    belongsHere: boolean,
  ): AppointmentDto[] => {
    if (!belongsHere) {
      return omitById(appointments, updated.id);
    }

    const existingIndex = appointments.findIndex((appointment) => appointment.id === updated.id);
    if (existingIndex === -1) {
      return [...appointments, updated];
    }

    const copy = [...appointments];
    copy[existingIndex] = updated;
    return copy;
  };

  /**
   * Checks whether a date falls in the viewed month or either adjacent month.
   *
   * The six-week calendar grid spills into the previous and next month, and useSchedulerDataSync
   * fills calendarAppointments from all three, so that is the membership window here too.
   */
  const isWithinCalendarWindow = (date: Date, viewYear: number, viewMonth: number): boolean => {
    const scheduledMonthIndex = date.getFullYear() * 12 + date.getMonth();
    const viewedMonthIndex = viewYear * 12 + (viewMonth - 1);
    return Math.abs(scheduledMonthIndex - viewedMonthIndex) <= 1;
  };

  return {
    todayAppointments: [],
    monthAppointments: [],
    calendarAppointments: [],
    calendarYear: initialSessionState.year,
    calendarMonth: initialSessionState.month,
    selectedDay: initialSessionState.day,
    isLoadingToday: false,
    isLoadingMonth: false,
    error: null,
    setTodayAppointments: (appts) => set({ todayAppointments: appts }),
    setMonthAppointments: (appts) => set({ monthAppointments: appts }),
    setCalendarAppointments: (appts) => set({ calendarAppointments: appts }),
    setCalendarMonth: (year, month) =>
      set(() => {
        writeSessionState({ year, month, day: null });
        return { calendarYear: year, calendarMonth: month, selectedDay: null };
      }),
    setSelectedDay: (selectedDay) =>
      set((state) => {
        writeSessionState({
          year: state.calendarYear,
          month: state.calendarMonth,
          day: selectedDay,
        });

        return { selectedDay };
      }),
    upsertAppointment: (updated) =>
      set((state) => {
        const now = new Date();
        const scheduled = new Date(updated.scheduledDate);

        const shouldBeInToday = isSameDay(
          scheduled,
          now.getFullYear(),
          now.getMonth() + 1,
          now.getDate(),
        );

        const shouldBeInViewedMonth =
          scheduled.getFullYear() === state.calendarYear &&
          scheduled.getMonth() + 1 === state.calendarMonth;

        return {
          todayAppointments: placeById(state.todayAppointments, updated, shouldBeInToday),
          monthAppointments: placeById(state.monthAppointments, updated, shouldBeInViewedMonth),
          calendarAppointments: placeById(
            state.calendarAppointments,
            updated,
            isWithinCalendarWindow(scheduled, state.calendarYear, state.calendarMonth),
          ),
        };
      }),
    removeAppointment: (id) =>
      set((state) => ({
        todayAppointments: omitById(state.todayAppointments, id),
        monthAppointments: omitById(state.monthAppointments, id),
        calendarAppointments: omitById(state.calendarAppointments, id),
      })),
    setIsLoadingToday: (isLoadingToday) => set({ isLoadingToday }),
    setIsLoadingMonth: (isLoadingMonth) => set({ isLoadingMonth }),
    setError: (error) => set({ error }),
  };
});