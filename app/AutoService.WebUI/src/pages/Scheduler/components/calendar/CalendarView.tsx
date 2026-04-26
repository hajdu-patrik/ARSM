/**
 * Monthly calendar view with appointment badge indicators.
 * Supports mobile-optimized single-badge layout and desktop multi-badge
 * layout, month navigation with a +/-6 month limit, day selection,
 * and locale-aware day/month headers.
 * @module CalendarView
 */
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AppointmentDto, CalendarDay } from '../../../../types/scheduler/scheduler.types';

/** Props for the {@link CalendarView} component. */
interface CalendarViewProps {
  /** All appointments for the displayed month. */
  readonly appointments: AppointmentDto[];
  /** Calendar year to display. */
  readonly year: number;
  /** Calendar month to display (1-based). */
  readonly month: number;
  /** Whether month appointment data is currently loading. */
  readonly isLoading: boolean;
  /** Callback fired when the user navigates to a different month. */
  readonly onMonthChange: (year: number, month: number) => void;
  /** Optional callback fired when a current-month day cell is clicked. */
  readonly onDayClick?: (day: number) => void;
  /** Currently selected day number, if any. */
  readonly selectedDay?: number | null;
}

/** Status-to-dot-color mapping for calendar appointment indicators. */
const STATUS_DOT_COLORS: Record<string, string> = {
  InProgress: 'bg-yellow-500',
  Completed: 'bg-green-500',
  Cancelled: 'bg-red-500',
};

/**
 * Builds a 6-week (42-day) calendar grid for the given month,
 * starting from Monday, with appointments mapped to their scheduled dates.
 */
