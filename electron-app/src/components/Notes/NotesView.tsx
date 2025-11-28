import { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────
// Helper functions for date handling
// ─────────────────────────────────────────────────────────────

/** Returns today's date as "YYYY-MM-DD" in local time */
function getTodayDateString(): string {
  return formatDateKey(new Date());
}

/** Formats a Date object to "YYYY-MM-DD" */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses "YYYY-MM-DD" to Date object */
function parseDateKey(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Formats a date string for display (e.g., "Nov 28, 2025") */
function formatDateDisplay(dateString: string): string {
  const date = parseDateKey(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Gets the weekday name (e.g., "Monday") */
function getWeekdayName(dateString: string): string {
  const date = parseDateKey(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/** Returns "Today", "Yesterday", or the weekday */
function getDateLabel(dateString: string): string {
  const today = getTodayDateString();
  const yesterday = formatDateKey(
    new Date(new Date().setDate(new Date().getDate() - 1))
  );

  if (dateString === today) return 'Today';
  if (dateString === yesterday) return 'Yesterday';
  return getWeekdayName(dateString);
}

/** Adds days to a date string and returns new date string */
function addDays(dateString: string, days: number): string {
  const date = parseDateKey(dateString);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

/** Gets month name and year (e.g., "November 2025") */
function getMonthYearLabel(year: number, month: number): string {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Gets all days in a month as a grid (includes padding from prev/next months) */
function getCalendarDays(year: number, month: number): { date: string; isCurrentMonth: boolean }[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = lastDay.getDate();

  const days: { date: string; isCurrentMonth: boolean }[] = [];

  // Add days from previous month
  const prevMonth = new Date(year, month, 0);
  const prevMonthDays = prevMonth.getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthDays - i);
    days.push({ date: formatDateKey(d), isCurrentMonth: false });
  }

  // Add days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: formatDateKey(new Date(year, month, d)), isCurrentMonth: true });
  }

  // Add days from next month to fill the grid (6 rows × 7 days = 42)
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({ date: formatDateKey(new Date(year, month + 1, d)), isCurrentMonth: false });
  }

  return days;
}

// ─────────────────────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'notes:';

function loadNoteFromStorage(dateKey: string): string {
  try {
    return localStorage.getItem(STORAGE_PREFIX + dateKey) || '';
  } catch {
    return '';
  }
}

function saveNoteToStorage(dateKey: string, content: string): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + dateKey, content);
  } catch {
    // localStorage not available - fail gracefully
  }
}

/** Gets all dates that have saved notes */
function getDatesWithNotes(): Set<string> {
  const dates = new Set<string>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value && value.trim().length > 0) {
          dates.add(key.replace(STORAGE_PREFIX, ''));
        }
      }
    }
  } catch {
    // localStorage not available
  }
  return dates;
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved';

// ─────────────────────────────────────────────────────────────
// Calendar Popover Component
// ─────────────────────────────────────────────────────────────

interface CalendarPopoverProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

function CalendarPopover({ selectedDate, onSelectDate, onClose }: CalendarPopoverProps) {
  const selected = parseDateKey(selectedDate);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const [datesWithNotes, setDatesWithNotes] = useState<Set<string>>(new Set());

  const today = getTodayDateString();
  const days = getCalendarDays(viewYear, viewMonth);
  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Load dates with notes on mount
  useEffect(() => {
    setDatesWithNotes(getDatesWithNotes());
  }, []);

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

  const handleDayClick = (date: string) => {
    if (date <= today) {
      onSelectDate(date);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Calendar panel */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-neutral-800/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl p-3 w-[260px]">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goToPrevMonth}
            className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <svg className="w-3 h-3 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="text-xs font-medium text-white/80">
            {getMonthYearLabel(viewYear, viewMonth)}
          </span>

          <button
            onClick={goToNextMonth}
            className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <svg className="w-3 h-3 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {weekdays.map((day) => (
            <div key={day} className="text-center text-[10px] font-medium text-white/40 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {days.map(({ date, isCurrentMonth }) => {
            const dayNum = parseInt(date.split('-')[2], 10);
            const isSelected = date === selectedDate;
            const isToday = date === today;
            const isFuture = date > today;
            const hasNote = datesWithNotes.has(date);

            return (
              <button
                key={date}
                onClick={() => handleDayClick(date)}
                disabled={isFuture}
                className={`
                  relative w-8 h-8 rounded-md text-xs font-medium transition-colors
                  flex items-center justify-center
                  ${!isCurrentMonth ? 'text-white/20' : ''}
                  ${isCurrentMonth && !isSelected && !isFuture ? 'text-white/70 hover:bg-white/10' : ''}
                  ${isSelected ? 'bg-accent text-white' : ''}
                  ${isToday && !isSelected ? 'ring-1 ring-accent/50' : ''}
                  ${isFuture ? 'text-white/15 cursor-not-allowed' : ''}
                `}
              >
                {dayNum}
                {/* Note indicator dot */}
                {hasNote && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent/70" />
                )}
              </button>
            );
          })}
        </div>

        {/* Go to today button */}
        <button
          onClick={() => {
            onSelectDate(today);
            onClose();
          }}
          className="w-full mt-3 py-1.5 text-xs font-medium text-white/60 hover:text-white/80 hover:bg-white/5 rounded-md transition-colors"
        >
          Go to Today
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// NotesView component
// ─────────────────────────────────────────────────────────────

