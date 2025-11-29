import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  calculateStreak,
  getTodaySummary,
  getWeekSummary,
  getMonthSummaries,
} from '../stores/useAppStore';
import { DayActivity, Task } from '../types';

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper to get date N days ago
function getDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return formatDate(date);
}

// Helper to create a DayActivity entry
function createDayActivity(
  daysAgo: number,
  overrides: Partial<DayActivity> = {}
): DayActivity {
  const date = getDateDaysAgo(daysAgo);
  return {
    date,
    pomodoros: 0,
    completedTasks: 0,
    hasNote: false,
    ...overrides,
  };
}

// Helper to create a task
function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-' + Math.random().toString(36).substr(2, 9),
    title: 'Test Task',
    isCompleted: false,
    createdAt: formatDate(new Date()),
    spentPomodoros: 0,
    ...overrides,
  };
}

describe('Stats Selectors', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-11-28T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateStreak', () => {
    it('returns 0 when no activity data exists', () => {
      const byDate: Record<string, DayActivity> = {};
      expect(calculateStreak(byDate)).toBe(0);
    });

    it('returns 0 when today has no activity', () => {
      const byDate: Record<string, DayActivity> = {
        [getDateDaysAgo(1)]: createDayActivity(1, { pomodoros: 2 }),
      };
      expect(calculateStreak(byDate)).toBe(0);
    });

    it('returns 1 when only today has activity', () => {
      const byDate: Record<string, DayActivity> = {
        [getDateDaysAgo(0)]: createDayActivity(0, { pomodoros: 1 }),
      };
      expect(calculateStreak(byDate)).toBe(1);
    });

    it('returns correct streak for consecutive days', () => {
      const byDate: Record<string, DayActivity> = {
        [getDateDaysAgo(0)]: createDayActivity(0, { pomodoros: 1 }),
        [getDateDaysAgo(1)]: createDayActivity(1, { pomodoros: 2 }),
        [getDateDaysAgo(2)]: createDayActivity(2, { completedTasks: 1 }),
        [getDateDaysAgo(3)]: createDayActivity(3, { hasNote: true }),
      };
      expect(calculateStreak(byDate)).toBe(4);
    });

    it('stops streak at first gap', () => {
      const byDate: Record<string, DayActivity> = {
        [getDateDaysAgo(0)]: createDayActivity(0, { pomodoros: 1 }),
        [getDateDaysAgo(1)]: createDayActivity(1, { pomodoros: 1 }),
        // Gap at day 2
        [getDateDaysAgo(3)]: createDayActivity(3, { pomodoros: 5 }),
        [getDateDaysAgo(4)]: createDayActivity(4, { pomodoros: 3 }),
      };
      expect(calculateStreak(byDate)).toBe(2);
    });

    it('counts day as active with only completedTasks', () => {
      const byDate: Record<string, DayActivity> = {
        [getDateDaysAgo(0)]: createDayActivity(0, { completedTasks: 1 }),
      };
      expect(calculateStreak(byDate)).toBe(1);
    });

    it('counts day as active with only hasNote', () => {
      const byDate: Record<string, DayActivity> = {
        [getDateDaysAgo(0)]: createDayActivity(0, { hasNote: true }),
      };
      expect(calculateStreak(byDate)).toBe(1);
    });

    it('does not count day as active when all values are 0/false', () => {
      const byDate: Record<string, DayActivity> = {
        [getDateDaysAgo(0)]: createDayActivity(0, {
          pomodoros: 0,
          completedTasks: 0,
          hasNote: false,
        }),
      };
      expect(calculateStreak(byDate)).toBe(0);
    });
  });

  describe('getTodaySummary', () => {
    it('returns zeros when no data for today', () => {
      const byDate: Record<string, DayActivity> = {};
      const summary = getTodaySummary(byDate);

      expect(summary.pomodoros).toBe(0);
      expect(summary.minutes).toBe(0);
      expect(summary.completedTasks).toBe(0);
    });

    it('returns correct values for today', () => {
      const byDate: Record<string, DayActivity> = {
        [getDateDaysAgo(0)]: createDayActivity(0, {
          pomodoros: 4,
          completedTasks: 3,
        }),
      };
      const summary = getTodaySummary(byDate);

      expect(summary.pomodoros).toBe(4);
      expect(summary.minutes).toBe(100); // 4 * 25
      expect(summary.completedTasks).toBe(3);
    });

    it('calculates minutes as pomodoros * 25', () => {
      const byDate: Record<string, DayActivity> = {
        [getDateDaysAgo(0)]: createDayActivity(0, { pomodoros: 2 }),
      };
      const summary = getTodaySummary(byDate);

      expect(summary.minutes).toBe(50);
    });

    it('ignores data from other days', () => {
      const byDate: Record<string, DayActivity> = {
        [getDateDaysAgo(0)]: createDayActivity(0, { pomodoros: 1 }),
        [getDateDaysAgo(1)]: createDayActivity(1, { pomodoros: 10 }),
      };
      const summary = getTodaySummary(byDate);

      expect(summary.pomodoros).toBe(1);
    });
  });

  describe('getWeekSummary', () => {
    it('returns zeros when no data exists', () => {
      const byDate: Record<string, DayActivity> = {};
      const summary = getWeekSummary(byDate);

      expect(summary.pomodoros).toBe(0);
      expect(summary.minutes).toBe(0);
      expect(summary.activeDays).toBe(0);
    });

    it('aggregates pomodoros from last 7 days', () => {
      const byDate: Record<string, DayActivity> = {
        [getDateDaysAgo(0)]: createDayActivity(0, { pomodoros: 2 }),
        [getDateDaysAgo(1)]: createDayActivity(1, { pomodoros: 3 }),
        [getDateDaysAgo(6)]: createDayActivity(6, { pomodoros: 4 }),
      };
      const summary = getWeekSummary(byDate);

      expect(summary.pomodoros).toBe(9);
      expect(summary.minutes).toBe(225); // 9 * 25
    });

    it('counts active days correctly', () => {
      const byDate: Record<string, DayActivity> = {
        [getDateDaysAgo(0)]: createDayActivity(0, { pomodoros: 1 }),
        [getDateDaysAgo(2)]: createDayActivity(2, { completedTasks: 1 }),
        [getDateDaysAgo(5)]: createDayActivity(5, { hasNote: true }),
      };
      const summary = getWeekSummary(byDate);

      expect(summary.activeDays).toBe(3);
    });

    it('ignores data older than 7 days', () => {
      const byDate: Record<string, DayActivity> = {
        [getDateDaysAgo(0)]: createDayActivity(0, { pomodoros: 1 }),
        [getDateDaysAgo(7)]: createDayActivity(7, { pomodoros: 10 }), // 8th day ago
        [getDateDaysAgo(10)]: createDayActivity(10, { pomodoros: 20 }),
      };
      const summary = getWeekSummary(byDate);

      expect(summary.pomodoros).toBe(1);
      expect(summary.activeDays).toBe(1);
    });

    it('does not count inactive days', () => {
      const byDate: Record<string, DayActivity> = {
        [getDateDaysAgo(0)]: createDayActivity(0, { pomodoros: 0, completedTasks: 0, hasNote: false }),
        [getDateDaysAgo(1)]: createDayActivity(1, { pomodoros: 1 }),
      };
      const summary = getWeekSummary(byDate);

      expect(summary.activeDays).toBe(1);
    });
  });

  describe('getMonthSummaries', () => {
    // Helper to check if a date has note
    const hasNoteForDate = (date: string): boolean => false;

    it('returns summaries for all days in a month', () => {
      const byDate: Record<string, DayActivity> = {};
      const tasks: Task[] = [];
      const summaries = getMonthSummaries(2025, 10, byDate, tasks, hasNoteForDate); // November 2025

      expect(summaries.length).toBe(30); // November has 30 days
    });

    it('includes correct date format in summaries', () => {
      const byDate: Record<string, DayActivity> = {};
      const tasks: Task[] = [];
      const summaries = getMonthSummaries(2025, 10, byDate, tasks, hasNoteForDate);

      expect(summaries[0].date).toBe('2025-11-01');
      expect(summaries[29].date).toBe('2025-11-30');
    });

    it('fills in stats from byDate', () => {
      const byDate: Record<string, DayActivity> = {
        '2025-11-15': {
          date: '2025-11-15',
          pomodoros: 5,
          completedTasks: 2,
          hasNote: true,
        },
      };
      const tasks: Task[] = [];
      const summaries = getMonthSummaries(2025, 10, byDate, tasks, hasNoteForDate);

      const day15 = summaries.find((s) => s.date === '2025-11-15');
      expect(day15?.pomodoros).toBe(5);
      expect(day15?.focusMinutes).toBe(125); // 5 * 25
    });

    it('includes completed tasks for each day', () => {
      const byDate: Record<string, DayActivity> = {};
      const tasks: Task[] = [
        createTask({
          id: 'task-1',
          title: 'Task 1',
          isCompleted: true,
          completedAt: '2025-11-20',
        }),
        createTask({
          id: 'task-2',
          title: 'Task 2',
          isCompleted: true,
          completedAt: '2025-11-20',
        }),
        createTask({
          id: 'task-3',
          title: 'Task 3',
          isCompleted: true,
          completedAt: '2025-11-21',
        }),
      ];
      const summaries = getMonthSummaries(2025, 10, byDate, tasks, hasNoteForDate);

      const day20 = summaries.find((s) => s.date === '2025-11-20');
      expect(day20?.completedTasks.length).toBe(2);
      expect(day20?.completedTasks.map((t) => t.title)).toContain('Task 1');
      expect(day20?.completedTasks.map((t) => t.title)).toContain('Task 2');

      const day21 = summaries.find((s) => s.date === '2025-11-21');
      expect(day21?.completedTasks.length).toBe(1);
    });

    it('detects notes using hasNoteForDate callback', () => {
      const byDate: Record<string, DayActivity> = {};
      const tasks: Task[] = [];
      const hasNote = (date: string) => date === '2025-11-10';
      const summaries = getMonthSummaries(2025, 10, byDate, tasks, hasNote);

      const day10 = summaries.find((s) => s.date === '2025-11-10');
      expect(day10?.hasNote).toBe(true);

      const day11 = summaries.find((s) => s.date === '2025-11-11');
      expect(day11?.hasNote).toBe(false);
    });

    it('returns empty completedTasks array when no tasks match', () => {
      const byDate: Record<string, DayActivity> = {};
      const tasks: Task[] = [];
      const summaries = getMonthSummaries(2025, 10, byDate, tasks, hasNoteForDate);

      summaries.forEach((summary) => {
        expect(summary.completedTasks).toEqual([]);
      });
    });

    it('handles different month lengths correctly', () => {
      const byDate: Record<string, DayActivity> = {};
      const tasks: Task[] = [];

      // February 2025 (non-leap year)
      const febSummaries = getMonthSummaries(2025, 1, byDate, tasks, hasNoteForDate);
      expect(febSummaries.length).toBe(28);

      // January 2025
      const janSummaries = getMonthSummaries(2025, 0, byDate, tasks, hasNoteForDate);
      expect(janSummaries.length).toBe(31);
    });
  });
});
