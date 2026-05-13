/**
 * Monthly calendar view component with appointment indicators.
 * Displays a 6-week grid, navigation controls, and appointment status dots.
 * @module CalendarView
 */
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AppointmentDto, AppointmentStatus, CalendarDay } from '../../../../types/scheduler/scheduler.types';
import { insetSurfaceClass, schedulerNavIconButtonClass } from '../../../../utils/formStyles';

interface CalendarViewProps {
  readonly appointments: AppointmentDto[];
  readonly year: number;
  readonly month: number;
  readonly isLoading: boolean;
  readonly onMonthChange: (year: number, month: number) => void;
  readonly onDayClick?: (day: number) => void;
  readonly selectedDay?: number | null;
}

const STATUS_DOT_COLORS: Record<AppointmentStatus, string> = {
  InProgress: 'bg-arsm-warning-accent',
  Completed: 'bg-arsm-success-accent',
  Cancelled: 'bg-arsm-error-accent',
};

/**
 * Formats a Date into local YYYY-MM-DD for scheduler day bucketing.
 * This avoids UTC conversion drift from Date#toISOString.
 */
function formatLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function buildCalendarDays(year: number, month: number, appointments: AppointmentDto[]): CalendarDay[] {
  const firstDay = new Date(year, month - 1, 1);
  const dayOfWeek = firstDay.getDay();
  const mondayOffset = (dayOfWeek + 6) % 7;

  const startDate = new Date(year, month - 1, 1 - mondayOffset);
  const today = new Date();
  const todayStr = formatLocalDateKey(today);

  const appointmentsByDate = new Map<string, AppointmentDto[]>();
  for (const appt of appointments) {
    const scheduledAt = new Date(appt.scheduledDate);
    if (Number.isNaN(scheduledAt.getTime())) {
      continue;
    }

    const dateKey = formatLocalDateKey(scheduledAt);
    const current = appointmentsByDate.get(dateKey);
    if (current) {
      current.push(appt);
    } else {
      appointmentsByDate.set(dateKey, [appt]);
    }
  }

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = formatLocalDateKey(date);

    days.push({
      date,
      appointments: appointmentsByDate.get(dateStr) ?? [],
      isToday: dateStr === todayStr,
      isCurrentMonth: date.getMonth() === month - 1,
    });
  }

  return days;
}

function getEarliestAppointmentForDay(dayAppointments: AppointmentDto[]): AppointmentDto | null {
  if (dayAppointments.length === 0) {
    return null;
  }

  let earliestAppointment = dayAppointments[0];
  let earliestTimestamp = Number.POSITIVE_INFINITY;

  for (const appointment of dayAppointments) {
    const appointmentTimestamp = new Date(appointment.scheduledDate).getTime();
    if (!Number.isNaN(appointmentTimestamp) && appointmentTimestamp < earliestTimestamp) {
      earliestAppointment = appointment;
      earliestTimestamp = appointmentTimestamp;
    }
  }

  return earliestAppointment;
}

function trimTrailingNextMonthOnlyWeeks(weeks: CalendarDay[][]): CalendarDay[][] {
  const trimmedWeeks = [...weeks];

  while (trimmedWeeks.length > 4) {
    const lastWeek = trimmedWeeks.at(-1);
    if (!lastWeek || lastWeek.some((day) => day.isCurrentMonth)) {
      break;
    }

    trimmedWeeks.pop();
  }

  return trimmedWeeks;
}

