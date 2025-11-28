import { useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';

export function TasksView() {
  const { tasks, addTask, toggleTask, deleteTask } = useAppStore();
  const [newTaskText, setNewTaskText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTaskText.trim();
    if (trimmed) {
      addTask(trimmed);
      setNewTaskText('');
    }
  };

  // Sort: incomplete first, then by creation date (newest first)
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="flex flex-col h-full">
      {/* Add task input */}
      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2.5">
          <svg
            className="w-5 h-5 text-accent"
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
            className="flex-1 bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
          />
        </div>
      </form>

      <div className="mx-4 h-px bg-white/10" />

      {/* Task list */}
      {sortedTasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white/40">
          <svg
            className="w-12 h-12 mb-3 opacity-50"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
          </svg>
          <p className="text-sm font-medium">No tasks yet</p>
          <p className="text-xs mt-1">Add a task above to get started</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-2">
          {sortedTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => toggleTask(task.id)}
              onDelete={() => deleteTask(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TaskRowProps {
  task: { id: string; title: string; isDone: boolean };
  onToggle: () => void;
  onDelete: () => void;
}

function TaskRow({ task, onToggle, onDelete }: TaskRowProps) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
        isHovering ? 'bg-white/5' : ''
      }`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className="flex-shrink-0"
      >
        <svg
          className={`w-5 h-5 ${task.isDone ? 'text-green-400' : 'text-white/40'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          {task.isDone ? (
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          ) : (
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
          )}
        </svg>
      </button>

      {/* Task title */}
      <span
        className={`flex-1 text-sm ${
          task.isDone
            ? 'text-white/40 line-through'
            : 'text-white/90'
        }`}
      >
        {task.title}
      </span>

      {/* Delete button */}
      {isHovering && (
        <button
          onClick={onDelete}
          className="flex-shrink-0 text-white/40 hover:text-white/70 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
          </svg>
        </button>
      )}
    </div>
  );
}
