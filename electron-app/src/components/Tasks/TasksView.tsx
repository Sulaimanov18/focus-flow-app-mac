import { useState, useEffect, useRef, forwardRef } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Task, Subtask } from '../../types';

// Helper to get today's date as YYYY-MM-DD
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// ============================================================================
// SECTION HEADER COMPONENT
// ============================================================================
interface SectionHeaderProps {
  title: string;
  count: number;
  isCollapsible?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function SectionHeader({
  title,
  count,
  isCollapsible = false,
  isCollapsed = false,
  onToggleCollapse,
}: SectionHeaderProps) {
  return (
    <button
      onClick={isCollapsible ? onToggleCollapse : undefined}
      className={`w-full flex items-center gap-2 px-4 py-2.5 ${
        isCollapsible ? 'cursor-pointer hover:bg-white/[0.02] transition-colors' : 'cursor-default'
      }`}
    >
      <h3 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
        {title}
      </h3>
      <span className="text-[10px] font-medium text-white/30 bg-white/[0.06] px-1.5 py-0.5 rounded-full">
        {count}
      </span>
      {isCollapsible && (
        <svg
          className={`w-3.5 h-3.5 text-white/30 ml-auto transition-transform ${
            isCollapsed ? '' : 'rotate-180'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </button>
  );
}

// ============================================================================
// SUBTASK ITEM COMPONENT
// ============================================================================
interface SubtaskItemProps {
  subtask: Subtask;
  parentCompleted: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
}

function SubtaskItem({
  subtask,
  parentCompleted,
  onToggle,
  onDelete,
  onRename,
}: SubtaskItemProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(subtask.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const isCompleted = subtask.isCompleted || parentCompleted;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== subtask.title) {
      onRename(trimmed);
    } else {
      setEditText(subtask.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditText(subtask.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`group flex items-center gap-2 py-1.5 px-2 rounded-md transition-all ${
        isHovering ? 'bg-white/[0.03]' : ''
      }`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        disabled={parentCompleted}
        className={`flex-shrink-0 transition-transform hover:scale-110 ${
          parentCompleted ? 'cursor-not-allowed' : ''
        }`}
      >
        <svg
          className={`w-4 h-4 transition-colors ${
            isCompleted ? 'text-emerald-400' : 'text-white/25 hover:text-white/40'
          }`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          {isCompleted ? (
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          ) : (
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
          )}
        </svg>
      </button>

      {/* Title (editable) */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 text-xs bg-white/5 text-white/80 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent/50"
        />
      ) : (
        <span
          onClick={() => !parentCompleted && setIsEditing(true)}
          className={`flex-1 text-xs truncate cursor-text ${
            isCompleted ? 'text-white/30 line-through' : 'text-white/60 hover:text-white/70'
          }`}
        >
          {subtask.title}
        </span>
      )}

      {/* Delete button */}
      {isHovering && !parentCompleted && !isEditing && (
        <button
          onClick={onDelete}
          className="flex-shrink-0 p-1 rounded text-white/20 hover:text-red-400/70 hover:bg-red-400/10 transition-all"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ============================================================================
// SUBTASK LIST COMPONENT
// ============================================================================
interface SubtaskListProps {
  subtasks: Subtask[];
  parentCompleted: boolean;
  onToggleSubtask: (subtaskId: string) => void;
  onDeleteSubtask: (subtaskId: string) => void;
  onRenameSubtask: (subtaskId: string, newTitle: string) => void;
  onAddSubtask: (title: string) => void;
}

function SubtaskList({
  subtasks,
  parentCompleted,
  onToggleSubtask,
  onDeleteSubtask,
  onRenameSubtask,
  onAddSubtask,
}: SubtaskListProps) {
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const completedCount = subtasks.filter((s) => s.isCompleted).length;

  useEffect(() => {
    if (isAddingSubtask && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingSubtask]);

  const handleAddSubtask = () => {
    const trimmed = newSubtaskText.trim();
    if (trimmed) {
      onAddSubtask(trimmed);
      setNewSubtaskText('');
      // Keep input focused for rapid entry
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubtask();
    } else if (e.key === 'Escape') {
      setNewSubtaskText('');
      setIsAddingSubtask(false);
    }
  };

  return (
    <div className="relative mt-2 ml-3 pl-4 border-l-2 border-white/[0.06]">
      {/* Subtasks header */}
      {subtasks.length > 0 && (
        <div className="flex items-center gap-2 mb-1.5 px-2">
          <span className="text-[10px] font-medium text-white/30 uppercase tracking-wide">
            Subtasks
          </span>
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              completedCount === subtasks.length && subtasks.length > 0
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-white/[0.06] text-white/40'
            }`}
          >
            {completedCount}/{subtasks.length}
          </span>
        </div>
      )}

      {/* Subtask items */}
      <div className="space-y-0.5">
        {subtasks.map((subtask) => (
          <SubtaskItem
            key={subtask.id}
            subtask={subtask}
            parentCompleted={parentCompleted}
            onToggle={() => onToggleSubtask(subtask.id)}
            onDelete={() => onDeleteSubtask(subtask.id)}
            onRename={(newTitle) => onRenameSubtask(subtask.id, newTitle)}
          />
        ))}
      </div>

      {/* Add subtask input */}
      {!parentCompleted && (
        <div className="mt-1">
          {isAddingSubtask ? (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <svg
                className="w-4 h-4 text-white/20 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (!newSubtaskText.trim()) {
                    setIsAddingSubtask(false);
                  }
                }}
                placeholder="What needs to be done?"
                className="flex-1 text-xs bg-transparent text-white/70 placeholder-white/25 focus:outline-none"
              />
              {newSubtaskText.trim() && (
                <button
                  onClick={handleAddSubtask}
                  className="flex-shrink-0 text-[10px] text-accent hover:text-accent-hover font-medium transition-colors"
                >
                  Add
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAddingSubtask(true)}
              className="flex items-center gap-2 px-2 py-1.5 text-white/25 hover:text-white/40 transition-colors w-full"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              <span className="text-xs">Add a subtask...</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TASK CARD COMPONENT
// ============================================================================
interface TaskCardProps {
  task: Task;
  isCurrentTask: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onFocus: () => void;
  onToggleExpand: () => void;
  onAddSubtask: (title: string) => void;
  onToggleSubtask: (subtaskId: string) => void;
  onDeleteSubtask: (subtaskId: string) => void;
  onRenameSubtask: (subtaskId: string, newTitle: string) => void;
  onRenameTask: (newTitle: string) => void;
  isCompleted?: boolean;
}

const TaskCard = forwardRef<HTMLDivElement, TaskCardProps>(
  (
    {
      task,
      isCurrentTask,
      isExpanded,
      onToggle,
      onDelete,
      onFocus,
      onToggleExpand,
      onAddSubtask,
      onToggleSubtask,
      onDeleteSubtask,
      onRenameSubtask,
      onRenameTask,
      isCompleted,
    },
    ref
  ) => {
    const [isHovering, setIsHovering] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(task.title);
    const inputRef = useRef<HTMLInputElement>(null);

    const subtasks = task.subtasks ?? [];
    const completedSubtasks = subtasks.filter((s) => s.isCompleted).length;
    const hasSubtasks = subtasks.length > 0;
    const allSubtasksComplete = hasSubtasks && completedSubtasks === subtasks.length;

    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [isEditing]);

    const handleSaveTitle = () => {
      const trimmed = editText.trim();
      if (trimmed && trimmed !== task.title) {
        onRenameTask(trimmed);
      } else {
        setEditText(task.title);
      }
      setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSaveTitle();
      } else if (e.key === 'Escape') {
        setEditText(task.title);
        setIsEditing(false);
      }
    };

    // Determine left border color
    const getBorderColor = () => {
      if (task.isCompleted) return 'border-l-emerald-500/60';
      if (isCurrentTask) return 'border-l-accent';
      return 'border-l-white/10';
    };

    return (
      <div
        ref={ref}
        className={`mx-4 mb-2 rounded-xl overflow-hidden transition-all border-l-[3px] ${getBorderColor()} ${
          isHovering && !isEditing
            ? 'bg-white/[0.04] shadow-lg shadow-black/10'
            : 'bg-white/[0.02]'
        } ${isCurrentTask ? 'ring-1 ring-accent/20' : ''}`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Main card content */}
        <div className="px-3 py-3">
          {/* Top row: checkbox, title, badges */}
          <div className="flex items-center gap-2.5">
            {/* Expand chevron */}
            <button
              onClick={onToggleExpand}
              className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded transition-all ${
                hasSubtasks
                  ? 'text-white/40 hover:text-white/60 hover:bg-white/5'
                  : 'text-white/15'
              }`}
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isExpanded ? 'rotate-90' : ''
                }`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
              </svg>
            </button>

            {/* Checkbox */}
            <button
              onClick={onToggle}
              className="flex-shrink-0 transition-transform hover:scale-110"
            >
              <svg
                className={`w-5 h-5 transition-colors ${
                  task.isCompleted ? 'text-emerald-400' : 'text-white/30 hover:text-white/50'
                }`}
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

            {/* Title (editable) */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={handleKeyDown}
                  className="w-full text-sm bg-white/5 text-white/90 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent/50"
                />
              ) : (
                <span
                  onDoubleClick={() => !isCompleted && setIsEditing(true)}
                  className={`text-sm block truncate cursor-text ${
                    task.isCompleted ? 'text-white/40 line-through' : 'text-white/90'
                  }`}
                >
                  {task.title}
                </span>
              )}
            </div>

            {/* Right side badges and actions */}
            <div className="flex items-center gap-2">
              {/* Subtask progress chip */}
              {hasSubtasks && (
                <span
                  className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    allSubtasksComplete
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-white/[0.06] text-white/40'
                  }`}
                >
                  {completedSubtasks}/{subtasks.length}
                </span>
              )}

              {/* Pomodoro chip */}
              {task.spentPomodoros > 0 && (
                <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400/80">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
                  </svg>
                  {task.spentPomodoros}
                </span>
              )}

              {/* Focusing badge */}
              {isCurrentTask && (
                <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                  </span>
                  Focusing
                </span>
              )}

              {/* Action buttons (visible on hover) */}
              {isHovering && !isEditing && (
                <div className="flex items-center gap-1">
                  {/* Focus/Unfocus button */}
                  {!isCompleted && (
                    <button
                      onClick={onFocus}
                      className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${
                        isCurrentTask
                          ? 'text-white/40 hover:text-white/60 hover:bg-white/5'
                          : 'text-accent/60 hover:text-accent hover:bg-accent/10'
                      }`}
                      title={isCurrentTask ? 'Remove focus' : 'Set as focus task'}
                    >
                      {isCurrentTask ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="12" r="10" fillOpacity="0.2" />
                          <circle cx="12" cy="12" r="6" fillOpacity="0.4" />
                          <circle cx="12" cy="12" r="2" />
                        </svg>
                      )}
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={onDelete}
                    className="flex-shrink-0 p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    title="Delete task"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subtasks section (expanded) */}
        {isExpanded && (
          <div className="px-3 pb-3">
            <SubtaskList
              subtasks={subtasks}
              parentCompleted={!!isCompleted}
              onToggleSubtask={onToggleSubtask}
              onDeleteSubtask={onDeleteSubtask}
              onRenameSubtask={onRenameSubtask}
              onAddSubtask={onAddSubtask}
            />
          </div>
        )}
      </div>
    );
  }
);

TaskCard.displayName = 'TaskCard';

// ============================================================================
// MAIN TASKS VIEW COMPONENT
// ============================================================================
export function TasksView() {
  const {
    tasks,
    currentTaskId,
    addTask,
    toggleTask,
    deleteTask,
    setCurrentTaskId,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    renameSubtask,
    renameTask,
  } = useAppStore();

  const [newTaskText, setNewTaskText] = useState('');
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(true);
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

  const toggleExpanded = (taskId: string) => {
    setExpandedTaskIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const isAddDisabled = newTaskText.trim().length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Centered content container */}
      <div className="flex flex-col h-full max-w-lg mx-auto w-full">
        {/* Add task input */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.06] rounded-xl px-4 py-3 border border-white/[0.06] transition-all focus-within:border-accent/30 focus-within:bg-white/[0.06]">
              <svg
                className="w-5 h-5 text-accent/70 flex-shrink-0"
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
                className="flex-1 bg-transparent text-sm text-white placeholder-white/35 focus:outline-none min-w-0"
              />
            </div>
            <button
              type="submit"
              disabled={isAddDisabled}
              className={`flex-shrink-0 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                isAddDisabled
                  ? 'bg-white/[0.04] text-white/25 cursor-not-allowed'
                  : 'bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/20'
              }`}
            >
              Add
            </button>
          </div>
        </form>

        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Task lists */}
        <div className="flex-1 overflow-y-auto">
          {/* Today's Tasks Section */}
          <div className="py-3">
            <SectionHeader title="Today's Tasks" count={todaysTasks.length} />

