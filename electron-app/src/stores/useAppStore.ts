import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Tab, Task, TimerMode, TimerState, MusicTrack, User, TIMER_DURATIONS } from '../types';

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
  addTask: (title: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;

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
  setIsLoggedIn: (loggedIn: boolean) => void;
  setCurrentUser: (user: User | null) => void;
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
      addTask: (title) =>
        set((state) => ({
          tasks: [
            ...state.tasks,
            {
              id: crypto.randomUUID(),
              title,
              isDone: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        })),
      toggleTask: (id) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, isDone: !task.isDone, updatedAt: new Date() }
              : task
          ),
        })),
      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
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
      setIsLoggedIn: (loggedIn) => set({ isLoggedIn: loggedIn }),
      setCurrentUser: (user) => set({ currentUser: user }),
    }),
    {
      name: 'focusflow-storage',
      partialize: (state) => ({
        tasks: state.tasks,
        notes: state.notes,
        volume: state.volume,
        currentTrackIndex: state.currentTrackIndex,
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
