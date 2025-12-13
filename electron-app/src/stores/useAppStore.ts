import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Tab, Task, TimerMode, TimerState, MusicTrack, User, TIMER_DURATIONS, DayActivity, TodaySummary, WeekSummary, DaySummary } from '../types';

export type AuthView = 'login' | 'forgot-password' | 'reset-password';

// Helper to get today's date as YYYY-MM-DD
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Helper to get date X days ago
function getDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

// Check if a day is active
function isDayActive(activity: DayActivity | undefined): boolean {
  if (!activity) return false;
  return activity.pomodoros > 0 || activity.completedTasks > 0 || activity.hasNote;
}

// Calculate streak
export function calculateStreak(byDate: Record<string, DayActivity>): number {
  const today = getTodayDate();
  let streak = 0;
  let currentDate = today;

  while (isDayActive(byDate[currentDate])) {
    streak++;
    // Move to previous day
    const date = new Date(currentDate);
    date.setDate(date.getDate() - 1);
    currentDate = date.toISOString().split('T')[0];
  }

  return streak;
}

// Get today's summary
export function getTodaySummary(byDate: Record<string, DayActivity>): TodaySummary {
  const today = getTodayDate();
  const activity = byDate[today];

  return {
    pomodoros: activity?.pomodoros ?? 0,
    minutes: (activity?.pomodoros ?? 0) * 25, // 25 min per pomodoro
    completedTasks: activity?.completedTasks ?? 0,
  };
}

// Get this week's summary (last 7 days including today)
export function getWeekSummary(byDate: Record<string, DayActivity>): WeekSummary {
  let pomodoros = 0;
  let activeDays = 0;

  for (let i = 0; i < 7; i++) {
    const date = getDateDaysAgo(i);
    const activity = byDate[date];
    if (activity) {
      pomodoros += activity.pomodoros;
      if (isDayActive(activity)) {
        activeDays++;
      }
    }
  }

  return {
    pomodoros,
    minutes: pomodoros * 25,
    activeDays,
  };
}

// Get summaries for all days in a given month (for Calendar)
export function getMonthSummaries(
  year: number,
  month: number, // 0-based (0 = January)
  byDate: Record<string, DayActivity>,
  tasks: Task[],
  hasNoteForDate: (date: string) => boolean
): DaySummary[] {
  const summaries: DaySummary[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const activity = byDate[dateStr];
    const completedTasks = tasks.filter((t) => t.completedAt === dateStr);

    summaries.push({
      date: dateStr,
      pomodoros: activity?.pomodoros ?? 0,
      focusMinutes: (activity?.pomodoros ?? 0) * 25,
      completedTasks,
      hasNote: hasNoteForDate(dateStr),
    });
  }

  return summaries;
}

interface AppState {
  // UI State
  selectedTab: Tab;
  isCollapsed: boolean;
  setSelectedTab: (tab: Tab) => void;
  setIsCollapsed: (collapsed: boolean) => void;

  // Timer State
  timer: TimerState;
  setTimerMode: (mode: TimerMode) => void;
  setTimerSeconds: (seconds: number) => void;
  setTimerRunning: (running: boolean) => void;
  setTargetEndTime: (time: number | null) => void;
  incrementPomodoros: () => void;
  resetTimer: () => void;

