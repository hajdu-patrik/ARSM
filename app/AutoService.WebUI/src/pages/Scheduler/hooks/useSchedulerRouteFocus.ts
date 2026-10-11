/** Route focus of the scheduler: a link from a customer's history carries the appointment to show. */
import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router';
import { isRecord } from '../../../services/http/record-guard';
import { useSchedulerStore } from '../../../store/scheduler.store';

/** Router state of a link that focuses one appointment. */
interface SchedulerFocusState {
  readonly focusAppointmentId: number;
  readonly focusScheduledDate: string;
}

/** Narrows the router state to a focus request, or null when it carries none. */
function parseSchedulerFocusState(value: unknown): SchedulerFocusState | null {
  if (!isRecord(value)) {
    return null;
  }

  const { focusAppointmentId, focusScheduledDate } = value;

  if (typeof focusAppointmentId !== 'number' || !Number.isFinite(focusAppointmentId)) {
    return null;
  }

  if (typeof focusScheduledDate !== 'string') {
    return null;
  }

  return { focusAppointmentId, focusScheduledDate };
}

/** Shows the month and day of the focused appointment once and returns its id, which the page opens when it is loaded. */
export function useSchedulerRouteFocus(): number | null {
  const location = useLocation();
  const setCalendarMonth = useSchedulerStore((state) => state.setCalendarMonth);
  const setSelectedDay = useSchedulerStore((state) => state.setSelectedDay);
  const routeFocus = useMemo(() => parseSchedulerFocusState(location.state), [location.state]);
  const isAppliedRef = useRef(false);

  useEffect(() => {
    if (routeFocus === null || isAppliedRef.current) {
      return;
    }

    isAppliedRef.current = true;
    const scheduledDate = new Date(routeFocus.focusScheduledDate);
    if (!Number.isNaN(scheduledDate.getTime())) {
      setCalendarMonth(scheduledDate.getFullYear(), scheduledDate.getMonth() + 1);
      setSelectedDay(scheduledDate.getDate());
    }
  }, [routeFocus, setCalendarMonth, setSelectedDay]);

  return routeFocus?.focusAppointmentId ?? null;
}