            {todaysTasks.length === 0 ? (
              <div className="mx-4 py-8 text-center rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-white/20"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <p className="text-sm text-white/30 font-medium">No tasks for today</p>
                <p className="text-xs text-white/20 mt-1">Add a task above to get started</p>
              </div>
            ) : (
              <div className="space-y-0">
                {todaysTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isCurrentTask={task.id === currentTaskId}
                    isExpanded={expandedTaskIds.has(task.id)}
                    onToggle={() => toggleTask(task.id)}
                    onDelete={() => deleteTask(task.id)}
                    onFocus={() => setCurrentTaskId(task.id === currentTaskId ? null : task.id)}
                    onToggleExpand={() => toggleExpanded(task.id)}
                    onAddSubtask={(title) => addSubtask(task.id, title)}
                    onToggleSubtask={(subtaskId) => toggleSubtask(task.id, subtaskId)}
                    onDeleteSubtask={(subtaskId) => deleteSubtask(task.id, subtaskId)}
                    onRenameSubtask={(subtaskId, newTitle) =>
                      renameSubtask(task.id, subtaskId, newTitle)
                    }
                    onRenameTask={(newTitle) => renameTask(task.id, newTitle)}
                    ref={task.id === currentTaskId ? focusedTaskRef : undefined}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Completed Today Section */}
          {completedToday.length > 0 && (
            <div className="py-3 border-t border-white/[0.04]">
              <SectionHeader
                title="Completed Today"
                count={completedToday.length}
                isCollapsible
                isCollapsed={isCompletedCollapsed}
                onToggleCollapse={() => setIsCompletedCollapsed(!isCompletedCollapsed)}
              />

              {!isCompletedCollapsed && (
                <div className="space-y-0">
                  {completedToday.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isCurrentTask={false}
                      isExpanded={expandedTaskIds.has(task.id)}
                      onToggle={() => toggleTask(task.id)}
                      onDelete={() => deleteTask(task.id)}
                      onFocus={() => {}}
                      onToggleExpand={() => toggleExpanded(task.id)}
                      onAddSubtask={(title) => addSubtask(task.id, title)}
                      onToggleSubtask={(subtaskId) => toggleSubtask(task.id, subtaskId)}
                      onDeleteSubtask={(subtaskId) => deleteSubtask(task.id, subtaskId)}
                      onRenameSubtask={(subtaskId, newTitle) =>
                        renameSubtask(task.id, subtaskId, newTitle)
                      }
                      onRenameTask={(newTitle) => renameTask(task.id, newTitle)}
                      isCompleted
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
