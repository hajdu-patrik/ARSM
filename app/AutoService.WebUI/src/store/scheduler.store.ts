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
  /** Navigates to a different calendar month, clearing the selected day. */
  setCalendarMonth: (year: number, month: number) => void;
  /** Sets or clears the selected day within the current month. */
  setSelectedDay: (day: number | null) => void;
  /** Inserts or updates an appointment in both today and month lists as appropriate. */
  upsertAppointment: (updated: AppointmentDto) => void;
  /** Updates the today loading state. */
  setIsLoadingToday: (v: boolean) => void;
  /** Updates the month loading state. */
  setIsLoadingMonth: (v: boolean) => void;
  /** Sets or clears the error message. */
  setError: (e: string | null) => void;
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

  const isSameDay = (date: Date, year: number, month: number, day: number) => {
    return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
  };

  const upsertById = (appointments: AppointmentDto[], updated: AppointmentDto): AppointmentDto[] => {
    const existingIndex = appointments.findIndex((appointment) => appointment.id === updated.id);
    if (existingIndex === -1) {
      return [...appointments, updated];
    }

    const copy = [...appointments];
    copy[existingIndex] = updated;
    return copy;
  };

  return {
    todayAppointments: [],
    monthAppointments: [],
    calendarYear: initialSessionState.year,
    calendarMonth: initialSessionState.month,
    selectedDay: initialSessionState.day,
    isLoadingToday: false,
    isLoadingMonth: false,
    error: null,
    setTodayAppointments: (appts) => set({ todayAppointments: appts }),
    setMonthAppointments: (appts) => set({ monthAppointments: appts }),
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
          todayAppointments: shouldBeInToday
            ? upsertById(state.todayAppointments, updated)
            : state.todayAppointments,
          monthAppointments: shouldBeInViewedMonth
            ? upsertById(state.monthAppointments, updated)
            : state.monthAppointments,
        };
      }),
    setIsLoadingToday: (isLoadingToday) => set({ isLoadingToday }),
    setIsLoadingMonth: (isLoadingMonth) => set({ isLoadingMonth }),
    setError: (error) => set({ error }),
  };
});