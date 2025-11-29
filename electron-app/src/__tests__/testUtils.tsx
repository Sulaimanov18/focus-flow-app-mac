import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore } from '../stores/useAppStore';
import { Task, TimerMode } from '../types';

// Helper to get today's date as YYYY-MM-DD
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Helper to format a date to YYYY-MM-DD
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Reset store to initial state before each test
export function resetStore() {
  useAppStore.setState({
    selectedTab: 'timer',
    isCollapsed: false,
    timer: {
      mode: 'pomodoro',
      secondsLeft: 25 * 60,
      isRunning: false,
      completedPomodoros: 0,
      targetEndTime: null,
    },
    tasks: [],
    currentTaskId: null,
    showPomodoroPopup: false,
    notes: '',
    currentTrackIndex: 0,
    isPlaying: false,
    volume: 0.7,
    isLoggedIn: false,
    currentUser: null,
    statsByDate: {},
  });
}

// Helper to create a task for tests
export function createTestTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-task-' + Math.random().toString(36).substr(2, 9),
    title: 'Test Task',
    isCompleted: false,
    createdAt: getTodayDate(),
    spentPomodoros: 0,
    ...overrides,
  };
}

// Helper to set up store with specific state
export function setupStoreWithTasks(tasks: Task[], currentTaskId: string | null = null) {
  useAppStore.setState({
    tasks,
    currentTaskId,
  });
}

// Helper to set up timer state
export function setupTimerState(overrides: {
  mode?: TimerMode;
  secondsLeft?: number;
  isRunning?: boolean;
  completedPomodoros?: number;
  targetEndTime?: number | null;
} = {}) {
  useAppStore.setState((state) => ({
    timer: {
      ...state.timer,
      ...overrides,
    },
  }));
}

// Helper to set up stats
export function setupStats(statsByDate: Record<string, {
  date: string;
  pomodoros: number;
  completedTasks: number;
  hasNote: boolean;
}>) {
  useAppStore.setState({ statsByDate });
}

// Helper to show pomodoro popup
export function showPomodoroPopup() {
  useAppStore.setState({ showPomodoroPopup: true });
}

// Custom render function with user event setup
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return {
    user: userEvent.setup(),
    ...render(ui, { ...options }),
  };
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };
export { userEvent };
