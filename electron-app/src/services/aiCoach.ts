import { supabase } from './supabase';
import {
  AIConversation,
  AIMessage,
  AIInsight,
  TimerSession,
  UserFocusContext,
  CoachResponse,
  CoachChatResponse,
  CoachInsightResponse,
  InsightPeriod,
  TimerMode,
  MemoryProfile,
} from '../types';

const isDev = import.meta.env.DEV;

const SUPABASE_URL = 'https://arywfvsmpmdphnbfzltu.supabase.co';

export class AICoachService {
  // ============================================================
  // Memory Profile (dev debugging only)
  // ============================================================

  /**
   * Fetch the current user's memory profile from Supabase.
   * This is primarily for dev debugging - memory is managed server-side.
   */
  async getMemoryProfile(userId: string): Promise<MemoryProfile | null> {
    const { data, error } = await supabase
      .from('coach_profiles')
      .select('profile')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is expected for new users
        console.error('Error fetching memory profile:', error);
      }
      return null;
    }

    if (isDev && data?.profile) {
      console.log('[AICoach] Memory profile loaded:', data.profile);
    }

    return data?.profile || null;
  }

  // ============================================================
  // Timer Session Logging
  // ============================================================

  async logTimerSession(session: Omit<TimerSession, 'id' | 'created_at'>): Promise<TimerSession | null> {
    const { data, error } = await supabase
      .from('timer_sessions')
      .insert(session)
      .select()
      .single();

    if (error) {
      console.error('Error logging timer session:', error);
      return null;
    }

    return data;
  }

  async updateTimerSession(
    sessionId: string,
    updates: Partial<Pick<TimerSession, 'end_time' | 'duration_seconds' | 'pauses_count' | 'completed'>>
  ): Promise<void> {
    const { error } = await supabase
      .from('timer_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating timer session:', error);
    }
  }

  async getRecentSessions(userId: string, days: number = 7): Promise<TimerSession[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('timer_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', startDate.toISOString())
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching recent sessions:', error);
      return [];
    }

    return data || [];
  }

  // ============================================================
  // Conversations
  // ============================================================

  async getConversations(userId: string): Promise<AIConversation[]> {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }

    return data || [];
  }

  async getConversationMessages(conversationId: string): Promise<AIMessage[]> {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return data || [];
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  // ============================================================
  // Insights
  // ============================================================

  async getInsights(userId: string, period?: InsightPeriod): Promise<AIInsight[]> {
    let query = supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (period) {
      query = query.eq('period', period);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching insights:', error);
      return [];
    }

    return data || [];
  }

  async deleteInsight(insightId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_insights')
      .delete()
      .eq('id', insightId);

    if (error) {
      console.error('Error deleting insight:', error);
      throw error;
    }
  }

  // ============================================================
  // Edge Function Calls
  // ============================================================

  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async sendChatMessage(
    message: string,
    context: UserFocusContext,
    conversationId?: string
  ): Promise<CoachChatResponse> {
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-coach-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        message,
        context,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 429) {
        throw new Error(`Rate limit exceeded. Try again at ${error.resetAt}`);
      }
      throw new Error(error.error || 'Failed to send message');
    }

    return response.json();
  }

  async generateInsight(
    period: InsightPeriod,
    context: UserFocusContext,
    sessionId?: string
  ): Promise<CoachInsightResponse> {
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-coach-generate-insight`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        period,
        context,
        session_id: sessionId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 429) {
        throw new Error(`Rate limit exceeded. Try again at ${error.resetAt}`);
      }
      throw new Error(error.error || 'Failed to generate insight');
    }

    return response.json();
  }

  // ============================================================
  // Context Builder
  // ============================================================

  async buildFocusContext(
    userId: string,
    tasks: { id: string; title: string; isCompleted: boolean; spentPomodoros: number }[],
    todayStats: { pomodoros: number; focusMinutes: number; tasksCompleted: number },
    currentTask?: string
  ): Promise<UserFocusContext> {
    // Fetch recent sessions from Supabase
    const sessions = await this.getRecentSessions(userId, 7);

    // Group sessions by date
    const sessionsByDate = new Map<string, TimerSession[]>();
    for (const session of sessions) {
      const date = session.start_time.split('T')[0];
      if (!sessionsByDate.has(date)) {
        sessionsByDate.set(date, []);
      }
      sessionsByDate.get(date)!.push(session);
    }

    // Calculate daily stats
    const recentSessions = Array.from(sessionsByDate.entries()).map(([date, daySessions]) => {
      const pomodoroSessions = daySessions.filter(s => s.mode === 'pomodoro');
      const completedPomodoros = pomodoroSessions.filter(s => s.completed).length;
      const totalFocusMinutes = pomodoroSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60;
      const avgSessionLength = pomodoroSessions.length > 0
        ? totalFocusMinutes / pomodoroSessions.length
        : 0;
      const avgPauses = pomodoroSessions.length > 0
        ? pomodoroSessions.reduce((sum, s) => sum + s.pauses_count, 0) / pomodoroSessions.length
        : 0;
      const completionRate = pomodoroSessions.length > 0
        ? completedPomodoros / pomodoroSessions.length
        : 0;

      return {
        date,
        completedPomodoros,
        totalFocusMinutes: Math.round(totalFocusMinutes),
        averageSessionLength: Math.round(avgSessionLength),
        pausesPerSession: Math.round(avgPauses * 10) / 10,
        completionRate: Math.round(completionRate * 100) / 100,
      };
    });

    // Calculate task stats
    const completedTasks = tasks.filter(t => t.isCompleted);
    const avgPomodoros = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + t.spentPomodoros, 0) / completedTasks.length
      : 0;

    // Calculate streak (consecutive days with activity)
    const sortedDates = Array.from(sessionsByDate.keys()).sort().reverse();
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < sortedDates.length; i++) {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expected = expectedDate.toISOString().split('T')[0];

      if (sortedDates.includes(expected)) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      recentSessions,
      taskStats: {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        averagePomodorosPerTask: Math.round(avgPomodoros * 10) / 10,
      },
      streak: {
        currentDays: currentStreak,
        longestDays: currentStreak, // TODO: Track longest streak in user profile
      },
      today: {
        pomodoros: todayStats.pomodoros,
        focusMinutes: todayStats.focusMinutes,
        tasksCompleted: todayStats.tasksCompleted,
        currentTask,
      },
      localTime: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }
}

export const aiCoachService = new AICoachService();
