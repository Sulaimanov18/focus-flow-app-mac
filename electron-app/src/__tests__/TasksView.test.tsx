import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TasksView } from '../components/Tasks/TasksView';
import {
  render,
  screen,
  resetStore,
  createTestTask,
  setupStoreWithTasks,
  getTodayDate,
  fireEvent,
} from './testUtils';
import { useAppStore } from '../stores/useAppStore';

describe('TasksView', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  describe('Creating a new task', () => {
    it('shows empty state when no tasks exist', () => {
      render(<TasksView />);
      expect(screen.getByText('No tasks for today')).toBeInTheDocument();
      expect(screen.getByText('Add a task above to get started')).toBeInTheDocument();
    });

    it('creates a new task when typing and pressing Enter', async () => {
      const { user } = render(<TasksView />);

      const input = screen.getByPlaceholderText('Add a task...');
      await user.type(input, 'New test task{Enter}');

      const state = useAppStore.getState();
      expect(state.tasks.length).toBe(1);
      expect(state.tasks[0].title).toBe('New test task');
      expect(state.tasks[0].createdAt).toBe(getTodayDate());
      expect(state.tasks[0].isCompleted).toBe(false);
    });

    it('creates a new task when clicking Add button', async () => {
      const { user } = render(<TasksView />);

      const input = screen.getByPlaceholderText('Add a task...');
      await user.type(input, 'Another test task');

      const addButton = screen.getByRole('button', { name: 'Add' });
      await user.click(addButton);

      const state = useAppStore.getState();
      expect(state.tasks.length).toBe(1);
      expect(state.tasks[0].title).toBe('Another test task');
    });

    it('clears input after adding a task', async () => {
      const { user } = render(<TasksView />);

      const input = screen.getByPlaceholderText('Add a task...');
      await user.type(input, 'Test task{Enter}');

      expect(input).toHaveValue('');
    });

    it('disables Add button when input is empty', () => {
      render(<TasksView />);

      const addButton = screen.getByRole('button', { name: 'Add' });
      expect(addButton).toBeDisabled();
    });

    it('does not create task with only whitespace', async () => {
      const { user } = render(<TasksView />);

      const input = screen.getByPlaceholderText('Add a task...');
      await user.type(input, '   {Enter}');

      const state = useAppStore.getState();
      expect(state.tasks.length).toBe(0);
    });

    it('new task appears in Today\'s Tasks section', async () => {
      const { user } = render(<TasksView />);

      const input = screen.getByPlaceholderText('Add a task...');
      await user.type(input, 'Task in today list{Enter}');

      expect(screen.getByText('Task in today list')).toBeInTheDocument();
      expect(screen.queryByText('No tasks for today')).not.toBeInTheDocument();
    });
  });

  describe('Completing a task', () => {
    it('moves task from Today to Completed when checkbox is clicked', async () => {
      const task = createTestTask({ title: 'Task to complete' });
      setupStoreWithTasks([task]);

      const { user } = render(<TasksView />);

      // Initially in Today's Tasks
      expect(screen.getByText('Task to complete')).toBeInTheDocument();

      // Click the checkbox button - find it near the task title
      const taskRow = screen.getByText('Task to complete').closest('div[class*="flex items-center gap-3"]');
      const checkbox = taskRow?.querySelector('button') as HTMLElement;
      if (checkbox) {
        await user.click(checkbox);
      }

      const state = useAppStore.getState();
      const completedTask = state.tasks.find((t) => t.id === task.id);
      expect(completedTask?.isCompleted).toBe(true);
      expect(completedTask?.completedAt).toBe(getTodayDate());
    });

    it('shows Completed Today section when tasks are completed', async () => {
      const task = createTestTask({
        title: 'Completed task',
        isCompleted: true,
        completedAt: getTodayDate(),
      });
      setupStoreWithTasks([task]);

      render(<TasksView />);

      expect(screen.getByText(/Completed Today/)).toBeInTheDocument();
      expect(screen.getByText('Completed task')).toBeInTheDocument();
    });

    it('shows completed task count in section header', () => {
      const tasks = [
        createTestTask({
          id: '1',
          title: 'Completed 1',
          isCompleted: true,
          completedAt: getTodayDate(),
        }),
        createTestTask({
          id: '2',
          title: 'Completed 2',
          isCompleted: true,
          completedAt: getTodayDate(),
        }),
      ];
      setupStoreWithTasks(tasks);

      render(<TasksView />);

      expect(screen.getByText('Completed Today (2)')).toBeInTheDocument();
    });
  });

  describe('Selecting a focus task', () => {
    it('sets currentTaskId when Focus button is clicked', async () => {
      const task = createTestTask({ title: 'Task to focus' });
      setupStoreWithTasks([task]);

      const { user } = render(<TasksView />);

      // Hover over the task row to show the Focus button
      const taskRow = screen.getByText('Task to focus').closest('div[class*="flex items-center"]');
      if (taskRow) {
        fireEvent.mouseEnter(taskRow);
      }

      // Find and click the Focus button
      const focusButton = await screen.findByRole('button', { name: /focus/i });
      await user.click(focusButton);

      expect(useAppStore.getState().currentTaskId).toBe(task.id);
    });

    it('shows Focusing badge on the current task', () => {
      const task = createTestTask({ title: 'Focused task' });
      setupStoreWithTasks([task], task.id);

      render(<TasksView />);

      expect(screen.getByText('Focusing')).toBeInTheDocument();
    });

    it('removes focus when clicking unfocus button on focused task', async () => {
      const task = createTestTask({ title: 'Task to unfocus' });
      setupStoreWithTasks([task], task.id);

      const { user } = render(<TasksView />);

      // Hover over the task row to show the unfocus button
      const taskRow = screen.getByText('Task to unfocus').closest('div[class*="flex items-center"]');
      if (taskRow) {
        fireEvent.mouseEnter(taskRow);
      }

      // Find and click the unfocus (X) button
      const unfocusButton = await screen.findByRole('button', { name: /remove focus/i });
      await user.click(unfocusButton);

      expect(useAppStore.getState().currentTaskId).toBe(null);
    });

    it('switches focus when clicking Focus on a different task', async () => {
      const task1 = createTestTask({ id: 'task-1', title: 'First task' });
      const task2 = createTestTask({ id: 'task-2', title: 'Second task' });
      setupStoreWithTasks([task1, task2], task1.id);

      const { user } = render(<TasksView />);

      // Hover over the second task to show Focus button
      const taskRow = screen.getByText('Second task').closest('div[class*="flex items-center"]');
      if (taskRow) {
        fireEvent.mouseEnter(taskRow);
      }

      const focusButton = await screen.findByRole('button', { name: /focus/i });
      await user.click(focusButton);

      expect(useAppStore.getState().currentTaskId).toBe('task-2');
    });
  });

  describe('Pomodoro count display', () => {
    it('shows pomodoro count for tasks with spent pomodoros', () => {
      const task = createTestTask({
        title: 'Task with pomodoros',
        spentPomodoros: 3,
      });
      setupStoreWithTasks([task]);

      render(<TasksView />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('does not show pomodoro count when spentPomodoros is 0', () => {
      const task = createTestTask({
        title: 'Task without pomodoros',
        spentPomodoros: 0,
      });
      setupStoreWithTasks([task]);

      render(<TasksView />);

      // The task should be visible but no count displayed
      expect(screen.getByText('Task without pomodoros')).toBeInTheDocument();
      // There should be no standalone "0" in the document for pomodoros
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('Deleting a task', () => {
    it('removes task when delete button is clicked', async () => {
      const task = createTestTask({ title: 'Task to delete' });
      setupStoreWithTasks([task]);

      const { user } = render(<TasksView />);

      // Hover over the task row to show the delete button
      const taskRow = screen.getByText('Task to delete').closest('div[class*="flex items-center"]');
      if (taskRow) {
        fireEvent.mouseEnter(taskRow);
      }

      // Find and click the delete button (last button in the row with trash icon)
      const buttons = screen.getAllByRole('button');
      const deleteButton = buttons[buttons.length - 1]; // Delete is typically the last button
      await user.click(deleteButton);

      expect(useAppStore.getState().tasks.length).toBe(0);
    });

    it('clears currentTaskId when focused task is deleted', async () => {
      const task = createTestTask({ title: 'Focused task to delete' });
      setupStoreWithTasks([task], task.id);

      const { user } = render(<TasksView />);

      // Hover and delete
      const taskRow = screen.getByText('Focused task to delete').closest('div[class*="flex items-center"]');
      if (taskRow) {
        fireEvent.mouseEnter(taskRow);
      }

      const buttons = screen.getAllByRole('button');
      const deleteButton = buttons[buttons.length - 1];
      await user.click(deleteButton);

      expect(useAppStore.getState().currentTaskId).toBe(null);
    });
  });
});
