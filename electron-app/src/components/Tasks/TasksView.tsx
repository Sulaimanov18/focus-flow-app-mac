import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Task } from '../../types';

// Helper to get today's date as YYYY-MM-DD
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function TasksView() {
  const {
    tasks,
    currentTaskId,
    addTask,
    toggleTask,
    deleteTask,
    setCurrentTaskId,
  } = useAppStore();
  const [newTaskText, setNewTaskText] = useState('');
  const focusedTaskRef = useRef<HTMLDivElement>(null);

  const today = getTodayDate();

  // Today's incomplete tasks
  const todaysTasks = tasks.filter(
    (task) => !task.isCompleted && task.createdAt === today
  );

  // Completed today (regardless of when created)
  const completedToday = tasks.filter(
    (task) => task.isCompleted && task.completedAt === today
  );

  // Scroll focused task into view when the component mounts or currentTaskId changes
  useEffect(() => {
    if (currentTaskId && focusedTaskRef.current) {
      focusedTaskRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTaskId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddTask();
  };

  const handleAddTask = () => {
    const trimmed = newTaskText.trim();
    if (trimmed) {
      addTask(trimmed);
      setNewTaskText('');
    }
  };

  const isAddDisabled = newTaskText.trim().length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Centered content container */}
      <div className="flex flex-col h-full max-w-lg mx-auto w-full">
        {/* Add task input with Add button */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2.5">
              <svg
                className="w-5 h-5 text-accent flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
              </svg>
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Add a task..."
                className="flex-1 bg-transparent text-sm text-white placeholder-white/40 focus:outline-none min-w-0"
              />
            </div>
            <button
              type="submit"
              disabled={isAddDisabled}
              className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isAddDisabled
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'bg-accent hover:bg-accent-hover text-white'
              }`}
            >
              Add
            </button>
          </div>
        </form>

        <div className="mx-4 h-px bg-white/10" />

        {/* Task lists */}
        <div className="flex-1 overflow-y-auto">
          {/* Today's Tasks Section */}
          <div className="py-2">
            <div className="px-4 py-2">
              <h3 className="text-xs font-medium text-white/50 uppercase tracking-wide">
                Today's Tasks
              </h3>
            </div>

            {todaysTasks.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-white/30">No tasks for today</p>
                <p className="text-xs text-white/20 mt-1">Add a task above to get started</p>
              </div>
            ) : (
              todaysTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  isCurrentTask={task.id === currentTaskId}
                  onToggle={() => toggleTask(task.id)}
                  onDelete={() => deleteTask(task.id)}
                  onFocus={() => setCurrentTaskId(task.id === currentTaskId ? null : task.id)}
                  ref={task.id === currentTaskId ? focusedTaskRef : undefined}
                />
              ))
            )}
          </div>

          {/* Completed Today Section */}
          {completedToday.length > 0 && (
            <div className="py-2 border-t border-white/5">
              <div className="px-4 py-2">
                <h3 className="text-xs font-medium text-white/50 uppercase tracking-wide">
                  Completed Today ({completedToday.length})
                </h3>
              </div>

              {completedToday.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  isCurrentTask={false}
                  onToggle={() => toggleTask(task.id)}
                  onDelete={() => deleteTask(task.id)}
                  onFocus={() => {}}
                  isCompleted
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TaskRowProps {
  task: Task;
  isCurrentTask: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onFocus: () => void;
  isCompleted?: boolean;
}

import { forwardRef } from 'react';

const TaskRow = forwardRef<HTMLDivElement, TaskRowProps>(
  ({ task, isCurrentTask, onToggle, onDelete, onFocus, isCompleted }, ref) => {
    const [isHovering, setIsHovering] = useState(false);

    return (
      <div
        ref={ref}
        className={`flex items-center gap-3 px-4 py-2.5 transition-all ${
          isHovering && !isCurrentTask ? 'bg-white/[0.03]' : ''
        } ${isCurrentTask ? 'bg-accent/[0.08] border-l-2 border-accent pl-[14px]' : ''}`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Checkbox */}
        <button onClick={onToggle} className="flex-shrink-0">
          <svg
            className={`w-[18px] h-[18px] ${task.isCompleted ? 'text-green-400' : 'text-white/40'}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            {task.isCompleted ? (
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            ) : (
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
            )}
          </svg>
        </button>

        {/* Task title and badges */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-sm truncate ${
                  task.isCompleted ? 'text-white/40 line-through' : 'text-white/90'
                }`}
              >
                {task.title}
              </span>
              {/* Focusing badge - inline with title */}
              {isCurrentTask && (
                <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-[9px] font-medium">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" fillOpacity="0.3" />
                    <circle cx="12" cy="12" r="6" fillOpacity="0.5" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                  Focusing
                </span>
              )}
            </div>
            {/* Pomodoro count badge */}
            {task.spentPomodoros > 0 && (
              <span className="text-[10px] text-white/30 flex items-center gap-1 mt-0.5">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
                </svg>
                {task.spentPomodoros}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {/* Focus button - only for incomplete, non-focused tasks on hover */}
          {!isCompleted && !isCurrentTask && isHovering && (
            <button
              onClick={onFocus}
              className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all bg-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white/70 border border-white/[0.08]"
              title="Set as focus task"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" fillOpacity="0.2" />
                <circle cx="12" cy="12" r="6" fillOpacity="0.4" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              Focus
            </button>
          )}

          {/* Unfocus button - small, subtle for focused task */}
          {!isCompleted && isCurrentTask && isHovering && (
            <button
              onClick={onFocus}
              className="flex-shrink-0 p-1.5 rounded-full transition-all text-white/30 hover:text-white/50 hover:bg-white/5"
              title="Remove focus"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Delete button */}
          {isHovering && (
            <button
              onClick={onDelete}
              className="flex-shrink-0 text-white/30 hover:text-red-400/70 transition-colors p-1"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }
);

TaskRow.displayName = 'TaskRow';
