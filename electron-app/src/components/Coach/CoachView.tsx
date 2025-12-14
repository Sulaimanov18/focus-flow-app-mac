import { useState, useEffect, useRef } from 'react';
import { useCoachStore } from '../../stores/useCoachStore';
import { useAppStore, getTodaySummary } from '../../stores/useAppStore';
import { aiCoachService } from '../../services/aiCoach';
import { executeAction, getActionDescription } from '../../services/coachActionDispatcher';
import { AIMessage, AIInsight, CoachResponse, CoachAction } from '../../types';

// ─────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────

function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
    </div>
  );
}

// Action button component
interface ActionButtonProps {
  action: CoachAction;
  executed: boolean;
  onExecute: () => void;
}

function ActionButton({ action, executed, onExecute }: ActionButtonProps) {
  const description = getActionDescription(action);

  return (
    <button
      onClick={onExecute}
      disabled={executed}
      className={`flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium rounded-md transition-all ${
        executed
          ? 'bg-green-500/20 text-green-400 cursor-default'
          : 'bg-accent/20 text-accent hover:bg-accent/30 active:scale-95'
      }`}
    >
      {executed ? (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {description}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Message Bubble Component
// ─────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: AIMessage;
  isLast: boolean;
}

function MessageBubble({ message, isLast }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [executedActions, setExecutedActions] = useState<Set<number>>(new Set());

  // Try to parse assistant message as CoachResponse
  let parsed: CoachResponse | null = null;
  if (!isUser) {
    try {
      const content = JSON.parse(message.content);
      // Validate it has the new format
      if (typeof content.message === 'string') {
        parsed = content as CoachResponse;
      }
    } catch {
      // Not JSON, display as text
    }
  }

  const handleExecuteAction = (action: CoachAction, index: number) => {
    if (executedActions.has(index)) return;
    executeAction(action);
    setExecutedActions((prev) => new Set(prev).add(index));
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-accent/30 rounded-2xl rounded-br-md px-3 py-2">
          <p className="text-sm text-white/90">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message with structured response (new format)
  if (parsed) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[90%] bg-white/5 rounded-2xl rounded-bl-md px-3 py-2 space-y-2">
          {/* Message (supports \n for line breaks) */}
          <div className="text-sm text-white/90 whitespace-pre-line">{parsed.message}</div>

          {/* Observations */}
          {parsed.observations && parsed.observations.length > 0 && (
            <div className="space-y-1 pt-1">
              {parsed.observations.map((obs, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-blue-400 text-xs mt-0.5">•</span>
                  <p className="text-xs text-white/70">{obs}</p>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {parsed.recommendations && parsed.recommendations.length > 0 && (
            <div className="pt-1 space-y-1">
              {parsed.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-accent text-xs mt-0.5">→</span>
                  <p className="text-xs text-white/70">{rec}</p>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {parsed.actions && parsed.actions.length > 0 && (
            <div className="pt-2 flex flex-wrap gap-1.5 border-t border-white/5">
              {parsed.actions.map((action, i) => (
                <ActionButton
                  key={i}
                  action={action}
                  executed={executedActions.has(i)}
                  onExecute={() => handleExecuteAction(action, i)}
                />
              ))}
            </div>
          )}

          {/* Follow-up question */}
          {parsed.follow_up_question && (
            <p className="text-xs text-white/50 italic pt-1 border-t border-white/5">
              {parsed.follow_up_question}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Plain text assistant message (fallback)
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] bg-white/5 rounded-2xl rounded-bl-md px-3 py-2">
        <p className="text-sm text-white/90">{message.content}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Insight Card Component
// ─────────────────────────────────────────────────────────────

interface InsightCardProps {
  insight: AIInsight;
  onDelete?: () => void;
}

function InsightCard({ insight, onDelete }: InsightCardProps) {
  const periodLabels = {
    session: 'Session',
    day: 'Daily',
    week: 'Weekly',
  };

  const periodColors = {
    session: 'bg-purple-500/20 text-purple-400',
    day: 'bg-blue-500/20 text-blue-400',
    week: 'bg-green-500/20 text-green-400',
  };

  return (
    <div className="bg-white/5 rounded-xl p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${periodColors[insight.period]}`}>
          {periodLabels[insight.period]} Insight
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30">
            {new Date(insight.created_at).toLocaleDateString()}
          </span>
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-white/30 hover:text-white/50 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-white/80">{insight.summary}</p>

      {/* Observations */}
      {insight.observations && insight.observations.length > 0 && (
        <div className="space-y-1">
          {insight.observations.map((obs, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-blue-400 text-xs mt-0.5">•</span>
              <p className="text-xs text-white/60">
                {typeof obs === 'string' ? obs : obs.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {insight.recommendations && insight.recommendations.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-white/5">
          {insight.recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-accent text-xs mt-0.5">→</span>
              <p className="text-xs text-white/60">{rec}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main CoachView Component
// ─────────────────────────────────────────────────────────────

type ViewMode = 'chat' | 'insights';

export function CoachView() {
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Store state
  const {
    messages,
    insights,
    isSendingMessage,
    isGeneratingInsight,
    isLoading,
    error,
    sendMessage,
    loadConversations,
    loadInsights,
    generateInsight,
    deleteInsight,
    clearError,
  } = useCoachStore();

  const { currentUser, tasks, statsByDate, currentTaskId } = useAppStore();

  // Load data on mount
  useEffect(() => {
    if (currentUser?.id) {
      loadConversations(currentUser.id);
      loadInsights(currentUser.id);
    }
  }, [currentUser?.id, loadConversations, loadInsights]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build context for the AI
  const buildContext = async () => {
    if (!currentUser?.id) return null;

    const todaySummary = getTodaySummary(statsByDate);
    const currentTask = tasks.find((t) => t.id === currentTaskId);

    return aiCoachService.buildFocusContext(
      currentUser.id,
      tasks.map((t) => ({
        id: t.id,
        title: t.title,
        isCompleted: t.isCompleted,
        spentPomodoros: t.spentPomodoros,
      })),
      {
        pomodoros: todaySummary.pomodoros,
        focusMinutes: todaySummary.minutes,
        tasksCompleted: todaySummary.completedTasks,
      },
      currentTask?.title
    );
  };

  // Handle send message
  const handleSend = async () => {
    if (!inputValue.trim() || isSendingMessage) return;

    const context = await buildContext();
    if (!context) return;

    const message = inputValue;
    setInputValue('');
    await sendMessage(message, context);
  };

  // Handle generate insight
  const handleGenerateInsight = async (period: 'session' | 'day' | 'week') => {
    if (isGeneratingInsight) return;

    const context = await buildContext();
    if (!context) return;

    await generateInsight(period, context);
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Not logged in state
  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-white/60 mb-1">Sign in to use Coach</h3>
        <p className="text-xs text-white/40">
          The AI Coach analyzes your focus patterns to provide personalized insights.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('chat')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'chat' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setViewMode('insights')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'insights' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'
            }`}
          >
            Insights
          </button>
        </div>

        {/* Generate insight button (only in insights view) */}
        {viewMode === 'insights' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleGenerateInsight('day')}
              disabled={isGeneratingInsight}
              className="px-2 py-1 text-[10px] font-medium bg-accent/20 text-accent rounded hover:bg-accent/30 transition-colors disabled:opacity-50"
            >
              {isGeneratingInsight ? 'Generating...' : '+ Daily'}
            </button>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-3 py-2 bg-red-500/20 border-b border-red-500/30 flex items-center justify-between">
          <span className="text-xs text-red-400">{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Content area */}
      {viewMode === 'chat' ? (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg">🧑‍💻</span>
                </div>
                <h3 className="text-sm font-medium text-white/60 mb-1">Hi, I'm your focus coach!</h3>
                <p className="text-xs text-white/40 max-w-[200px] mx-auto">
                  Ask me about your focus patterns, or get tips to improve your productivity.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {['How am I doing today?', 'Give me a tip', 'Analyze my week'].map((q) => (
                    <button
                      key={q}
                      onClick={() => setInputValue(q)}
                      className="px-2 py-1 text-[10px] bg-white/5 text-white/60 rounded-full hover:bg-white/10 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble key={msg.id} message={msg} isLast={i === messages.length - 1} />
            ))}

            {isSendingMessage && (
              <div className="flex justify-start">
                <div className="bg-white/5 rounded-2xl rounded-bl-md px-4 py-3">
                  <LoadingDots />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-white/5">
            <div className="flex items-end gap-2 bg-white/5 rounded-xl px-3 py-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your coach..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-white/90 placeholder-white/30 resize-none focus:outline-none"
                style={{ minHeight: '20px', maxHeight: '80px' }}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isSendingMessage}
                className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center disabled:opacity-40 transition-opacity"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Insights view */
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {insights.length === 0 && !isLoading && !isGeneratingInsight && (
            <div className="text-center py-8">
              <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-white/60 mb-1">No insights yet</h3>
              <p className="text-xs text-white/40 max-w-[200px] mx-auto">
                Generate your first insight to see AI-powered analysis of your focus patterns.
              </p>
            </div>
          )}

          {isGeneratingInsight && (
            <div className="bg-white/5 rounded-xl p-4 flex items-center justify-center">
              <LoadingDots />
              <span className="ml-2 text-xs text-white/50">Analyzing your data...</span>
            </div>
          )}

          {insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onDelete={() => deleteInsight(insight.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
