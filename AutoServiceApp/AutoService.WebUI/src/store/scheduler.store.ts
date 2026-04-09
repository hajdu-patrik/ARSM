import { create } from 'zustand';
import type { AppointmentDto } from '../types/scheduler.types';

interface SchedulerState {
  todayAppointments: AppointmentDto[];
  monthAppointments: AppointmentDto[];
  calendarYear: number;
  calendarMonth: number;
  isLoadingToday: boolean;
  isLoadingMonth: boolean;
  error: string | null;
  setTodayAppointments: (appts: AppointmentDto[]) => void;
  setMonthAppointments: (appts: AppointmentDto[]) => void;
  setCalendarMonth: (year: number, month: number) => void;
  upsertAppointment: (updated: AppointmentDto) => void;
  setIsLoadingToday: (v: boolean) => void;
  setIsLoadingMonth: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useSchedulerStore = create<SchedulerState>((set) => {
  const initNow = new Date();

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
    calendarYear: initNow.getFullYear(),
    calendarMonth: initNow.getMonth() + 1,
    isLoadingToday: false,
    isLoadingMonth: false,
    error: null,
    setTodayAppointments: (appts) => set({ todayAppointments: appts }),
    setMonthAppointments: (appts) => set({ monthAppointments: appts }),
    setCalendarMonth: (year, month) => set({ calendarYear: year, calendarMonth: month }),
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