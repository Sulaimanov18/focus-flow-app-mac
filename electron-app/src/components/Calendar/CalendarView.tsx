import { useState, useMemo } from 'react';
import { useAppStore, getMonthSummaries } from '../../stores/useAppStore';
import { DaySummary } from '../../types';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type CalendarFilter = 'all' | 'focus' | 'tasks' | 'notes';
type RangeMode = 'today' | 'week' | 'month';

interface RangeInsights {
  totalPomodoros: number;
  totalFocusMinutes: number;
  totalTasksCompleted: number;
  daysWithNotes: number;
  activeDays: number;
  bestDay: { date: string; score: number } | null;
  avgPomodorosPerActiveDay: number;
}

interface WeekRange {
  start: string; // ISO date YYYY-MM-DD
  end: string;   // ISO date YYYY-MM-DD
}

// ─────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'notes:';

/** Check if a date has a note in localStorage */
function hasNoteForDate(date: string): boolean {
  try {
    const value = localStorage.getItem(STORAGE_PREFIX + date);
    return Boolean(value && value.trim().length > 0);
  } catch {
    return false;
  }
}

/** Get note content for a date */
function getNoteContent(date: string): string {
  try {
    return localStorage.getItem(STORAGE_PREFIX + date) || '';
  } catch {
    return '';
  }
}