  // Tasks State
  tasks: Task[];
  currentTaskId: string | null;
  showPomodoroPopup: boolean;
  addTask: (title: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  setCurrentTaskId: (id: string | null) => void;
  incrementTaskPomodoros: (id: string) => void;
  completeTask: (id: string) => void;
  setShowPomodoroPopup: (show: boolean) => void;
  // Subtask actions
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  renameSubtask: (taskId: string, subtaskId: string, title: string) => void;
  // Task rename
  renameTask: (taskId: string, title: string) => void;

  // Notes State
  notes: string;
  setNotes: (notes: string) => void;

  // Music State
  currentTrackIndex: number;
  isPlaying: boolean;
  volume: number;
  setCurrentTrackIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;

  // Auth State
  isLoggedIn: boolean;
  currentUser: User | null;
  authView: AuthView;
  setIsLoggedIn: (loggedIn: boolean) => void;
  setCurrentUser: (user: User | null) => void;
  setAuthView: (view: AuthView) => void;

  // Stats State
  statsByDate: Record<string, DayActivity>;
  recordPomodoro: () => void;
  recordTaskCompletion: () => void;
  recordNoteActivity: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // UI State
      selectedTab: 'timer',
      isCollapsed: false,
      setSelectedTab: (tab) => set({ selectedTab: tab }),
      setIsCollapsed: (collapsed) => set({ isCollapsed: collapsed }),

      // Timer State
      timer: {
        mode: 'pomodoro',
        secondsLeft: TIMER_DURATIONS.pomodoro,
        isRunning: false,
        completedPomodoros: 0,
        targetEndTime: null,
      },
      setTimerMode: (mode) =>
        set((state) => ({
          timer: {
            ...state.timer,
            mode,
            secondsLeft: TIMER_DURATIONS[mode],
            isRunning: false,
            targetEndTime: null,
          },
        })),
      setTimerSeconds: (seconds) =>
        set((state) => ({
          timer: { ...state.timer, secondsLeft: seconds },
        })),
      setTimerRunning: (running) =>
        set((state) => ({
          timer: { ...state.timer, isRunning: running },
        })),
      setTargetEndTime: (time) =>
        set((state) => ({
          timer: { ...state.timer, targetEndTime: time },
        })),
      incrementPomodoros: () =>
        set((state) => ({
          timer: {
            ...state.timer,
            completedPomodoros: state.timer.completedPomodoros + 1,
          },
        })),
      resetTimer: () =>
        set((state) => ({
          timer: {
            ...state.timer,
            secondsLeft: TIMER_DURATIONS[state.timer.mode],
            isRunning: false,
            targetEndTime: null,
          },
        })),

      // Tasks State
      tasks: [],
      currentTaskId: null,
      showPomodoroPopup: false,
      addTask: (title) =>
        set((state) => ({
          tasks: [
            ...state.tasks,
            {
              id: crypto.randomUUID(),
              title,
              isCompleted: false,
              createdAt: new Date().toISOString().split('T')[0],
              spentPomodoros: 0,
            },
          ],
        })),
      toggleTask: (id) =>
        set((state) => {
          const today = getTodayDate();
          const task = state.tasks.find((t) => t.id === id);
          const isCompletingTask = task && !task.isCompleted;

          // Update stats if completing a task
          let newStatsByDate = state.statsByDate;
          if (isCompletingTask) {
            const existing = state.statsByDate[today] || {
              date: today,
              pomodoros: 0,
              completedTasks: 0,
              hasNote: false,
            };
            newStatsByDate = {
              ...state.statsByDate,
              [today]: {
                ...existing,
                completedTasks: existing.completedTasks + 1,
              },
            };
          }

          return {
            tasks: state.tasks.map((t) =>
              t.id === id
                ? {
                    ...t,
                    isCompleted: !t.isCompleted,
                    completedAt: !t.isCompleted ? today : undefined,
                  }
                : t
            ),
            // Clear currentTaskId if we're completing the current task
            currentTaskId:
              state.currentTaskId === id && !task?.isCompleted
                ? null
                : state.currentTaskId,
            statsByDate: newStatsByDate,
          };
        }),
      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
          currentTaskId: state.currentTaskId === id ? null : state.currentTaskId,
        })),
      setCurrentTaskId: (id) => set({ currentTaskId: id }),
      incrementTaskPomodoros: (id) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, spentPomodoros: task.spentPomodoros + 1 }
              : task
          ),
        })),
      completeTask: (id) =>
        set((state) => {
          const today = getTodayDate();
          const task = state.tasks.find((t) => t.id === id);
          const isCompletingTask = task && !task.isCompleted;

          // Update stats if completing a task
          let newStatsByDate = state.statsByDate;
          if (isCompletingTask) {
            const existing = state.statsByDate[today] || {
              date: today,
              pomodoros: 0,
              completedTasks: 0,
              hasNote: false,
            };
            newStatsByDate = {
              ...state.statsByDate,
              [today]: {
                ...existing,
                completedTasks: existing.completedTasks + 1,
              },
            };
          }

          return {
            tasks: state.tasks.map((t) =>
              t.id === id
                ? { ...t, isCompleted: true, completedAt: today }
                : t
            ),
            currentTaskId: state.currentTaskId === id ? null : state.currentTaskId,
            statsByDate: newStatsByDate,
          };
        }),
      setShowPomodoroPopup: (show) => set({ showPomodoroPopup: show }),

      // Subtask actions
      addSubtask: (taskId, title) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subtasks: [
                    ...(task.subtasks ?? []),
                    {
                      id: crypto.randomUUID(),
                      title,
                      isCompleted: false,
                      createdAt: getTodayDate(),
                    },
                  ],
                }
              : task
          ),
        })),

      toggleSubtask: (taskId, subtaskId) =>
        set((state) => {
          const today = getTodayDate();
          let newTasks = state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subtasks: (task.subtasks ?? []).map((subtask) =>
                    subtask.id === subtaskId
                      ? { ...subtask, isCompleted: !subtask.isCompleted }
                      : subtask
                  ),
                }
              : task
          );

          // Check for autoCompleteParentTask setting from settings store
          // We'll import this check at runtime to avoid circular dependency
          const settingsStr = localStorage.getItem('focusflow-settings');
          let autoCompleteParent = false;
          if (settingsStr) {
            try {
              const settings = JSON.parse(settingsStr);
              autoCompleteParent = settings?.state?.autoCompleteParentTask ?? false;
            } catch {
              // ignore parse error
            }
          }

          // If autoCompleteParentTask is enabled, check if all subtasks are now completed
          if (autoCompleteParent) {
            const parentTask = newTasks.find((t) => t.id === taskId);
            if (parentTask && !parentTask.isCompleted) {
              const subtasks = parentTask.subtasks ?? [];
              const allCompleted = subtasks.length > 0 && subtasks.every((s) => s.isCompleted);
              if (allCompleted) {
                // Update stats for task completion
                const existing = state.statsByDate[today] || {
                  date: today,
                  pomodoros: 0,
                  completedTasks: 0,
                  hasNote: false,
                };
                const newStatsByDate = {
                  ...state.statsByDate,
                  [today]: {
                    ...existing,
                    completedTasks: existing.completedTasks + 1,
                  },
                };

                // Auto-complete the parent task
                newTasks = newTasks.map((t) =>
                  t.id === taskId
                    ? { ...t, isCompleted: true, completedAt: today }
                    : t
                );

                return {
                  tasks: newTasks,
                  currentTaskId: state.currentTaskId === taskId ? null : state.currentTaskId,
                  statsByDate: newStatsByDate,
                };
              }
            }
          }

          return { tasks: newTasks };
        }),

      deleteSubtask: (taskId, subtaskId) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subtasks: (task.subtasks ?? []).filter(
                    (subtask) => subtask.id !== subtaskId
                  ),
                }
              : task
          ),
        })),

      renameSubtask: (taskId, subtaskId, title) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subtasks: (task.subtasks ?? []).map((subtask) =>
                    subtask.id === subtaskId ? { ...subtask, title } : subtask
                  ),
                }
              : task
          ),
        })),

      renameTask: (taskId, title) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, title } : task
          ),
        })),

      // Notes State
      notes: '',
      setNotes: (notes) => set({ notes }),

      // Music State
      currentTrackIndex: 0,
      isPlaying: false,
      volume: 0.7,
      setCurrentTrackIndex: (index) => set({ currentTrackIndex: index }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setVolume: (volume) => set({ volume }),

      // Auth State
      isLoggedIn: false,
      currentUser: null,
      authView: 'login',
      setIsLoggedIn: (loggedIn) => set({ isLoggedIn: loggedIn }),
      setCurrentUser: (user) => set({ currentUser: user }),
      setAuthView: (view) => set({ authView: view }),

      // Stats State
      statsByDate: {},
      recordPomodoro: () =>
        set((state) => {
          const today = getTodayDate();
          const existing = state.statsByDate[today] || {
            date: today,
            pomodoros: 0,
            completedTasks: 0,
            hasNote: false,
          };
          return {
            statsByDate: {
              ...state.statsByDate,
              [today]: {
                ...existing,
                pomodoros: existing.pomodoros + 1,
              },
            },
          };
        }),
      recordTaskCompletion: () =>
        set((state) => {
          const today = getTodayDate();
          const existing = state.statsByDate[today] || {
            date: today,
            pomodoros: 0,
            completedTasks: 0,
            hasNote: false,
          };
          return {
            statsByDate: {
              ...state.statsByDate,
              [today]: {
                ...existing,
                completedTasks: existing.completedTasks + 1,
              },
            },
          };
        }),
      recordNoteActivity: () =>
        set((state) => {
          const today = getTodayDate();
          const existing = state.statsByDate[today] || {
            date: today,
            pomodoros: 0,
            completedTasks: 0,
            hasNote: false,
          };
          return {
            statsByDate: {
              ...state.statsByDate,
              [today]: {
                ...existing,
                hasNote: true,
              },
            },
          };
        }),
    }),
    {
      name: 'focusflow-storage',
      partialize: (state) => ({
        tasks: state.tasks,
        currentTaskId: state.currentTaskId,
        notes: state.notes,
        volume: state.volume,
        currentTrackIndex: state.currentTrackIndex,
        statsByDate: state.statsByDate,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AppState>;
        return {
          ...currentState,
          ...persisted,
          // Always use fresh timer state (don't persist timer)
          timer: currentState.timer,
        };
      },
    }
  )
);

export const MUSIC_TRACKS: MusicTrack[] = [
  { id: '1', name: 'Holy Water', category: 'Ambient', fileName: 'holy-water' },
  { id: '2', name: 'Soft Focus', category: 'Focus', fileName: 'soft-focus' },
  { id: '3', name: 'Cinematic', category: 'Ambient', fileName: 'cinematic' },
  { id: '4', name: 'Study 432Hz', category: 'Focus', fileName: 'study-music' },
  { id: '5', name: 'Lofi Focus', category: 'Lofi', fileName: 'lofi-focus' },
  { id: '6', name: 'Ambient Piano', category: 'Focus', fileName: 'ambient-piano' },
];
