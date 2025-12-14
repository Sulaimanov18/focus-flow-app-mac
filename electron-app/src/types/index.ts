export type Tab = 'timer' | 'tasks' | 'notes' | 'music' | 'account' | 'calendar' | 'settings' | 'coach';

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: string; // YYYY-MM-DD format
}

export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: string; // YYYY-MM-DD format
  completedAt?: string; // YYYY-MM-DD format, only set when finished
  spentPomodoros: number;
  subtasks?: Subtask[]; // Optional array of subtasks
}

export type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

export interface TimerState {
  mode: TimerMode;
  secondsLeft: number;
  isRunning: boolean;
  completedPomodoros: number;
  targetEndTime: number | null;
}

export interface MusicTrack {
  id: string;
  name: string;
  category: string;
  fileName: string;
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
}

export const TIMER_DURATIONS: Record<TimerMode, number> = {
  pomodoro: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export const TIMER_MODE_LABELS: Record<TimerMode, string> = {
  pomodoro: 'Focus',
  shortBreak: 'Short',
  longBreak: 'Long',
};

// Stats types
export interface DayActivity {
  date: string; // "YYYY-MM-DD"
  pomodoros: number;
  completedTasks: number;
  hasNote: boolean;
}

export interface TodaySummary {
  pomodoros: number;
  minutes: number;
  completedTasks: number;
}

export interface WeekSummary {
  pomodoros: number;
  minutes: number;
  activeDays: number;
}

// Calendar types
export interface DaySummary {
  date: string; // "YYYY-MM-DD"
  pomodoros: number;
  focusMinutes: number;
  completedTasks: Task[];
  hasNote: boolean;
}

// ============================================================
// AI Coach Types
// ============================================================

// Timer session logged to Supabase for AI analysis
export interface TimerSession {
  id: string;
  user_id: string;
  start_time: string; // ISO timestamp
  end_time?: string; // ISO timestamp
  duration_seconds?: number;
  mode: TimerMode;
  pauses_count: number;
  task_id?: string;
  task_title?: string;
  completed: boolean;
  created_at: string;
}

// AI conversation thread
export interface AIConversation {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

// Individual message in a conversation
export type AIMessageRole = 'user' | 'assistant' | 'system';

export interface AIMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: AIMessageRole;
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// AI-generated insight
export type InsightPeriod = 'session' | 'day' | 'week';

export interface AIInsight {
  id: string;
  user_id: string;
  period: InsightPeriod;
  source_ref?: string; // e.g., session ID or date range
  summary: string;
  observations: AIObservation[];
  recommendations: string[];
  question?: string; // Follow-up question for user
  confidence: number; // 0-1
  raw_context?: Record<string, unknown>;
  created_at: string;
}

export type ObservationType = 'positive' | 'neutral' | 'concern';

export interface AIObservation {
  type: ObservationType;
  text: string;
}

// Context payload sent to AI Coach Edge Function
export interface UserFocusContext {
  // Recent timer sessions (last 7 days)
  recentSessions: {
    date: string;
    completedPomodoros: number;
    totalFocusMinutes: number;
    averageSessionLength: number;
    pausesPerSession: number;
    completionRate: number;
  }[];

  // Task completion data
  taskStats: {
    totalTasks: number;
    completedTasks: number;
    averagePomodorosPerTask: number;
  };

  // Current streak info
  streak: {
    currentDays: number;
    longestDays: number;
  };

  // Today's summary
  today: {
    pomodoros: number;
    focusMinutes: number;
    tasksCompleted: number;
    currentTask?: string;
  };

  // User's local time for context
  localTime: string; // ISO timestamp
  timezone: string;
}

// Response format from AI Coach (structured JSON)
export interface CoachResponse {
  summary: string;
  observations: AIObservation[];
  recommendations: string[];
  question?: string;
  confidence: number;
}

// Chat request payload
export interface CoachChatRequest {
  conversation_id?: string; // Optional, creates new if not provided
  message: string;
  context: UserFocusContext;
}

// Chat response payload
export interface CoachChatResponse {
  conversation_id: string;
  message: AIMessage;
  response: CoachResponse;
}

// Insight generation request
export interface CoachInsightRequest {
  period: InsightPeriod;
  context: UserFocusContext;
  session_id?: string; // For session-level insights
}

// Insight generation response
export interface CoachInsightResponse {
  insight: AIInsight;
}

// Coach store state
export interface CoachState {
  conversations: AIConversation[];
  currentConversation: AIConversation | null;
  messages: AIMessage[];
  insights: AIInsight[];
  isLoading: boolean;
  error: string | null;
}

// Coach store actions
export interface CoachActions {
  loadConversations: () => Promise<void>;
  createConversation: () => Promise<AIConversation>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (message: string, context: UserFocusContext) => Promise<void>;
  loadInsights: (period?: InsightPeriod) => Promise<void>;
  generateInsight: (request: CoachInsightRequest) => Promise<AIInsight>;
  setCurrentConversation: (conversation: AIConversation | null) => void;
  clearError: () => void;
}
