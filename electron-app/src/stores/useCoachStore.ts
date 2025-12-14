import { create } from 'zustand';
import {
  AIConversation,
  AIMessage,
  AIInsight,
  UserFocusContext,
  CoachResponse,
  InsightPeriod,
} from '../types';
import { aiCoachService } from '../services/aiCoach';

interface CoachState {
  // Conversations
  conversations: AIConversation[];
  currentConversation: AIConversation | null;
  messages: AIMessage[];

  // Insights
  insights: AIInsight[];

  // UI state
  isLoading: boolean;
  isSendingMessage: boolean;
  isGeneratingInsight: boolean;
  error: string | null;

  // Last parsed response for display
  lastResponse: CoachResponse | null;
}

interface CoachActions {
  // Conversations
  loadConversations: (userId: string) => Promise<void>;
  setCurrentConversation: (conversation: AIConversation | null) => void;
  loadMessages: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;

  // Chat
  sendMessage: (
    message: string,
    context: UserFocusContext,
    conversationId?: string
  ) => Promise<void>;

  // Insights
  loadInsights: (userId: string, period?: InsightPeriod) => Promise<void>;
  generateInsight: (
    period: InsightPeriod,
    context: UserFocusContext,
    sessionId?: string
  ) => Promise<AIInsight | null>;
  deleteInsight: (insightId: string) => Promise<void>;

  // Error handling
  clearError: () => void;

  // Reset
  reset: () => void;
}

const initialState: CoachState = {
  conversations: [],
  currentConversation: null,
  messages: [],
  insights: [],
  isLoading: false,
  isSendingMessage: false,
  isGeneratingInsight: false,
  error: null,
  lastResponse: null,
};

export const useCoachStore = create<CoachState & CoachActions>()((set, get) => ({
  ...initialState,

  // ============================================================
  // Conversations
  // ============================================================

  loadConversations: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const conversations = await aiCoachService.getConversations(userId);
      set({ conversations, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load conversations',
        isLoading: false,
      });
    }
  },

  setCurrentConversation: (conversation: AIConversation | null) => {
    set({ currentConversation: conversation, messages: [], lastResponse: null });
    if (conversation) {
      get().loadMessages(conversation.id);
    }
  },

  loadMessages: async (conversationId: string) => {
    set({ isLoading: true, error: null });
    try {
      const messages = await aiCoachService.getConversationMessages(conversationId);
      set({ messages, isLoading: false });

      // Parse the last assistant message to show the response
      const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
      if (lastAssistantMsg) {
        try {
          const parsed = JSON.parse(lastAssistantMsg.content);
          set({ lastResponse: parsed });
        } catch {
          // Content wasn't JSON, that's ok
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load messages',
        isLoading: false,
      });
    }
  },

  deleteConversation: async (conversationId: string) => {
    try {
      await aiCoachService.deleteConversation(conversationId);
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== conversationId),
        currentConversation:
          state.currentConversation?.id === conversationId ? null : state.currentConversation,
        messages: state.currentConversation?.id === conversationId ? [] : state.messages,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete conversation',
      });
    }
  },

  // ============================================================
  // Chat
  // ============================================================

  sendMessage: async (
    message: string,
    context: UserFocusContext,
    conversationId?: string
  ) => {
    set({ isSendingMessage: true, error: null });

    // Optimistically add the user message
    const tempUserMessage: AIMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId ?? 'new',
      user_id: '',
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, tempUserMessage],
    }));

    try {
      const response = await aiCoachService.sendChatMessage(
        message,
        context,
        conversationId ?? get().currentConversation?.id
      );

      // Update state with the real conversation and messages
      set((state) => {
        // If this was a new conversation, add it to the list
        const conversationExists = state.conversations.some(
          (c) => c.id === response.conversation_id
        );

        let newConversations = state.conversations;
        if (!conversationExists) {
          const newConversation: AIConversation = {
            id: response.conversation_id,
            user_id: response.message.user_id,
            title: message.substring(0, 50),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          newConversations = [newConversation, ...state.conversations];
        }

        // Replace temp message with real one, add assistant message
        const newMessages = state.messages
          .filter((m) => m.id !== tempUserMessage.id)
          .concat([
            {
              ...tempUserMessage,
              id: `user-${Date.now()}`,
              conversation_id: response.conversation_id,
            },
            response.message,
          ]);

        return {
          conversations: newConversations,
          currentConversation:
            state.currentConversation ?? {
              id: response.conversation_id,
              user_id: response.message.user_id,
              title: message.substring(0, 50),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          messages: newMessages,
          lastResponse: response.response,
          isSendingMessage: false,
        };
      });
    } catch (error) {
      // Remove the optimistic message on error
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== tempUserMessage.id),
        error: error instanceof Error ? error.message : 'Failed to send message',
        isSendingMessage: false,
      }));
    }
  },

  // ============================================================
  // Insights
  // ============================================================

  loadInsights: async (userId: string, period?: InsightPeriod) => {
    set({ isLoading: true, error: null });
    try {
      const insights = await aiCoachService.getInsights(userId, period);
      set({ insights, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load insights',
        isLoading: false,
      });
    }
  },

  generateInsight: async (
    period: InsightPeriod,
    context: UserFocusContext,
    sessionId?: string
  ) => {
    set({ isGeneratingInsight: true, error: null });
    try {
      const response = await aiCoachService.generateInsight(period, context, sessionId);
      set((state) => ({
        insights: [response.insight, ...state.insights],
        isGeneratingInsight: false,
      }));
      return response.insight;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to generate insight',
        isGeneratingInsight: false,
      });
      return null;
    }
  },

  deleteInsight: async (insightId: string) => {
    try {
      await aiCoachService.deleteInsight(insightId);
      set((state) => ({
        insights: state.insights.filter((i) => i.id !== insightId),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete insight',
      });
    }
  },

  // ============================================================
  // Error handling
  // ============================================================

  clearError: () => set({ error: null }),

  // ============================================================
  // Reset
  // ============================================================

  reset: () => set(initialState),
}));
