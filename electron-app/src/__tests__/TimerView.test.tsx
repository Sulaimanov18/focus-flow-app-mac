import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TimerView } from '../components/Timer/TimerView';
import {
  render,
  screen,
  resetStore,
  createTestTask,
  setupStoreWithTasks,
  setupTimerState,
  setupStats,
  showPomodoroPopup,
  getTodayDate,
} from './testUtils';
import { useAppStore } from '../stores/useAppStore';

describe('TimerView', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  describe('Current task label', () => {
    it('shows "No task selected" when no currentTaskId is set', () => {
      render(<TimerView />);
      expect(screen.getByText('No task selected')).toBeInTheDocument();
    });

    it('shows "Focusing on:" with task title when a current task is selected', () => {
      const task = createTestTask({ title: 'Write unit tests' });
      setupStoreWithTasks([task], task.id);

      render(<TimerView />);

      expect(screen.getByText('Focusing on:')).toBeInTheDocument();
      expect(screen.getByText('Write unit tests')).toBeInTheDocument();
    });

    it('clicking the focus pill navigates to tasks tab', async () => {
      const task = createTestTask({ title: 'Write unit tests' });
      setupStoreWithTasks([task], task.id);

      const { user } = render(<TimerView />);

      const focusPill = screen.getByRole('button', { name: /focusing on/i });
      await user.click(focusPill);

      expect(useAppStore.getState().selectedTab).toBe('tasks');
    });
  });

  describe('Timer modes', () => {
    it('displays Focus mode by default', () => {
      render(<TimerView />);
      // The timer mode label shows "Focus" for pomodoro mode
      expect(screen.getAllByText('Focus').length).toBeGreaterThan(0);
    });

    it('switches to Short Break mode when clicked', async () => {
      const { user } = render(<TimerView />);

      const shortBreakButton = screen.getByRole('button', { name: 'Short' });
      await user.click(shortBreakButton);

      expect(useAppStore.getState().timer.mode).toBe('shortBreak');
    });

    it('switches to Long Break mode when clicked', async () => {
      const { user } = render(<TimerView />);

      const longBreakButton = screen.getByRole('button', { name: 'Long' });
      await user.click(longBreakButton);

      expect(useAppStore.getState().timer.mode).toBe('longBreak');
    });
  });

  describe('Timer display', () => {
    it('displays initial time of 25:00 for Focus mode', () => {
      render(<TimerView />);
      expect(screen.getByText('25:00')).toBeInTheDocument();
    });

    it('updates timer display when secondsLeft changes', () => {
      setupTimerState({ secondsLeft: 15 * 60 + 30 });

      render(<TimerView />);
      expect(screen.getByText('15:30')).toBeInTheDocument();
    });
  });

  describe('Pomodoro completion popup', () => {
    it('shows popup when showPomodoroPopup is true and task is selected', () => {
      const task = createTestTask({ title: 'Test Task for Popup' });
      setupStoreWithTasks([task], task.id);
      showPomodoroPopup();

      render(<TimerView />);

      expect(screen.getByText('Good job!')).toBeInTheDocument();
      // Check for part of the task title - it appears in multiple elements
      expect(screen.getAllByText(/Test Task for Popup/).length).toBeGreaterThan(0);
      // Buttons should exist
      expect(screen.getByText('+1 Pomodoro')).toBeInTheDocument();
      expect(screen.getByText('Mark Completed')).toBeInTheDocument();
      expect(screen.getByText('Skip')).toBeInTheDocument();
    });

    it('clicking +1 Pomodoro increments task pomodoros and closes popup', async () => {
      const task = createTestTask({
        title: 'Increment Test',
        spentPomodoros: 0,
      });
      setupStoreWithTasks([task], task.id);
      showPomodoroPopup();

      const { user } = render(<TimerView />);

      await user.click(screen.getByRole('button', { name: '+1 Pomodoro' }));

      const state = useAppStore.getState();
      const updatedTask = state.tasks.find((t) => t.id === task.id);
      expect(updatedTask?.spentPomodoros).toBe(1);
      expect(state.showPomodoroPopup).toBe(false);
    });

    it('clicking Mark Completed marks task as completed and closes popup', async () => {
      const task = createTestTask({
        title: 'Complete Test',
        spentPomodoros: 0,
        isCompleted: false,
      });
      setupStoreWithTasks([task], task.id);
      showPomodoroPopup();

      const { user } = render(<TimerView />);

      await user.click(screen.getByRole('button', { name: 'Mark Completed' }));

      const state = useAppStore.getState();
      const updatedTask = state.tasks.find((t) => t.id === task.id);
      expect(updatedTask?.isCompleted).toBe(true);
      expect(updatedTask?.completedAt).toBe(getTodayDate());
      expect(updatedTask?.spentPomodoros).toBe(1);
      expect(state.showPomodoroPopup).toBe(false);
    });

    it('clicking Skip closes popup without changing task state', async () => {
      const task = createTestTask({
        title: 'Skip Test',
        spentPomodoros: 2,
        isCompleted: false,
      });
      setupStoreWithTasks([task], task.id);
      showPomodoroPopup();

      const { user } = render(<TimerView />);

      await user.click(screen.getByRole('button', { name: 'Skip' }));

      const state = useAppStore.getState();
      const updatedTask = state.tasks.find((t) => t.id === task.id);
      expect(updatedTask?.spentPomodoros).toBe(2);
      expect(updatedTask?.isCompleted).toBe(false);
      expect(state.showPomodoroPopup).toBe(false);
    });
  });

  describe('Timer controls', () => {
    it('starts timer when play button is clicked', async () => {
      const { user } = render(<TimerView />);

      // Find the main play/pause button (it's the larger one in the center with w-14 h-14 class)
      const playPauseButton = document.querySelector('.w-14.h-14') as HTMLElement;

      expect(playPauseButton).toBeInTheDocument();
      await user.click(playPauseButton);
      expect(useAppStore.getState().timer.isRunning).toBe(true);
    });
  });

  describe('Completed pomodoros indicator', () => {
    it('does not show indicator when no pomodoros completed', () => {
      setupTimerState({ completedPomodoros: 0 });
      render(<TimerView />);

      // Look for the dots that represent completed pomodoros
      const dots = document.querySelectorAll('.bg-accent');
      // Filter to just the small indicator dots (2x2 pixels)
      const pomodoroIndicators = Array.from(dots).filter(
        (dot) => dot.className.includes('w-2') && dot.className.includes('h-2')
      );
      expect(pomodoroIndicators.length).toBe(0);
    });

    it('shows correct number of indicators for completed pomodoros', () => {
      setupTimerState({ completedPomodoros: 3 });
      render(<TimerView />);

      const dots = document.querySelectorAll('.w-2.h-2.rounded-full.bg-accent');
      expect(dots.length).toBe(3);
    });

    it('shows max 4 dots with +N text for more than 4 pomodoros', () => {
      setupTimerState({ completedPomodoros: 6 });
      render(<TimerView />);

      const dots = document.querySelectorAll('.w-2.h-2.rounded-full.bg-accent');
      expect(dots.length).toBe(4);
      expect(screen.getByText('+2')).toBeInTheDocument();
    });
  });

  describe('Pomodoro completion popup stats', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-11-28T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows today stats with zero values when no activity', () => {
      const task = createTestTask({ title: 'Test Task' });
      setupStoreWithTasks([task], task.id);
      showPomodoroPopup();

      render(<TimerView />);

      expect(screen.getAllByText(/Today:/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/0 pomodoros/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/0 min/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/0 tasks/).length).toBeGreaterThan(0);
    });

    it('shows correct today stats when activity exists', () => {
      const task = createTestTask({ title: 'Test Task' });
      setupStoreWithTasks([task], task.id);
      setupStats({
        '2025-11-28': {
          date: '2025-11-28',
          pomodoros: 3,
          completedTasks: 2,
          hasNote: false,
        },
      });
      showPomodoroPopup();

      render(<TimerView />);

      expect(screen.getAllByText(/3 pomodoros/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/75 min/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/2 tasks/).length).toBeGreaterThan(0);
    });

    it('uses singular form for 1 pomodoro and 1 task', () => {
      const task = createTestTask({ title: 'Test Task' });
      setupStoreWithTasks([task], task.id);
      setupStats({
        '2025-11-28': {
          date: '2025-11-28',
          pomodoros: 1,
          completedTasks: 1,
          hasNote: false,
        },
      });
      showPomodoroPopup();

      render(<TimerView />);

      expect(screen.getAllByText(/1 pomodoro(?!s)/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/1 task(?!s)/).length).toBeGreaterThan(0);
    });
  });

  describe('Mini daily summary', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-11-28T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows today stats below timer controls', () => {
      setupStats({
        '2025-11-28': {
          date: '2025-11-28',
          pomodoros: 4,
          completedTasks: 2,
          hasNote: false,
        },
      });

      render(<TimerView />);

      // The mini summary should show today's stats (may appear multiple times in different sections)
      expect(screen.getAllByText(/4 pomodoros/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/100 min/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/2 tasks/).length).toBeGreaterThan(0);
    });

    it('shows zero stats when no activity today', () => {
      render(<TimerView />);

      // Stats appear in multiple sections (Today, Week in FocusStats + MiniDailySummary)
      expect(screen.getAllByText(/0 pomodoros/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/0 min/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/0 tasks/).length).toBeGreaterThan(0);
    });

    it('shows streak when user has consecutive days of activity', () => {
      setupStats({
        '2025-11-28': {
          date: '2025-11-28',
          pomodoros: 1,
          completedTasks: 0,
          hasNote: false,
        },
        '2025-11-27': {
          date: '2025-11-27',
          pomodoros: 2,
          completedTasks: 1,
          hasNote: false,
        },
        '2025-11-26': {
          date: '2025-11-26',
          pomodoros: 3,
          completedTasks: 0,
          hasNote: true,
        },
      });

      render(<TimerView />);

      expect(screen.getByText(/3 day streak/)).toBeInTheDocument();
    });

    it('does not show streak when no consecutive activity', () => {
      setupStats({
        '2025-11-26': {
          date: '2025-11-26',
          pomodoros: 5,
          completedTasks: 3,
          hasNote: false,
        },
      });

      render(<TimerView />);

      expect(screen.queryByText(/day streak/)).not.toBeInTheDocument();
    });

    it('uses singular form for 1 pomodoro and 1 task', () => {
      setupStats({
        '2025-11-28': {
          date: '2025-11-28',
          pomodoros: 1,
          completedTasks: 1,
          hasNote: false,
        },
      });

      render(<TimerView />);

      expect(screen.getByText(/1 pomodoro(?!s)/)).toBeInTheDocument();
      expect(screen.getByText(/1 task(?!s)/)).toBeInTheDocument();
    });
  });
});
