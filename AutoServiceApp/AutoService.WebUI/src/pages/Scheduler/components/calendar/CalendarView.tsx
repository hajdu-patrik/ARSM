import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AppointmentDto, CalendarDay } from '../../../../types/scheduler/scheduler.types';

interface CalendarViewProps {
  readonly appointments: AppointmentDto[];
  readonly year: number;
  readonly month: number;
  readonly isLoading: boolean;
  readonly onMonthChange: (year: number, month: number) => void;
  readonly onDayClick?: (day: number) => void;
  readonly selectedDay?: number | null;
}

const STATUS_DOT_COLORS: Record<string, string> = {
  InProgress: 'bg-yellow-500',
  Completed: 'bg-green-500',
  Cancelled: 'bg-red-500',
};

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
    <section className="bg-[#F6F4FB] dark:bg-[#13131B] rounded-2xl border border-[#D8D2E9] dark:border-[#3A3154] shadow-sm p-4">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrev}
          disabled={!canGoPrev}
          title={t('scheduler.calendar.prevMonth')}
          className={`p-1.5 rounded-lg text-[#5E5672] dark:text-[#CFC5EA] transition-colors ${canGoPrev ? 'hover:bg-[#E6DCF8] dark:hover:bg-[#322B47]' : 'opacity-50 cursor-not-allowed'}`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold text-[#2C2440] dark:text-[#EDE8FA] capitalize">
          {monthLabel}
        </h3>
        <button
          onClick={handleNext}
          disabled={!canGoNext}
          title={t('scheduler.calendar.nextMonth')}
          className={`p-1.5 rounded-lg text-[#5E5672] dark:text-[#CFC5EA] transition-colors ${canGoNext ? 'hover:bg-[#E6DCF8] dark:hover:bg-[#322B47]' : 'opacity-50 cursor-not-allowed'}`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-[#6A627F] dark:text-[#B9B0D3] text-sm">
          {t('scheduler.calendar.loading')}
        </div>
      ) : (
        <>
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {dayHeaders.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-[#6A627F] dark:text-[#B9B0D3] py-1">
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
                            <span className="bg-[#C9B3FF] text-[#2C2440] dark:bg-[#7A66C7] dark:text-[#F5F2FF] rounded-full w-7 h-7 flex items-center justify-center text-sm font-medium">
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
                            <span className="text-[8px] leading-none text-[#6A627F] dark:text-[#B9B0D3] font-semibold">
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
                            <span className="text-[9px] text-[#6A627F] dark:text-[#B9B0D3] font-medium">
                              +{day.appointments.length - 3}
                            </span>
                          )}
                        </div>
                      </>
                    );

                    const rowHeightClass = hasAppointmentsInWeek
                      ? 'min-h-[4.5rem] md:min-h-[2.5rem]'
                      : 'min-h-[2.5rem]';

                    const dayClassName = `${rowHeightClass} p-1 rounded-lg flex flex-col items-center justify-start ${
                      day.isCurrentMonth
                        ? 'text-[#2C2440] dark:text-[#EDE8FA] hover:bg-[#E6DCF8] dark:hover:bg-[#322B47]'
                        : 'text-[#B9B0D3] dark:text-[#5E5672]'
                    } ${day.isToday ? 'bg-[#EFEBFA] dark:bg-[#241F33]' : ''} ${isSelected ? 'ring-2 ring-[#C9B3FF] dark:ring-[#7A66C7]' : ''}`;

                    if (day.isCurrentMonth && onDayClick) {
                      return (
                        <button
                          type="button"
                          key={day.date.toISOString()}
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

export const CalendarView = CalendarViewComponent;