/** Get today's date as YYYY-MM-DD */
function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Format date for display (e.g., "Friday, Nov 28") */
function formatDateLong(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/** Get month name and year (e.g., "November 2025") */
function getMonthYearLabel(year: number, month: number): string {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Get week range (Sunday-Saturday) for a given date */
function getWeekRangeForDate(dateStr: string): WeekRange {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay(); // 0 = Sunday

  // Start of week (Sunday)
  const startDate = new Date(date);
  startDate.setDate(date.getDate() - dayOfWeek);

  // End of week (Saturday)
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return {
    start: formatDate(startDate),
    end: formatDate(endDate),
  };
}

/** Check if a date is within a range (inclusive) */
function isDateInRange(dateStr: string, range: WeekRange): boolean {
  return dateStr >= range.start && dateStr <= range.end;
}

/** Calculate insights for a date range */
function calculateRangeInsights(
  summaries: DaySummary[],
  startDate: string,
  endDate: string
): RangeInsights {
  const filtered = summaries.filter((s) => s.date >= startDate && s.date <= endDate);

  let totalPomodoros = 0;
  let totalTasksCompleted = 0;
  let daysWithNotes = 0;
  let activeDays = 0;
  let bestDay: { date: string; score: number } | null = null;

  filtered.forEach((s) => {
    totalPomodoros += s.pomodoros;
    totalTasksCompleted += s.completedTasks.length;
    if (s.hasNote) daysWithNotes++;

    const isActive = s.pomodoros > 0 || s.completedTasks.length > 0 || s.hasNote;
    if (isActive) activeDays++;

    const score = s.pomodoros + s.completedTasks.length * 2 + (s.hasNote ? 1 : 0);
    if (!bestDay || score > bestDay.score) {
      bestDay = { date: s.date, score };
    }
  });

  return {
    totalPomodoros,
    totalFocusMinutes: totalPomodoros * 25,
    totalTasksCompleted,
    daysWithNotes,
    activeDays,
    bestDay: bestDay && bestDay.score > 0 ? bestDay : null,
    avgPomodorosPerActiveDay: activeDays > 0 ? Math.round((totalPomodoros / activeDays) * 10) / 10 : 0,
  };
}

/** Format week range for display (e.g., "Nov 24 - Nov 30") */
function formatWeekRange(range: WeekRange): string {
  const [startYear, startMonth, startDay] = range.start.split('-').map(Number);
  const [endYear, endMonth, endDay] = range.end.split('-').map(Number);

  const startDate = new Date(startYear, startMonth - 1, startDay);
  const endDate = new Date(endYear, endMonth - 1, endDay);

  const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return `${startStr} - ${endStr}`;
}

/** Calculate activity score based on filter */
function getFilteredScore(summary: DaySummary | undefined, filter: CalendarFilter): number {
  if (!summary) return 0;

  switch (filter) {
    case 'focus':
      return summary.pomodoros;
    case 'tasks':
      return summary.completedTasks.length;
    case 'notes':
      return summary.hasNote ? 1 : 0;
    case 'all':
    default:
      return summary.pomodoros + summary.completedTasks.length * 2 + (summary.hasNote ? 1 : 0);
  }
}

/** Calculate intensity tier (0-4) based on score and filter */
function getIntensityTier(score: number, filter: CalendarFilter): number {
  if (score === 0) return 0;

  // Different thresholds based on filter type
  if (filter === 'notes') {
    return score > 0 ? 3 : 0; // Binary: has note or not
  }

  if (filter === 'focus') {
    if (score >= 6) return 4;
    if (score >= 4) return 3;
    if (score >= 2) return 2;
    return 1;
  }

  if (filter === 'tasks') {
    if (score >= 5) return 4;
    if (score >= 3) return 3;
    if (score >= 2) return 2;
    return 1;
  }

  // 'all' filter
  if (score >= 10) return 4;
  if (score >= 6) return 3;
  if (score >= 3) return 2;
  return 1;
}

/** Get all calendar cells for a month grid (includes padding from prev/next months) */
type CalendarCell = {
  date: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
  summary?: DaySummary;
};

function getCalendarCells(
  year: number,
  month: number,
  summariesByDate: Map<string, DaySummary>
): CalendarCell[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = lastDay.getDate();

  const cells: CalendarCell[] = [];

  // Add days from previous month
  const prevMonth = new Date(year, month, 0);
  const prevMonthDays = prevMonth.getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevYear = month === 0 ? year - 1 : year;
    const prevMo = month === 0 ? 11 : month - 1;
    const dateStr = `${prevYear}-${String(prevMo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({
      date: dateStr,
      dayOfMonth: d,
      inCurrentMonth: false,
    });
  }

  // Add days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({
      date: dateStr,
      dayOfMonth: d,
      inCurrentMonth: true,
      summary: summariesByDate.get(dateStr),
    });
  }

  // Add days from next month to fill the grid (up to 6 rows × 7 days = 42)
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextYear = month === 11 ? year + 1 : year;
    const nextMo = month === 11 ? 0 : month + 1;
    const dateStr = `${nextYear}-${String(nextMo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({
      date: dateStr,
      dayOfMonth: d,
      inCurrentMonth: false,
    });
  }

  return cells;
}

// ─────────────────────────────────────────────────────────────
// Day Cell Component
// ─────────────────────────────────────────────────────────────

interface DayCellProps {
  cell: CalendarCell;
  isSelected: boolean;
  isToday: boolean;
  isInWeekRange: boolean;
  filter: CalendarFilter;
  onClick: () => void;
}

function DayCell({ cell, isSelected, isToday, isInWeekRange, filter, onClick }: DayCellProps) {
  const { dayOfMonth, inCurrentMonth, summary } = cell;
  const [showTooltip, setShowTooltip] = useState(false);

  // Calculate filtered intensity
  const score = getFilteredScore(summary, filter);
  const intensity = getIntensityTier(score, filter);

  const hasCompletedTasks = summary && summary.completedTasks.length > 0;
  const hasNote = summary?.hasNote;
  const hasPomodoros = summary && summary.pomodoros > 0;

  // Emerald color tiers for heatmap effect
  const intensityBg: Record<number, string> = {
    0: 'bg-white/[0.02]',
    1: 'bg-emerald-500/15',
    2: 'bg-emerald-500/30',
    3: 'bg-emerald-500/45',
    4: 'bg-emerald-500/60',
  };

  // Build tooltip content
  const tooltipContent = summary ? (
    <>
      {summary.pomodoros > 0 && <div>{summary.pomodoros} pomodoro{summary.pomodoros !== 1 ? 's' : ''}</div>}
      {summary.completedTasks.length > 0 && <div>{summary.completedTasks.length} task{summary.completedTasks.length !== 1 ? 's' : ''}</div>}
      {summary.hasNote && <div>Has note</div>}
      {!summary.pomodoros && !summary.completedTasks.length && !summary.hasNote && <div>No activity</div>}
    </>
  ) : (
    <div>No activity</div>
  );

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          relative w-full aspect-square rounded-lg p-1.5 transition-all duration-150 min-h-[36px]
          ${!inCurrentMonth ? 'opacity-30' : ''}
          ${intensityBg[intensity] || intensityBg[0]}
          ${isSelected ? 'ring-2 ring-accent ring-offset-1 ring-offset-neutral-900' : ''}
          ${isInWeekRange && !isSelected ? 'ring-1 ring-emerald-500/40 bg-emerald-500/5' : ''}
          ${!isSelected && !isInWeekRange ? 'hover:bg-white/[0.08]' : ''}
          ${isToday && !isSelected ? 'ring-1 ring-white/30' : ''}
        `}
      >
        {/* Day number */}
        <span className={`
          text-xs font-medium block
          ${isSelected ? 'text-white' : inCurrentMonth ? 'text-white/70' : 'text-white/30'}
        `}>
          {dayOfMonth}
        </span>

        {/* Activity indicators */}
        {inCurrentMonth && (hasPomodoros || hasCompletedTasks || hasNote) && (
          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-center gap-0.5">
            {hasPomodoros && (
              <div className="w-1.5 h-1.5 rounded-full bg-rose-400/80" title="Focus session" />
            )}
            {hasCompletedTasks && (
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" title="Tasks completed" />
            )}
            {hasNote && (
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400/80" title="Has note" />
            )}
          </div>
        )}
      </button>

      {/* Hover Tooltip */}
      {showTooltip && inCurrentMonth && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-zinc-800 rounded-md text-[10px] text-white/80 whitespace-nowrap shadow-lg pointer-events-none">
          {tooltipContent}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800" />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Filter Control Component
// ─────────────────────────────────────────────────────────────

interface FilterControlProps {
  filter: CalendarFilter;
  onChange: (filter: CalendarFilter) => void;
}

const FILTER_OPTIONS: { id: CalendarFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'focus', label: 'Focus' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'notes', label: 'Notes' },
];

function FilterControl({ filter, onChange }: FilterControlProps) {
  return (
    <div className="flex gap-1 p-0.5 bg-white/[0.04] rounded-lg">
      {FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`
            px-2.5 py-1 text-[10px] font-medium rounded-md transition-all duration-150
            ${filter === opt.id
              ? 'bg-accent text-white shadow-sm filter-btn-active'
              : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]'}
          `}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Insights Panel Component
// ─────────────────────────────────────────────────────────────

interface InsightsPanelProps {
  insights: RangeInsights;
  rangeMode: RangeMode;
  rangeLabel: string;
}

function InsightsPanel({ insights, rangeMode, rangeLabel }: InsightsPanelProps) {
  const { totalPomodoros, totalFocusMinutes, totalTasksCompleted, daysWithNotes, activeDays, bestDay, avgPomodorosPerActiveDay } = insights;

  const formatBestDay = (date: string) => {
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    if (rangeMode === 'week') {
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return `Day ${day}`;
  };

  const insightTitle = rangeMode === 'week' ? 'This Week' : rangeMode === 'today' ? 'Today' : rangeLabel;

  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
          {insightTitle} Insights
        </h3>
        {rangeMode === 'week' && (
          <span className="text-[10px] text-white/40">{rangeLabel}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Total Focus */}
        <div className="bg-white/[0.03] rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span className="text-[10px] text-white/40 uppercase tracking-wide">Focus</span>
          </div>
          <div className="text-xl font-bold text-white/90">{totalPomodoros}</div>
          <div className="text-[10px] text-white/40">{Math.round(totalFocusMinutes / 60 * 10) / 10}h total</div>
        </div>

        {/* Tasks Completed */}
        <div className="bg-white/[0.03] rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-white/40 uppercase tracking-wide">Tasks</span>
          </div>
          <div className="text-xl font-bold text-white/90">{totalTasksCompleted}</div>
          <div className="text-[10px] text-white/40">completed</div>
        </div>

        {/* Notes */}
        <div className="bg-white/[0.03] rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-[10px] text-white/40 uppercase tracking-wide">Notes</span>
          </div>
          <div className="text-xl font-bold text-white/90">{daysWithNotes}</div>
          <div className="text-[10px] text-white/40">{rangeMode === 'week' ? 'days' : 'days with notes'}</div>
        </div>

        {/* Active Days */}
        <div className="bg-white/[0.03] rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[10px] text-white/40 uppercase tracking-wide">Active</span>
          </div>
          <div className="text-xl font-bold text-white/90">{activeDays}</div>
          <div className="text-[10px] text-white/40">{rangeMode === 'week' ? 'of 7 days' : 'active days'}</div>
        </div>
      </div>

      {/* Best Day & Avg */}
      {(bestDay || avgPomodorosPerActiveDay > 0) && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px]">
          {bestDay && (
            <div className="text-white/50">
              Best day: <span className="text-white/80 font-medium">{formatBestDay(bestDay.date)}</span>
            </div>
          )}
          {avgPomodorosPerActiveDay > 0 && (
            <div className="text-white/50">
              Avg: <span className="text-white/80 font-medium">{avgPomodorosPerActiveDay}</span> pomo/day
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Details Panel Component
// ─────────────────────────────────────────────────────────────

interface DetailsPanelProps {
  date: string;
  summary: DaySummary | undefined;
  onOpenNotes: (date: string) => void;
}

function DetailsPanel({ date, summary, onOpenNotes }: DetailsPanelProps) {
  const noteContent = getNoteContent(date);
  const noteSnippet = noteContent.slice(0, 150) + (noteContent.length > 150 ? '...' : '');

  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] px-4 py-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white/90">{formatDateLong(date)}</h3>
        <p className="text-xs text-white/40 mt-1">
          {summary?.pomodoros ?? 0} pomodoros · ~{summary?.focusMinutes ?? 0} min · {summary?.completedTasks.length ?? 0} tasks · {summary?.hasNote ? 'Note' : 'No note'}
        </p>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.06] mb-4" />

      {/* Completed Tasks */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
          Completed Tasks
        </h4>
        {summary && summary.completedTasks.length > 0 ? (
          <ul className="space-y-1.5">
            {summary.completedTasks.map((task) => (
              <li key={task.id} className="flex items-start gap-2 text-xs text-white/70">
                <svg className="w-3 h-3 text-green-400/70 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span className="leading-relaxed">{task.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-white/30 italic">No tasks completed this day.</p>
        )}
      </div>

      {/* Daily Note */}
      <div>
        <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
          Daily Note
        </h4>
        {summary?.hasNote ? (
          <div className="space-y-2">
            <p className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap">
              {noteSnippet}
            </p>
            <button
              onClick={() => onOpenNotes(date)}
              className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in Notes
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-white/30 italic">No note for this day.</p>
            <button
              onClick={() => onOpenNotes(date)}
              className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Write a note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main CalendarView Component
// ─────────────────────────────────────────────────────────────

export function CalendarView() {
  const { statsByDate, tasks, setSelectedTab } = useAppStore();

  const today = getTodayDate();
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [filter, setFilter] = useState<CalendarFilter>('all');
  const [rangeMode, setRangeMode] = useState<RangeMode>('month');
  const [showInsights, setShowInsights] = useState(true);

  // Generate month summaries
  const summaries = useMemo(
    () => getMonthSummaries(viewYear, viewMonth, statsByDate, tasks, hasNoteForDate),
    [viewYear, viewMonth, statsByDate, tasks]
  );

  // Calculate week range for current selected date
  const weekRange = useMemo(() => getWeekRangeForDate(selectedDate), [selectedDate]);

  // Calculate insights based on range mode
  const insights = useMemo(() => {
    if (rangeMode === 'week') {
      // For week mode, we need summaries from potentially multiple months
      // Get all summaries that overlap with the week range
      const allSummaries: DaySummary[] = [];

      // Get summaries for current view month
      allSummaries.push(...summaries);

      // Check if week spans into previous month
      const [startYear, startMonth] = weekRange.start.split('-').map(Number);
      if (startMonth - 1 !== viewMonth || startYear !== viewYear) {
        const prevSummaries = getMonthSummaries(startYear, startMonth - 1, statsByDate, tasks, hasNoteForDate);
        allSummaries.push(...prevSummaries);
      }

      // Check if week spans into next month
      const [endYear, endMonth] = weekRange.end.split('-').map(Number);
      if (endMonth - 1 !== viewMonth || endYear !== viewYear) {
        const nextSummaries = getMonthSummaries(endYear, endMonth - 1, statsByDate, tasks, hasNoteForDate);
        allSummaries.push(...nextSummaries);
      }

      return calculateRangeInsights(allSummaries, weekRange.start, weekRange.end);
    }
    // For month and today modes, use month-level insights
    const firstDayOfMonth = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
    const lastDayOfMonth = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${new Date(viewYear, viewMonth + 1, 0).getDate()}`;
    return calculateRangeInsights(summaries, firstDayOfMonth, lastDayOfMonth);
  }, [rangeMode, summaries, weekRange, viewYear, viewMonth, statsByDate, tasks]);

  // Create a map for quick lookup
  const summariesByDate = useMemo(() => {
    const map = new Map<string, DaySummary>();
    summaries.forEach((s) => map.set(s.date, s));
    return map;
  }, [summaries]);

  // Get calendar cells
  const cells = useMemo(
    () => getCalendarCells(viewYear, viewMonth, summariesByDate),
    [viewYear, viewMonth, summariesByDate]
  );

  const selectedSummary = summariesByDate.get(selectedDate);
  const monthLabel = getMonthYearLabel(viewYear, viewMonth).split(' ')[0]; // Just "November"

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleTodayClick = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(today);
    setRangeMode('today');
  };

  const handleWeekClick = () => {
    // If not in current month, jump to today first
    const now = new Date();
    if (viewYear !== now.getFullYear() || viewMonth !== now.getMonth()) {
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
      setSelectedDate(today);
    }
    setRangeMode('week');
  };

  const handleMonthClick = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setRangeMode('month');
  };

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    // In week mode, clicking a day updates the week range around that day
    // In other modes, just select the day
  };

  const handleOpenNotes = (date: string) => {
    // Store the target date in sessionStorage so Notes can pick it up
    sessionStorage.setItem('notes-target-date', date);
    setSelectedTab('notes');
  };

  // Determine range label for insights
  const rangeLabel = rangeMode === 'week' ? formatWeekRange(weekRange) : monthLabel;

  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 py-2 pb-8 md:pb-12">
        <div className="w-full max-w-lg mx-auto space-y-3">
          {/* Quick Navigation - Range Mode Buttons */}
          <div className="flex items-center justify-between gap-2 frosted-glass-light rounded-xl px-3 py-2 border border-white/[0.06]">
            {/* Left group: Today / Week / Month */}
            <div className="flex gap-1 p-0.5 bg-white/[0.04] rounded-lg">
              <button
                onClick={handleTodayClick}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all duration-150 ${
                  rangeMode === 'today'
                    ? 'bg-accent text-white shadow-sm filter-btn-active'
                    : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]'
                }`}
              >
                Today
              </button>
              <button
                onClick={handleWeekClick}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all duration-150 ${
                  rangeMode === 'week'
                    ? 'bg-accent text-white shadow-sm filter-btn-active'
                    : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]'
                }`}
              >
                Week
              </button>
              <button
                onClick={handleMonthClick}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all duration-150 ${
                  rangeMode === 'month'
                    ? 'bg-accent text-white shadow-sm filter-btn-active'
                    : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]'
                }`}
              >
                Month
              </button>
            </div>
            {/* Right group: Filter controls */}
            <FilterControl filter={filter} onChange={setFilter} />
          </div>

          {/* Month Navigation Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={goToPrevMonth}
              className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <h2 className="text-base font-semibold text-white/90">
              {getMonthYearLabel(viewYear, viewMonth)}
            </h2>

            <button
              onClick={goToNextMonth}
              className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1.5 mb-2">
              {weekdays.map((day, idx) => (
                <div
                  key={idx}
                  className="text-center text-[11px] font-medium text-white/40 py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((cell) => (
                <DayCell
                  key={cell.date}
                  cell={cell}
                  isSelected={cell.date === selectedDate}
                  isToday={cell.date === today}
                  isInWeekRange={rangeMode === 'week' && isDateInRange(cell.date, weekRange)}
                  filter={filter}
                  onClick={() => handleDayClick(cell.date)}
                />
              ))}
            </div>

            {/* Intensity Legend */}
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-center gap-1.5">
              <span className="text-[10px] text-white/40 mr-1">Less</span>
              <div className="w-3.5 h-3.5 rounded bg-white/[0.02]" />
              <div className="w-3.5 h-3.5 rounded bg-emerald-500/15" />
              <div className="w-3.5 h-3.5 rounded bg-emerald-500/30" />
              <div className="w-3.5 h-3.5 rounded bg-emerald-500/45" />
              <div className="w-3.5 h-3.5 rounded bg-emerald-500/60" />
              <span className="text-[10px] text-white/40 ml-1">More</span>
            </div>
          </div>

          {/* Insights Toggle & Panel */}
          <div>
            <button
              onClick={() => setShowInsights(!showInsights)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              <span className="text-xs font-medium text-white/60">Insights</span>
              <svg
                className={`w-4 h-4 text-white/40 transition-transform ${showInsights ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showInsights && (
              <InsightsPanel
                insights={insights}
                rangeMode={rangeMode}
                rangeLabel={rangeLabel}
              />
            )}
          </div>

          {/* Details Panel */}
          <DetailsPanel
            date={selectedDate}
            summary={selectedSummary}
            onOpenNotes={handleOpenNotes}
          />
        </div>
      </div>
    </div>
  );
}
