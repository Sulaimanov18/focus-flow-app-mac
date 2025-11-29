import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from 'react';
import App from '../App';
import { render, screen, resetStore, createTestTask, setupStoreWithTasks, waitFor } from './testUtils';
import { useAppStore } from '../stores/useAppStore';

// Mock Electron API
const mockElectronAPI = {
  toggleCollapse: vi.fn(),
  getCollapsedState: vi.fn().mockResolvedValue(false),
  closeWindow: vi.fn(),
  minimizeWindow: vi.fn(),
  closeMiniWidget: vi.fn(),
  toggleMiniWidget: vi.fn(),
};

// @ts-ignore
window.electronAPI = mockElectronAPI;

// Mock the audioPlayer service
vi.mock('../services/audioPlayer', () => ({
  audioPlayer: {
    play: vi.fn(),
    pause: vi.fn(),
    setVolume: vi.fn(),
    changeTrack: vi.fn(),
  },
}));

// Mock the background images
vi.mock('../assets/backgrounds/lofi-focus-bg.jpg', () => ({
  default: 'mocked-lofi-bg.jpg',
}));
vi.mock('../assets/backgrounds/soft-focus-bg.jpg', () => ({
  default: 'mocked-soft-focus-bg.jpg',
}));

describe('App', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
    window.location.hash = '';
  });

  describe('Initial rendering', () => {
    it('renders the app with Timer view by default', async () => {
      render(<App />);

      // Should show timer display (25:00 is unique to Timer view)
      await waitFor(() => {
        expect(screen.getByText('25:00')).toBeInTheDocument();
      });
    });

    it('renders the sidebar navigation', async () => {
      render(<App />);

      // Wait for the app to mount
      await waitFor(() => {
        expect(screen.getByText('25:00')).toBeInTheDocument();
      });

      // Sidebar should have navigation buttons
      const timerButton = screen.getByRole('button', { name: /timer/i });
      expect(timerButton).toBeInTheDocument();
    });
  });

  describe('Section switching', () => {
    it('switches to Tasks view when tasks tab is selected', async () => {
      render(<App />);

      // Set the selected tab directly through store
      act(() => {
        useAppStore.setState({ selectedTab: 'tasks' });
      });

      // Should show Tasks header
      await waitFor(() => {
        expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
      });
    });

    it('switches to Notes view when notes tab is selected', async () => {
      render(<App />);

      act(() => {
        useAppStore.setState({ selectedTab: 'notes' });
      });

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });
    });

    it('switches to Music view when music tab is selected', async () => {
      render(<App />);

      act(() => {
        useAppStore.setState({ selectedTab: 'music' });
      });

      await waitFor(() => {
        expect(screen.getByRole('slider')).toBeInTheDocument(); // Volume slider
      });
    });

    it('switches to Calendar view when calendar tab is selected', async () => {
      render(<App />);

      act(() => {
        useAppStore.setState({ selectedTab: 'calendar' });
      });

      await waitFor(() => {
        expect(screen.getByText('Today')).toBeInTheDocument(); // Calendar has Today button
      });
    });

    it('preserves timer state when switching sections', async () => {
      render(<App />);

      // Start with timer running
      act(() => {
        useAppStore.setState({
          timer: {
            mode: 'pomodoro',
            secondsLeft: 20 * 60, // 20 minutes left
            isRunning: true,
            completedPomodoros: 2,
            targetEndTime: null,
          },
        });
      });

      // Switch to tasks
      act(() => {
        useAppStore.setState({ selectedTab: 'tasks' });
      });

      await waitFor(() => {
        expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
      });

      // Switch back to timer
      act(() => {
        useAppStore.setState({ selectedTab: 'timer' });
      });

      // Timer state should be preserved
      const timerState = useAppStore.getState().timer;
      expect(timerState.secondsLeft).toBe(20 * 60);
      expect(timerState.isRunning).toBe(true);
      expect(timerState.completedPomodoros).toBe(2);
    });

    it('preserves music playback state when switching sections', async () => {
      render(<App />);

      // Start music playing
      act(() => {
        useAppStore.setState({
          isPlaying: true,
          currentTrackIndex: 1,
          volume: 0.5,
        });
      });

      // Switch through multiple sections
      act(() => {
        useAppStore.setState({ selectedTab: 'tasks' });
      });
      await waitFor(() => {
        expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
      });

      act(() => {
        useAppStore.setState({ selectedTab: 'calendar' });
      });
      await waitFor(() => {
        expect(screen.getByText('Today')).toBeInTheDocument();
      });

      act(() => {
        useAppStore.setState({ selectedTab: 'music' });
      });
      await waitFor(() => {
        expect(screen.getByRole('slider')).toBeInTheDocument();
      });

      // Music state should be preserved
      const state = useAppStore.getState();
      expect(state.isPlaying).toBe(true);
      expect(state.currentTrackIndex).toBe(1);
      expect(state.volume).toBe(0.5);
    });
  });

  describe('Focus task flow (Timer -> Tasks integration)', () => {
    it('allows focusing on a task from Timer view and seeing it in Tasks view', async () => {
      // Create a task and set it as current
      const task = createTestTask({ title: 'Important Task' });
      setupStoreWithTasks([task], task.id);

      render(<App />);

      // Start in Timer view - should show focused task
      await waitFor(() => {
        expect(screen.getByText('Focusing on:')).toBeInTheDocument();
      });
      expect(screen.getByText('Important Task')).toBeInTheDocument();

      // Switch to Tasks view
      act(() => {
        useAppStore.setState({ selectedTab: 'tasks' });
      });

      // Should show the task with "Focusing" badge
      await waitFor(() => {
        expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
      });
      expect(screen.getByText('Important Task')).toBeInTheDocument();
      expect(screen.getByText('Focusing')).toBeInTheDocument();
    });

    it('clicking focus pill in Timer navigates to Tasks', async () => {
      const task = createTestTask({ title: 'Navigate Test Task' });
      setupStoreWithTasks([task], task.id);

      const { user } = render(<App />);

      await waitFor(() => {
        expect(screen.getByText('25:00')).toBeInTheDocument();
      });

      // Click the focus pill
      const focusPill = screen.getByRole('button', { name: /focusing on/i });
      await user.click(focusPill);

      // Should navigate to Tasks
      expect(useAppStore.getState().selectedTab).toBe('tasks');
    });

    it('unfocusing a task in Tasks clears it in Timer view', async () => {
      const task = createTestTask({ title: 'Clear Focus Task' });
      setupStoreWithTasks([task], task.id);

      render(<App />);

      // Verify task is focused
      expect(useAppStore.getState().currentTaskId).toBe(task.id);

      // Clear the current task
      act(() => {
        useAppStore.getState().setCurrentTaskId(null);
        useAppStore.setState({ selectedTab: 'timer' });
      });

      // Timer view should show "No task selected"
      await waitFor(() => {
        expect(screen.getByText('No task selected')).toBeInTheDocument();
      });
    });
  });

  describe('Timer controls across app', () => {
    it('timer continues running when switching sections', async () => {
      render(<App />);

      // Start the timer
      act(() => {
        useAppStore.setState({
          timer: {
            mode: 'pomodoro',
            secondsLeft: 25 * 60,
            isRunning: true,
            completedPomodoros: 0,
            targetEndTime: Date.now() + 25 * 60 * 1000,
          },
        });
      });

      // Switch to different sections
      act(() => {
        useAppStore.setState({ selectedTab: 'tasks' });
      });
      await waitFor(() => {
        expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
      });

      act(() => {
        useAppStore.setState({ selectedTab: 'music' });
      });
      await waitFor(() => {
        expect(screen.getByRole('slider')).toBeInTheDocument();
      });

      // Timer should still be running
      expect(useAppStore.getState().timer.isRunning).toBe(true);
    });
  });

  describe('Music toggle functionality', () => {
    it('toggles music play state', async () => {
      render(<App />);

      // Initially not playing
      expect(useAppStore.getState().isPlaying).toBe(false);

      // Toggle play
      act(() => {
        useAppStore.getState().setIsPlaying(true);
      });
      expect(useAppStore.getState().isPlaying).toBe(true);

      // Toggle pause
      act(() => {
        useAppStore.getState().setIsPlaying(false);
      });
      expect(useAppStore.getState().isPlaying).toBe(false);
    });

    it('changes track correctly', async () => {
      render(<App />);

      // Start with track 0
      expect(useAppStore.getState().currentTrackIndex).toBe(0);

      // Change to track 2
      act(() => {
        useAppStore.getState().setCurrentTrackIndex(2);
      });
      expect(useAppStore.getState().currentTrackIndex).toBe(2);
    });

    it('music state persists across section switches', async () => {
      render(<App />);

      // Set music state
      act(() => {
        useAppStore.setState({
          isPlaying: true,
          currentTrackIndex: 2,
          volume: 0.8,
        });
      });

      // Switch through all sections
      const sections = ['tasks', 'notes', 'music', 'calendar', 'timer'] as const;
      for (const section of sections) {
        act(() => {
          useAppStore.setState({ selectedTab: section });
        });
      }

      // State should persist
      const state = useAppStore.getState();
      expect(state.isPlaying).toBe(true);
      expect(state.currentTrackIndex).toBe(2);
      expect(state.volume).toBe(0.8);
    });
  });

  describe('Header displays correct title', () => {
    it('shows Timer section header correctly', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('25:00')).toBeInTheDocument();
      });
    });

    it('shows Tasks section content correctly', async () => {
      render(<App />);

      act(() => {
        useAppStore.setState({ selectedTab: 'tasks' });
      });

      await waitFor(() => {
        expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
      });
    });

    it('shows Calendar section content correctly', async () => {
      render(<App />);

      act(() => {
        useAppStore.setState({ selectedTab: 'calendar' });
      });

      await waitFor(() => {
        expect(screen.getByText('Today')).toBeInTheDocument();
      });
    });
  });
});
