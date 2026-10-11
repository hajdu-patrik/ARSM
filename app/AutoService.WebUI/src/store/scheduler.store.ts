/** Scheduler view state: the viewed month and the selected day, kept per tab in sessionStorage.
 * Server data lives in the TanStack Query cache, never in this store. */

import { create } from 'zustand';
import { isRecord } from '../services/http/record-guard';
import { readStorage, removeStorage, writeStorage } from '../utils/safeStorage';

/** Shape of the scheduler Zustand store. */
interface SchedulerState {
  /** Currently viewed calendar year. */
  calendarYear: number;
  /** Currently viewed calendar month (1-12). */
  calendarMonth: number;
  /** Currently selected day-of-month, or {@code null} if no day is selected. */
  selectedDay: number | null;
  /** Navigates to a different calendar month, clearing the selected day. */
  setCalendarMonth: (year: number, month: number) => void;
  /** Sets or clears the selected day within the current month. */
  setSelectedDay: (day: number | null) => void;
}

/** {@code sessionStorage} key for persisting the scheduler view state per tab. */
const SCHEDULER_SESSION_KEY = 'scheduler-selected-view';

/** Serializable scheduler view state stored in {@code sessionStorage}. */
interface SchedulerSessionState {
  /** Calendar year. */
  year: number;
  /** Calendar month (1-12). */
  month: number;
  /** Selected day-of-month, or {@code null}. */
  day: number | null;
}

/** The view that shows a date: its month, with the date's day selected. */
function viewOfDate(date: Date): SchedulerSessionState {
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

/** Narrows a parsed storage value to a view state, taking the fallback for every missing or mistyped field. */
function parseSessionState(value: unknown, fallback: SchedulerSessionState): SchedulerSessionState {
  if (!isRecord(value)) {
    return fallback;
  }

  const { year, month, day } = value;

  return {
    year: typeof year === 'number' ? year : fallback.year,
    month: typeof month === 'number' ? month : fallback.month,
    day: day === null || typeof day === 'number' ? day : fallback.day,
  };
}

/** Reads the persisted scheduler view state from {@code sessionStorage}, falling back to today's date. */
function readSessionState(fallback: SchedulerSessionState): SchedulerSessionState {
  const raw = readStorage('session', SCHEDULER_SESSION_KEY);
  if (raw === null) {
    return fallback;
  }

  try {
    return parseSessionState(JSON.parse(raw), fallback);
  } catch {
    return fallback;
  }
}

/** Persists the current scheduler view state to {@code sessionStorage}; a blocked storage is ignored. */
function writeSessionState(state: SchedulerSessionState): void {
  writeStorage('session', SCHEDULER_SESSION_KEY, JSON.stringify(state));
}

/** Zustand store for the scheduler view; initializes from {@code sessionStorage} (falls back to today). */
export const useSchedulerStore = create<SchedulerState>((set, get) => {
  const initialState = readSessionState(viewOfDate(new Date()));

  return {
    calendarYear: initialState.year,
    calendarMonth: initialState.month,
    selectedDay: initialState.day,
    setCalendarMonth: (year, month) => {
      writeSessionState({ year, month, day: null });
      set({ calendarYear: year, calendarMonth: month, selectedDay: null });
    },
    setSelectedDay: (selectedDay) => {
      const { calendarYear, calendarMonth } = get();
      writeSessionState({ year: calendarYear, month: calendarMonth, day: selectedDay });
      set({ selectedDay });
    },
  };
});

/** Forgets the persisted scheduler view and resets the store to today; runs at every auth boundary. */
export function clearSchedulerSession(): void {
  const today = viewOfDate(new Date());

  removeStorage('session', SCHEDULER_SESSION_KEY);
  useSchedulerStore.setState({ calendarYear: today.year, calendarMonth: today.month, selectedDay: today.day });
}
