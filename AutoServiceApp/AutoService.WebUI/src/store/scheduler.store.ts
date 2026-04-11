import { create } from 'zustand';
import type { AppointmentDto } from '../types/scheduler/scheduler.types';

interface SchedulerState {
  todayAppointments: AppointmentDto[];
  monthAppointments: AppointmentDto[];
  calendarYear: number;
  calendarMonth: number;
  selectedDay: number | null;
  isLoadingToday: boolean;
  isLoadingMonth: boolean;
  error: string | null;
  setTodayAppointments: (appts: AppointmentDto[]) => void;
  setMonthAppointments: (appts: AppointmentDto[]) => void;
  setCalendarMonth: (year: number, month: number) => void;
  setSelectedDay: (day: number | null) => void;
  upsertAppointment: (updated: AppointmentDto) => void;
  setIsLoadingToday: (v: boolean) => void;
  setIsLoadingMonth: (v: boolean) => void;
  setError: (e: string | null) => void;
}

const SCHEDULER_SESSION_KEY = 'scheduler-selected-view';

interface SchedulerSessionState {
  year: number;
  month: number;
  day: number | null;
}

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