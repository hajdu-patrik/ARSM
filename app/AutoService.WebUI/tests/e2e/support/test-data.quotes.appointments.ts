/** Appointment fixtures for the quote specs: one in a chosen status, and the link to fixture quotes. */
import type { AppointmentDto, AppointmentStatus } from '../../../src/types/scheduler/scheduler.types';
import type { MockApiState } from './test-data';
import { MOCK_CUSTOMER_IDS } from './test-data.constants';

/** Builds an appointment in the given status, with the flags the API derives for it. */
export function buildAppointment(state: MockApiState, id: number, status: AppointmentStatus, taskDescription: string): AppointmentDto {
  const template = state.customerHistoryByCustomerId[MOCK_CUSTOMER_IDS.anna]?.[0];
  if (template === undefined) {
    throw new Error('The fixture history appointment is missing.');
  }

  const isOpen = status === 'InProgress';

  return {
    ...template,
    id,
    taskDescription,
    status,
    completedAt: status === 'Completed' ? template.completedAt : null,
    canceledAt: status === 'Cancelled' ? template.scheduledDate : null,
    hasAcceptedQuote: false,
    canComplete: false,
    canDelete: status !== 'Completed',
    canLinkQuote: isOpen,
  };
}

/** Registers an appointment in the scheduler list and links the given fixture quotes to it. */
export function linkQuotes(state: MockApiState, appointment: AppointmentDto, quoteIds: readonly number[]): void {
  state.appointments.push(appointment);

  for (const quote of state.quotes) {
    if (quoteIds.includes(quote.id)) {
      quote.appointmentId = appointment.id;
    }
  }
}
