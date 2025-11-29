import { useAppStore, calculateStreak, getTodaySummary, getWeekSummary } from '../../stores/useAppStore';

// Get the last 7 days starting from today going backwards
function getLast7Days(): { date: string; dayLabel: string }[] {
  const days: { date: string; dayLabel: string }[] = [];
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push({
      date: date.toISOString().split('T')[0],
      dayLabel: dayLabels[date.getDay()],
    });
  }

  return days;
}

// Check if a day has activity
function isDayActive(statsByDate: Record<string, { pomodoros: number; completedTasks: number; hasNote: boolean }>, date: string): boolean {
  const activity = statsByDate[date];
  if (!activity) return false;
  return activity.pomodoros > 0 || activity.completedTasks > 0 || activity.hasNote;
}

export function FocusStats() {
  const { statsByDate } = useAppStore();

  const streak = calculateStreak(statsByDate);
  const todaySummary = getTodaySummary(statsByDate);
  const weekSummary = getWeekSummary(statsByDate);
  const last7Days = getLast7Days();
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="w-full max-w-xs rounded-2xl bg-white/[0.04] border border-white/[0.08] px-4 py-3.5 flex flex-col gap-3">
      {/* Header row: Streak + Label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🔥</span>
          <span className="text-sm text-white/90 font-medium">
            {streak > 0 ? `${streak}-day streak` : 'No streak yet'}
          </span>
        </div>
        <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">
          Focus Stats
        </span>
      </div>

      {/* Week day indicators */}
      <div className="flex items-center justify-between px-1">
        {last7Days.map(({ date, dayLabel }) => {
          const isActive = isDayActive(statsByDate, date);
          const isToday = date === today;

          return (
            <div key={date} className="flex flex-col items-center gap-1">
              {/* Day indicator circle */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-green-500/80'
                    : isToday
                    ? 'bg-white/[0.08] border border-white/20'
                    : 'bg-white/[0.04] border border-white/[0.08]'
                }`}
              >
                {isActive && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </div>
              {/* Day label */}
              <span className={`text-[9px] font-medium ${
                isToday ? 'text-white/70' : 'text-white/30'
              }`}>
                {dayLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.06]" />

      {/* Today summary */}
      <div className="flex items-center gap-1.5 text-xs text-white/60">
        <span className="text-white/40">Today:</span>
        <span>{todaySummary.pomodoros} pomodoros</span>
        <span className="text-white/20">·</span>
        <span>~{todaySummary.minutes} min</span>
        <span className="text-white/20">·</span>
        <span>{todaySummary.completedTasks} tasks</span>
      </div>

      {/* Week summary */}
      <div className="flex items-center gap-1.5 text-xs text-white/40">
        <span className="text-white/30">Week:</span>
        <span>{weekSummary.pomodoros} pomodoros</span>
        <span className="text-white/15">·</span>
        <span>~{weekSummary.minutes} min</span>
        <span className="text-white/15">·</span>
        <span>{weekSummary.activeDays} active days</span>
      </div>
    </div>
  );
}
