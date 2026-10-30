/** Builders for the appointments and dates the scheduler specs seed into the mock state. */
import type { AppointmentDto, AppointmentStatus } from '../../../src/types/scheduler/scheduler.types';
import type { MockApiState } from './test-data';
import { MOCK_CUSTOMER_IDS } from './test-data.constants';

const HOUR_MS = 60 * 60 * 1000;

export const DAY_MS = 24 * HOUR_MS;

/** One mechanic as the API lists it on an appointment. */
export type AppointmentMechanic = AppointmentDto['mechanics'][number];

/** What a spec chooses about a seeded appointment; the rest is taken from the fixture history appointment. */
export interface AppointmentSeed {
  readonly id: number;
  readonly status?: AppointmentStatus;
  readonly task?: string;
  readonly scheduledAt?: Date;
  readonly dueAt?: Date;
  /** Person ids of mock mechanics, in the order the API lists them. */
  readonly mechanicIds?: readonly number[];
  /** Mechanics that are no mock mechanic, for example a placeholder name. */
  readonly extraMechanics?: readonly AppointmentMechanic[];
}

/** The summary of a mock mechanic, shaped like the appointment DTO carries it. */
export function mechanicSummary(state: MockApiState, personId: number): AppointmentMechanic {
  const mechanic = state.mechanics.find((candidate) => candidate.personId === personId);
  if (mechanic === undefined) {
    throw new Error(`Unknown mock mechanic ${String(personId)}.`);
  }

  return {
    id: mechanic.personId,
    fullName: [mechanic.firstName, mechanic.middleName, mechanic.lastName].filter(Boolean).join(' '),
    specialization: mechanic.specialization,
    hasProfilePicture: mechanic.hasProfilePicture ?? false,
  };
}

/** Adds an appointment to the mock state, built from the fixture history appointment (Anna's Golf). */
export function seedAppointment(state: MockApiState, seed: AppointmentSeed): AppointmentDto {
  const template = state.customerHistoryByCustomerId[MOCK_CUSTOMER_IDS.anna]?.[0];
  if (template === undefined) {
    throw new Error('The fixture history appointment is missing.');
  }

  const status = seed.status ?? 'InProgress';
  const scheduledAt = seed.scheduledAt ?? new Date();
  const dueAt = seed.dueAt ?? new Date(scheduledAt.getTime() + DAY_MS);
  const appointment: AppointmentDto = {
    ...template,
    id: seed.id,
    scheduledDate: scheduledAt.toISOString(),
    dueDateTime: dueAt.toISOString(),
    taskDescription: seed.task ?? `Seeded task ${String(seed.id)}`,
    status,
    completedAt: status === 'Completed' ? scheduledAt.toISOString() : null,
    canceledAt: status === 'Cancelled' ? scheduledAt.toISOString() : null,
    mechanics: [
      ...(seed.mechanicIds ?? []).map((personId) => mechanicSummary(state, personId)),
      ...(seed.extraMechanics ?? []),
    ],
    version: 1,
    hasAcceptedQuote: false,
    canComplete: false,
    canDelete: status !== 'Completed',
    canLinkQuote: status === 'InProgress',
  };

  state.appointments.push(appointment);
  return appointment;
}

/** A local date-time on the given day of the current month. */
export function onDayOfCurrentMonth(day: number, hour: number): Date {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), day, hour, 0, 0, 0);
}

/** A local date-time today at the given hour. */
export function todayAt(hour: number): Date {
  return onDayOfCurrentMonth(new Date().getDate(), hour);
}

/** A day of the current month that is not today and exists in every month. */
export function otherDayOfCurrentMonth(): number {
  const today = new Date().getDate();

  return today > 10 ? today - 5 : today + 5;
}

/** The first day (1 to 28) of the current month that none of the given days uses. */
export function unusedDayOfCurrentMonth(...usedDays: readonly number[]): number {
  for (let day = 1; day <= 28; day += 1) {
    if (!usedDays.includes(day)) {
      return day;
    }
  }

  throw new Error('Every day of the month is used.');
}

/** Year and month (1 to 12) that lie `offset` months from the current one. */
export function monthWithOffset(offset: number): { year: number; month: number } {
  const date = new Date(new Date().getFullYear(), new Date().getMonth() + offset, 1);

  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

/** The value a `datetime-local` input holds for a local date-time (`YYYY-MM-DDTHH:mm`). */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');

  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