function buildCalendarDays(year: number, month: number, appointments: AppointmentDto[]): CalendarDay[] {
  const firstDay = new Date(year, month - 1, 1);
  const dayOfWeek = firstDay.getDay();
  const mondayOffset = (dayOfWeek + 6) % 7;

  const startDate = new Date(year, month - 1, 1 - mondayOffset);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const appointmentsByDate = new Map<string, AppointmentDto[]>();
  for (const appt of appointments) {
    const dateKey = new Date(appt.scheduledDate).toISOString().slice(0, 10);
    const existing = appointmentsByDate.get(dateKey);
    if (existing) {
      existing.push(appt);
    } else {
      appointmentsByDate.set(dateKey, [appt]);
    }
  }

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    days.push({
      date,
      appointments: appointmentsByDate.get(dateStr) ?? [],
      isToday: dateStr === todayStr,
      isCurrentMonth: date.getMonth() === month - 1,
    });
  }

  return days;
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
    new Date(year, month - 1)
  );

  const dayHeaders = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' });
    // Generate Mon-Sun
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2024, 0, i + 1); // 2024-01-01 is a Monday
      return formatter.format(d);
    });
  }, [i18n.language]);

  const calendarDays = useMemo(
    () => buildCalendarDays(year, month, appointments),
    [year, month, appointments]
  );

  const calendarWeeks = useMemo(() => {
    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }
    return weeks;
  }, [calendarDays]);

  // Navigation clamping: ±6 months from today
  const now = new Date();
  const minDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const maxDate = new Date(now.getFullYear(), now.getMonth() + 6, 1);
  const currentDate = new Date(year, month - 1, 1);
  const canGoPrev = currentDate > minDate;
  const canGoNext = currentDate < maxDate;

  const handlePrev = () => {
    if (!canGoPrev) return;
    if (month === 1) {
      onMonthChange(year - 1, 12);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  const handleNext = () => {
    if (!canGoNext) return;
    if (month === 12) {
      onMonthChange(year + 1, 1);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  return (
    <section className="bg-arsm-input dark:bg-arsm-card-dark rounded-2xl border border-arsm-border dark:border-arsm-border-dark shadow-sm p-4 select-none">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrev}
          disabled={!canGoPrev}
          title={t('scheduler.calendar.prevMonth')}
          className={`p-1.5 rounded-lg text-arsm-label dark:text-arsm-label-dark transition-colors ${canGoPrev ? 'hover:bg-arsm-accent-subtle dark:hover:bg-arsm-hover-dark' : 'opacity-50 cursor-not-allowed'}`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold text-arsm-primary dark:text-arsm-primary-dark capitalize">
          {monthLabel}
        </h3>
        <button
          onClick={handleNext}
          disabled={!canGoNext}
          title={t('scheduler.calendar.nextMonth')}
          className={`p-1.5 rounded-lg text-arsm-label dark:text-arsm-label-dark transition-colors ${canGoNext ? 'hover:bg-arsm-accent-subtle dark:hover:bg-arsm-hover-dark' : 'opacity-50 cursor-not-allowed'}`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-arsm-muted dark:text-arsm-muted-dark text-sm">
          {t('scheduler.calendar.loading')}
        </div>
      ) : (
        <>
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {dayHeaders.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-arsm-muted dark:text-arsm-muted-dark py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="space-y-px">
            {calendarWeeks.map((week) => {
              const hasAppointmentsInWeek = week.some((day) => day.appointments.length > 0);
              const weekKey = `week-${week[0]?.date.toISOString() ?? 'unknown'}`;

              return (
                <div key={weekKey} className="grid grid-cols-7 gap-px">
                  {week.map((day) => {
                    const dayNum = day.date.getDate();
                    const isSelected = day.isCurrentMonth && selectedDay === dayNum;
                    const dayContent = (
                      <>
                        <div className="flex h-7 items-center justify-center mb-0.5">
                          {day.isToday ? (
                            <span className="bg-arsm-accent text-arsm-primary dark:bg-arsm-accent-dark dark:text-arsm-hover rounded-full w-7 h-7 flex items-center justify-center text-sm font-medium">
                              {day.date.getDate()}
                            </span>
                          ) : (
                            <span className="text-sm font-medium">{day.date.getDate()}</span>
                          )}
                        </div>

                        {/* Mobile indicators: overflow rendered beside the dot */}
                        <div className="md:hidden mt-0.5 flex h-4 items-center justify-center gap-0.5 leading-none">
                          {day.appointments.length > 0 ? (
                            day.appointments.slice(0, 1).map((appt) => (
                              <span
                                key={appt.id}
                                className={`h-3.5 min-w-3.5 rounded-full px-1 text-white text-[8px] leading-none flex items-center justify-center font-bold ${STATUS_DOT_COLORS[appt.status] ?? 'bg-slate-400'}`}
                                title={`${appt.vehicle.brand} - ${appt.taskDescription}`}
                              >
                                {appt.vehicle.brand[0]}
                              </span>
                            ))
                          ) : (
                            <span className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {day.appointments.length > 1 && (
                            <span className="text-[8px] leading-none text-arsm-muted dark:text-arsm-muted-dark font-semibold">
                              +{day.appointments.length - 1}
                            </span>
                          )}
                        </div>

                        {/* Desktop indicators */}
                        <div className="hidden md:flex flex-wrap gap-0.5 justify-center">
                          {day.appointments.slice(0, 3).map((appt) => (
                            <span
                              key={`desktop-${appt.id}`}
                              className={`w-5 h-5 rounded-full text-white text-[9px] flex items-center justify-center font-bold ${STATUS_DOT_COLORS[appt.status] ?? 'bg-slate-400'}`}
                              title={`${appt.vehicle.brand} - ${appt.taskDescription}`}
                            >
                              {appt.vehicle.brand[0]}
                            </span>
                          ))}
                          {day.appointments.length > 3 && (
                            <span className="text-[9px] text-arsm-muted dark:text-arsm-muted-dark font-medium">
                              +{day.appointments.length - 3}
                            </span>
                          )}
                        </div>
                      </>
                    );

                    const rowHeightClass = hasAppointmentsInWeek
                      ? 'min-h-[4.5rem] md:min-h-[2.5rem]'
                      : 'min-h-[2.5rem]';

                    const dayTestId = `calendar-day-${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

                    const dayClassName = `${rowHeightClass} p-1 rounded-lg flex flex-col items-center justify-start ${
                      day.isCurrentMonth
                        ? 'text-arsm-primary dark:text-arsm-primary-dark hover:bg-arsm-accent-subtle dark:hover:bg-arsm-hover-dark'
                        : 'text-arsm-muted-dark dark:text-arsm-label'
                    } ${day.isToday ? 'bg-arsm-toggle-bg dark:bg-arsm-toggle-bg-dark' : ''} ${isSelected ? 'ring-2 ring-arsm-accent dark:ring-arsm-accent-dark' : ''}`;

                    if (day.isCurrentMonth && onDayClick) {
                      return (
                        <button
                          type="button"
                          key={day.date.toISOString()}
                          data-testid={dayTestId}
                          aria-label={dayTestId}
                          onClick={() => onDayClick(dayNum)}
                          className={`${dayClassName} cursor-pointer text-left`}
                        >
                          {dayContent}
                        </button>
                      );
                    }

                    return (
                      <div key={day.date.toISOString()} className={dayClassName}>
                        {dayContent}
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

/** Memoized monthly calendar view with appointment indicators and day selection. */
export const CalendarView = CalendarViewComponent;
