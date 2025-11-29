import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NotesView } from '../components/Notes/NotesView';
import { render, screen, resetStore, act, fireEvent } from './testUtils';

// Helper to format date as YYYY-MM-DD
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to get today's date string
function getTodayDateString(): string {
  return formatDateKey(new Date());
}

// Helper to get yesterday's date string
function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateKey(yesterday);
}

describe('NotesView', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Loading notes', () => {
    it("loads today's note by default", () => {
      const today = getTodayDateString();
      localStorage.setItem(`notes:${today}`, "Today's note content");

      render(<NotesView />);

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByDisplayValue("Today's note content")).toBeInTheDocument();
    });

    it('shows empty textarea when no note exists for today', () => {
      render(<NotesView />);

      const textarea = screen.getByPlaceholderText('Write your notes...');
      expect(textarea).toHaveValue('');
    });

    it('displays correct date label for today', () => {
      render(<NotesView />);

      expect(screen.getByText('Today')).toBeInTheDocument();
    });
  });

  describe('Auto-save functionality', () => {
    it('saves note to localStorage with correct key after typing', async () => {
      const today = getTodayDateString();

      render(<NotesView />);

      const textarea = screen.getByPlaceholderText('Write your notes...');
      fireEvent.change(textarea, { target: { value: 'Test note content' } });

      // Advance timers to trigger debounced save
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(localStorage.getItem(`notes:${today}`)).toBe('Test note content');
    });

    it('shows saving status while saving', async () => {
      render(<NotesView />);

      const textarea = screen.getByPlaceholderText('Write your notes...');
      fireEvent.change(textarea, { target: { value: 'Content' } });

      // Before timer advances, should show "Saving..."
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('shows saved status after save completes', async () => {
      render(<NotesView />);

      const textarea = screen.getByPlaceholderText('Write your notes...');
      fireEvent.change(textarea, { target: { value: 'Content' } });

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(screen.getByText('Saved')).toBeInTheDocument();
    });
  });

  describe('Date navigation', () => {
    it('navigates to previous day when left arrow is clicked', async () => {
      const yesterday = getYesterdayDateString();
      localStorage.setItem(`notes:${yesterday}`, "Yesterday's note");

      render(<NotesView />);

      // Click the previous day button
      const prevButton = screen.getByRole('button', { name: /previous day/i });
      fireEvent.click(prevButton);

      expect(screen.getByText('Yesterday')).toBeInTheDocument();
      expect(screen.getByDisplayValue("Yesterday's note")).toBeInTheDocument();
    });

    it('disables next button when viewing today', () => {
      render(<NotesView />);

      const nextButton = screen.getByRole('button', { name: /next day/i });
      expect(nextButton).toHaveClass('opacity-30');
    });

    it('enables next button when viewing past date', async () => {
      render(<NotesView />);

      // Go to yesterday
      const prevButton = screen.getByRole('button', { name: /previous day/i });
      fireEvent.click(prevButton);

      const nextButton = screen.getByRole('button', { name: /next day/i });
      expect(nextButton).not.toHaveClass('opacity-30');
    });

    it('navigates back to today from yesterday', async () => {
      render(<NotesView />);

      // Go to yesterday
      const prevButton = screen.getByRole('button', { name: /previous day/i });
      fireEvent.click(prevButton);

      expect(screen.getByText('Yesterday')).toBeInTheDocument();

      // Go back to today
      const nextButton = screen.getByRole('button', { name: /next day/i });
      fireEvent.click(nextButton);

      expect(screen.getByText('Today')).toBeInTheDocument();
    });
  });

  describe('Switching between dates preserves notes', () => {
    it('loads correct note when switching dates', async () => {
      const today = getTodayDateString();
      const yesterday = getYesterdayDateString();

      localStorage.setItem(`notes:${today}`, 'Today note');
      localStorage.setItem(`notes:${yesterday}`, 'Yesterday note');

      render(<NotesView />);

      // Start on today
      expect(screen.getByDisplayValue('Today note')).toBeInTheDocument();

      // Go to yesterday
      const prevButton = screen.getByRole('button', { name: /previous day/i });
      fireEvent.click(prevButton);

      expect(screen.getByDisplayValue('Yesterday note')).toBeInTheDocument();

      // Go back to today
      const nextButton = screen.getByRole('button', { name: /next day/i });
      fireEvent.click(nextButton);

      expect(screen.getByDisplayValue('Today note')).toBeInTheDocument();
    });

    it('saves current note before switching dates', async () => {
      const today = getTodayDateString();

      render(<NotesView />);

      const textarea = screen.getByPlaceholderText('Write your notes...');
      fireEvent.change(textarea, { target: { value: 'Unsaved note' } });

      // Navigate away (should trigger immediate save)
      const prevButton = screen.getByRole('button', { name: /previous day/i });
      fireEvent.click(prevButton);

      // The note should be saved
      expect(localStorage.getItem(`notes:${today}`)).toBe('Unsaved note');
    });
  });

  describe('Word count', () => {
    it('shows word count of 0 for empty note', () => {
      render(<NotesView />);

      expect(screen.getByText('0 words')).toBeInTheDocument();
    });

    it('updates word count as user types', async () => {
      render(<NotesView />);

      const textarea = screen.getByPlaceholderText('Write your notes...');
      fireEvent.change(textarea, { target: { value: 'one two three' } });

      expect(screen.getByText('3 words')).toBeInTheDocument();
    });

    it('shows singular "word" for 1 word', async () => {
      render(<NotesView />);

      const textarea = screen.getByPlaceholderText('Write your notes...');
      fireEvent.change(textarea, { target: { value: 'hello' } });

      expect(screen.getByText('1 word')).toBeInTheDocument();
    });
  });

  describe('Calendar integration', () => {
    it('opens calendar popover when calendar button is clicked', async () => {
      render(<NotesView />);

      const calendarButton = screen.getByRole('button', { name: /open calendar/i });
      fireEvent.click(calendarButton);

      // Calendar should show month/year header
      const now = new Date();
      const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      expect(screen.getByText(monthYear)).toBeInTheDocument();
    });

    it('shows "Go to Today" button in calendar', async () => {
      render(<NotesView />);

      const calendarButton = screen.getByRole('button', { name: /open calendar/i });
      fireEvent.click(calendarButton);

      expect(screen.getByRole('button', { name: /go to today/i })).toBeInTheDocument();
    });
  });

  describe('Target date from Calendar navigation', () => {
    it('opens to target date when navigating from Calendar', () => {
      const yesterday = getYesterdayDateString();
      localStorage.setItem(`notes:${yesterday}`, 'Yesterday from calendar');
      sessionStorage.setItem('notes-target-date', yesterday);

      render(<NotesView />);

      expect(screen.getByText('Yesterday')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Yesterday from calendar')).toBeInTheDocument();
    });

    it('clears target date from sessionStorage after loading', () => {
      const yesterday = getYesterdayDateString();
      sessionStorage.setItem('notes-target-date', yesterday);

      render(<NotesView />);

      expect(sessionStorage.getItem('notes-target-date')).toBe(null);
    });
  });
});