const CalendarViewComponent = memo(function CalendarView({
  appointments,
  year,
  month,
  isLoading,
  onMonthChange,
  onDayClick,
  selectedDay,
}: CalendarViewProps) {
  const { t, i18n } = useTranslation();

  const monthLabel = new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1),
  );

  const dayHeaders = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2024, 0, i + 1)));
  }, [i18n.language]);

  const calendarDays = useMemo(() => buildCalendarDays(year, month, appointments), [year, month, appointments]);
  const calendarWeeks = useMemo(() => {
    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }

    return trimTrailingNextMonthOnlyWeeks(weeks);
  }, [calendarDays]);

  const now = new Date();
  const minDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const maxDate = new Date(now.getFullYear(), now.getMonth() + 6, 1);
  const currentDate = new Date(year, month - 1, 1);
  const canGoPrev = currentDate > minDate;
  const canGoNext = currentDate < maxDate;

  const handlePrev = () => {
    if (!canGoPrev) return;
    onMonthChange(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1);
  };

  const handleNext = () => {
    if (!canGoNext) return;
    onMonthChange(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1);
  };

  return (
    <section className={`${insetSurfaceClass} relative select-none overflow-hidden p-3 max-[320px]:px-0 max-[320px]:py-2.5 sm:p-4`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,var(--color-arsm-card)_0%,transparent_100%)] opacity-40 dark:bg-[linear-gradient(180deg,var(--color-arsm-card-dark)_0%,transparent_100%)] dark:opacity-20"
      />

      <div className="mb-3 flex min-w-0 items-center justify-between max-[320px]:mb-2.5">
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canGoPrev}
          title={t('scheduler.calendar.prevMonth')}
          aria-label={t('scheduler.calendar.prevMonth')}
          className={`${schedulerNavIconButtonClass} mx-1`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <h3 className="min-w-0 truncate px-1 text-center text-lg font-semibold capitalize text-arsm-primary max-[320px]:text-sm dark:text-arsm-primary-dark">
          {monthLabel}
        </h3>

        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          title={t('scheduler.calendar.nextMonth')}
          aria-label={t('scheduler.calendar.nextMonth')}
          className={`${schedulerNavIconButtonClass} mx-1`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-arsm-muted dark:text-arsm-muted-dark">{t('scheduler.calendar.loading')}</div>
      ) : (
        <>
          <div className="mb-1 grid grid-cols-7 gap-px max-[320px]:mb-0.5 max-[320px]:gap-0">
            {dayHeaders.map((dayLabel) => (
              <div
                key={dayLabel}
                className="py-1 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-arsm-muted max-[320px]:text-[9px] max-[320px]:tracking-[0.04em] dark:text-arsm-muted-dark"
              >
                {dayLabel}
              </div>
            ))}
          </div>

          <div className="space-y-px">
            {calendarWeeks.map((week) => {
              const hasAppointmentsInWeek = week.some((day) => day.appointments.length > 0);
              const weekKey = `week-${week[0] ? formatLocalDateKey(week[0].date) : 'unknown'}`;

              return (
                <div key={weekKey} className="grid grid-cols-7 gap-px max-[320px]:gap-0">
                  {week.map((day) => {
                    const earliestAppointment = getEarliestAppointmentForDay(day.appointments);
                    const dayNum = day.date.getDate();
                    const isSelected = day.isCurrentMonth && selectedDay === dayNum;
                    const overflowTone = day.isCurrentMonth ? '' : 'opacity-50 saturate-75';
                    const rowHeight = hasAppointmentsInWeek
                      ? 'min-h-[4.5rem] max-[320px]:min-h-[3.8rem] md:min-h-[2.5rem]'
                      : 'min-h-[2.5rem] max-[320px]:min-h-11';

                    const dayClassName = `${rowHeight} rounded-lg p-1 max-[320px]:p-0.5 flex flex-col items-center justify-start ${
                      day.isCurrentMonth
                        ? 'text-arsm-primary dark:text-arsm-primary-dark hover:bg-arsm-hover dark:hover:bg-arsm-hover-dark'
                        : 'text-arsm-muted/75 dark:text-arsm-muted-dark/70'
                    } ${day.isToday ? 'bg-arsm-toggle-bg/80 dark:bg-arsm-toggle-bg-dark/85' : ''} ${
                      isSelected ? 'ring-2 ring-arsm-accent bg-arsm-accent-wash/65 dark:ring-arsm-accent-dark dark:bg-arsm-hover-dark/75' : ''
                    }`;

                    const content = (
                      <>
                        <div className="mb-0.5 flex h-7 items-center justify-center max-[320px]:h-6">
                          {day.isToday ? (
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-arsm-accent text-sm font-semibold text-arsm-primary ring-2 ring-arsm-accent/30 max-[320px]:h-6 max-[320px]:w-6 max-[320px]:text-xs dark:bg-arsm-accent-dark dark:text-arsm-hover dark:ring-arsm-accent-dark/30">
                              {dayNum}
                            </span>
                          ) : (
                            <span className="text-sm font-medium max-[320px]:text-xs">{dayNum}</span>
                          )}
                        </div>

                        <div className="mt-0.5 flex h-5 max-w-full items-center justify-center leading-none">
                          {earliestAppointment ? (
                            <div className={`relative inline-flex h-4 w-4 items-center justify-center ${overflowTone}`}>
                              <span
                                className={`h-3.5 w-3.5 shrink-0 rounded-full ${STATUS_DOT_COLORS[earliestAppointment.status] ?? 'bg-arsm-status-dot-fallback'}`}
                                title={`${earliestAppointment.vehicle.brand} - ${earliestAppointment.taskDescription}`}
                              />
                              {day.appointments.length > 1 && (
                                <span
                                  className="pointer-events-none absolute -right-1.5 -top-1.5 inline-flex h-3 min-w-3 items-center justify-center rounded-full border border-arsm-border bg-arsm-card px-0.5 text-[6px] font-semibold leading-none text-arsm-muted dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:text-arsm-muted-dark"
                                  aria-hidden="true"
                                >
                                  +{day.appointments.length - 1}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="h-2.5 w-2.5" aria-hidden="true" />
                          )}
                        </div>
                      </>
                    );

                    const dayKey = formatLocalDateKey(day.date);

                    if (day.isCurrentMonth && onDayClick) {
                      const dayTestId = `calendar-day-${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                      const dayAriaLabel = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'full' }).format(day.date);
                      return (
                        <button
                          type="button"
                          key={dayKey}
                          data-testid={dayTestId}
                          aria-label={dayAriaLabel}
                          onClick={() => onDayClick(dayNum)}
                          className={`${dayClassName} cursor-pointer text-left`}
                        >
                          {content}
                        </button>
                      );
                    }

                    return (
                      <div key={dayKey} className={dayClassName}>
                        {content}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
});

CalendarViewComponent.displayName = 'CalendarView';
export const CalendarView = CalendarViewComponent;
