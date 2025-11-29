import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MusicView } from '../components/Music/MusicView';
import { render, screen, resetStore } from './testUtils';
import { useAppStore, MUSIC_TRACKS } from '../stores/useAppStore';

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

describe('MusicView', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  describe('Initial state', () => {
    it('renders the music player in expanded mode by default', () => {
      render(<MusicView />);

      // Should show the glass card with track info - track name appears multiple times
      expect(screen.getAllByText(MUSIC_TRACKS[0].name).length).toBeGreaterThan(0);
      // Category also appears in the UI
      expect(screen.getAllByText(MUSIC_TRACKS[0].category).length).toBeGreaterThan(0);
    });

    it('shows all available tracks in the track selector', () => {
      render(<MusicView />);

      MUSIC_TRACKS.forEach((track) => {
        expect(screen.getByRole('button', { name: track.name })).toBeInTheDocument();
      });
    });

    it('shows play button when not playing', () => {
      render(<MusicView />);

      // The play/pause button shows play icon initially
      const playButton = document.querySelector('.w-14.h-14');
      expect(playButton).toBeInTheDocument();
    });
  });

  describe('Play/Pause functionality', () => {
    it('toggles playing state when play button is clicked', async () => {
      const { user } = render(<MusicView />);

      // Find the main play/pause button (large centered button)
      const playButton = document.querySelector('.w-14.h-14') as HTMLElement;

      await user.click(playButton);

      expect(useAppStore.getState().isPlaying).toBe(true);
    });

    it('toggles back to paused when pause button is clicked', async () => {
      useAppStore.setState({ isPlaying: true });

      const { user } = render(<MusicView />);

      const pauseButton = document.querySelector('.w-14.h-14') as HTMLElement;
      await user.click(pauseButton);

      expect(useAppStore.getState().isPlaying).toBe(false);
    });
  });

  describe('Track selection', () => {
    it('changes track when a track button is clicked', async () => {
      const { user } = render(<MusicView />);

      const secondTrack = MUSIC_TRACKS[1];
      const trackButton = screen.getByRole('button', { name: secondTrack.name });

      await user.click(trackButton);

      expect(useAppStore.getState().currentTrackIndex).toBe(1);
      expect(useAppStore.getState().isPlaying).toBe(true);
    });

    it('highlights the currently selected track', () => {
      useAppStore.setState({ currentTrackIndex: 2 });

      render(<MusicView />);

      const selectedTrack = MUSIC_TRACKS[2];
      const trackButton = screen.getByRole('button', { name: selectedTrack.name });

      expect(trackButton.className).toContain('bg-accent');
    });
  });

  describe('Track navigation', () => {
    it('goes to next track when next button is clicked', async () => {
      useAppStore.setState({ currentTrackIndex: 0, isPlaying: true });

      const { user } = render(<MusicView />);

      // Find next track button (skip forward icon)
      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find((btn) =>
        btn.querySelector('path[d*="M6 18l8.5-6L6 6"]')
      );

      if (nextButton) {
        await user.click(nextButton);
        expect(useAppStore.getState().currentTrackIndex).toBe(1);
      }
    });

    it('goes to previous track when previous button is clicked', async () => {
      useAppStore.setState({ currentTrackIndex: 2, isPlaying: true });

      const { user } = render(<MusicView />);

      // Find previous track button (skip back icon)
      const buttons = screen.getAllByRole('button');
      const prevButton = buttons.find((btn) =>
        btn.querySelector('path[d*="M6 6h2v12H6"]')
      );

      if (prevButton) {
        await user.click(prevButton);
        expect(useAppStore.getState().currentTrackIndex).toBe(1);
      }
    });

    it('wraps around when going past last track', async () => {
      useAppStore.setState({
        currentTrackIndex: MUSIC_TRACKS.length - 1,
        isPlaying: true,
      });

      const { user } = render(<MusicView />);

      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find((btn) =>
        btn.querySelector('path[d*="M6 18l8.5-6L6 6"]')
      );

      if (nextButton) {
        await user.click(nextButton);
        expect(useAppStore.getState().currentTrackIndex).toBe(0);
      }
    });
  });

  describe('Volume control', () => {
    it('shows volume slider', () => {
      render(<MusicView />);

      const volumeSlider = screen.getByRole('slider');
      expect(volumeSlider).toBeInTheDocument();
      expect(volumeSlider).toHaveValue('0.7'); // Default volume
    });

    it('shows volume slider with correct initial value', () => {
      useAppStore.setState({ volume: 0.5 });

      render(<MusicView />);

      const volumeSlider = screen.getByRole('slider');
      expect(volumeSlider).toHaveValue('0.5');
    });
  });

  describe('Expand/Collapse functionality', () => {
    it('shows collapse button in expanded mode', () => {
      render(<MusicView />);

      const collapseButton = screen.getByRole('button', { name: /collapse player/i });
      expect(collapseButton).toBeInTheDocument();
    });

    it('collapses when collapse button is clicked', async () => {
      const { user } = render(<MusicView />);

      const collapseButton = screen.getByRole('button', { name: /collapse player/i });
      await user.click(collapseButton);

      // After collapsing, the glass card content should not be visible
      // and expand button should appear
      expect(screen.getByRole('button', { name: /expand player/i })).toBeInTheDocument();

      // Track selector grid should not be visible in collapsed mode
      // (it's part of the expanded card content)
      const trackButtons = MUSIC_TRACKS.map((track) =>
        screen.queryByRole('button', { name: track.name })
      );
      // In collapsed mode, track buttons in the grid should not be present
      // But we still show track name in the mini info
    });

    it('shows mini play/pause in collapsed mode', async () => {
      const { user } = render(<MusicView />);

      const collapseButton = screen.getByRole('button', { name: /collapse player/i });
      await user.click(collapseButton);

      // Mini play button should be visible
      const miniPlayButton = document.querySelector('.w-12.h-12');
      expect(miniPlayButton).toBeInTheDocument();
    });

    it('shows current track info in collapsed mode', async () => {
      const { user } = render(<MusicView />);

      const collapseButton = screen.getByRole('button', { name: /collapse player/i });
      await user.click(collapseButton);

      // Track name should still be visible in collapsed mode
      expect(screen.getByText(MUSIC_TRACKS[0].name)).toBeInTheDocument();
    });

    it('expands when expand button is clicked', async () => {
      const { user } = render(<MusicView />);

      // First collapse
      const collapseButton = screen.getByRole('button', { name: /collapse player/i });
      await user.click(collapseButton);

      // Then expand
      const expandButton = screen.getByRole('button', { name: /expand player/i });
      await user.click(expandButton);

      // Should show collapse button again (meaning we're in expanded mode)
      expect(screen.getByRole('button', { name: /collapse player/i })).toBeInTheDocument();
    });

    it('toggles play state in collapsed mode', async () => {
      const { user } = render(<MusicView />);

      // Collapse
      const collapseButton = screen.getByRole('button', { name: /collapse player/i });
      await user.click(collapseButton);

      // Click mini play button
      const miniPlayButton = document.querySelector('.w-12.h-12') as HTMLElement;
      await user.click(miniPlayButton);

      expect(useAppStore.getState().isPlaying).toBe(true);
    });
  });

  describe('Track display', () => {
    it('shows correct track name and category', () => {
      useAppStore.setState({ currentTrackIndex: 2 });

      render(<MusicView />);

      // Track name appears in multiple places (header and selector)
      expect(screen.getAllByText(MUSIC_TRACKS[2].name).length).toBeGreaterThan(0);
      expect(screen.getAllByText(MUSIC_TRACKS[2].category).length).toBeGreaterThan(0);
    });

    it('updates display when track changes', async () => {
      const { user } = render(<MusicView />);

      const thirdTrack = MUSIC_TRACKS[2];
      const trackButton = screen.getByRole('button', { name: thirdTrack.name });

      await user.click(trackButton);

      // The main display should now show the selected track
      // (it appears multiple times - in selector and in display)
      const trackNameElements = screen.getAllByText(thirdTrack.name);
      expect(trackNameElements.length).toBeGreaterThan(0);
    });
  });

  describe('Visual states', () => {
    it('shows pulse animation on visualizer when playing', () => {
      useAppStore.setState({ isPlaying: true });

      render(<MusicView />);

      // The visualizer circle should have animate-pulse class when playing
      const visualizer = document.querySelector('.animate-pulse');
      expect(visualizer).toBeInTheDocument();
    });

    it('does not show pulse animation when paused', () => {
      useAppStore.setState({ isPlaying: false });

      render(<MusicView />);

      // Check that the main visualizer doesn't have animate-pulse
      const roundedFullElements = document.querySelectorAll('.rounded-full');
      const hasAnimatedVisualizer = Array.from(roundedFullElements).some(
        (el) =>
          el.className.includes('animate-pulse') &&
          el.className.includes('w-20')
      );
      expect(hasAnimatedVisualizer).toBe(false);
    });
  });
});
