import { useEffect, useRef } from 'react';
import { useAppStore } from '../../stores/useAppStore';

export function NotesView() {
  const { notes, setNotes } = useAppStore();
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const wordCount = notes
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);

    // Auto-save with debounce
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      // Notes are auto-saved via zustand persist
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Text area */}
      <div className="flex-1 p-3">
        <textarea
          value={notes}
          onChange={handleChange}
          placeholder="Write your notes here..."
          className="w-full h-full bg-transparent text-sm text-white/90 placeholder-white/30 resize-none focus:outline-none leading-relaxed"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5">
        <span className="text-xs text-white/40">
          {wordCount} word{wordCount !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-white/30">Auto-saved</span>
      </div>
    </div>
  );
}