export function NotesView() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString);
  const [noteText, setNoteText] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showCalendar, setShowCalendar] = useState(false);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load note when date changes
  useEffect(() => {
    const loaded = loadNoteFromStorage(selectedDate);
    setNoteText(loaded);
    setSaveStatus(loaded ? 'saved' : 'idle');
  }, [selectedDate]);

  // Debounced save function
  const debouncedSave = useCallback((text: string, dateKey: string) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(() => {
      saveNoteToStorage(dateKey, text);
      setSaveStatus('saved');
    }, 500);
  }, []);

  // Handle text changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setNoteText(newText);
    debouncedSave(newText, selectedDate);
  };

  // Save current note before switching dates
  const saveCurrentNote = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveNoteToStorage(selectedDate, noteText);
  };

  // Navigate to previous day
  const goToPreviousDay = () => {
    saveCurrentNote();
    setSelectedDate(addDays(selectedDate, -1));
  };

  // Navigate to next day (but not beyond today)
  const goToNextDay = () => {
    const today = getTodayDateString();
    if (selectedDate >= today) return;
    saveCurrentNote();
    setSelectedDate(addDays(selectedDate, 1));
  };

  // Handle date selection from calendar
  const handleCalendarSelect = (date: string) => {
    saveCurrentNote();
    setSelectedDate(date);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Word count calculation
  const wordCount = noteText.split(/\s+/).filter((word) => word.length > 0).length;

  // Check if we can go forward
  const canGoNext = selectedDate < getTodayDateString();

  return (
    <div className="flex flex-col h-full">
      {/* Header with date navigation */}
      <div className="relative flex items-center justify-between px-3 py-2 border-b border-white/5">
        {/* Left: Previous button */}
        <button
          onClick={goToPreviousDay}
          className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center transition-colors"
          aria-label="Previous day"
        >
          <svg
            className="w-3 h-3 text-white/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Center: Date display */}
        <div className="flex flex-col items-center">
          <span className="text-sm font-medium text-white/90">
            {getDateLabel(selectedDate)}
          </span>
          <span className="text-[11px] text-white/40">
            {formatDateDisplay(selectedDate)}
          </span>
        </div>

        {/* Right: Next button + Calendar */}
        <div className="flex items-center gap-1">
          <button
            onClick={goToNextDay}
            disabled={!canGoNext}
            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
              canGoNext ? 'hover:bg-white/10' : 'opacity-30 cursor-not-allowed'
            }`}
            aria-label="Next day"
          >
            <svg
              className="w-3 h-3 text-white/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Calendar button */}
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
              showCalendar ? 'bg-white/15' : 'hover:bg-white/10'
            }`}
            aria-label="Open calendar"
          >
            <svg
              className="w-3.5 h-3.5 text-white/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
          </button>
        </div>

        {/* Calendar popover */}
        {showCalendar && (
          <CalendarPopover
            selectedDate={selectedDate}
            onSelectDate={handleCalendarSelect}
            onClose={() => setShowCalendar(false)}
          />
        )}
      </div>

      {/* Text area with better padding */}
      <div className="flex-1 px-4 py-3">
        <textarea
          value={noteText}
          onChange={handleChange}
          placeholder="Write your notes..."
          className="w-full h-full bg-transparent text-sm text-white/90 placeholder-white/25 resize-none focus:outline-none leading-relaxed"
        />
      </div>

      {/* Footer with word count and save status */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03]">
        <span className="text-[11px] text-white/35">
          {wordCount} word{wordCount !== 1 ? 's' : ''}
        </span>
        <span
          className={`text-[11px] ${
            saveStatus === 'saving'
              ? 'text-yellow-400/50'
              : saveStatus === 'saved'
              ? 'text-green-400/40'
              : 'text-white/25'
          }`}
        >
          {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Auto-save'}
        </span>
      </div>
    </div>
  );
}
