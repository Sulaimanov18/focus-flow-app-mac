// AI Coach Chat Edge Function
// Handles conversational interactions with the AI coach

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCorsPrelight } from '../_shared/cors.ts';
import { createSupabaseAdmin, getUserFromAuth } from '../_shared/supabase.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';
import {
  COACH_SYSTEM_PROMPT,
  buildContextPrompt,
  buildMemoryPrompt,
  validateMemoryUpdate,
  FocusContext,
  MemoryProfile,
} from '../_shared/coach-prompt.ts';

interface ChatRequest {
  conversation_id?: string;
  message: string;
  context: FocusContext;
}

// Action types the coach can propose
type CoachActionType =
  | 'START_SESSION'
  | 'PAUSE_SESSION'
  | 'RESUME_SESSION'
  | 'STOP_SESSION'
  | 'SET_SESSION_DURATION'
  | 'SET_BACKGROUND_SOUND'
  | 'SET_VOLUME'
  | 'TOGGLE_MIND_LOCK'
  | 'TOGGLE_BREATHING'
  | 'SET_FOCUS_INTENT'
  | 'SUGGEST_SUBTASKS'
  | 'LINK_TASK_TO_TIMER'
  | 'OPEN_REFLECTION'
  | 'LOG_MOOD'
  | 'SAVE_NOTE';

interface CoachAction {
  type: CoachActionType;
  payload: Record<string, unknown>;
}

interface CoachResponse {
  message: string;
  observations: string[];
  recommendations: string[];
  actions: CoachAction[];
  follow_up_question: string | null;
  memory_update: Partial<MemoryProfile> | null;
}

// Validate coach response matches expected schema
function validateCoachResponse(data: unknown): CoachResponse | null {
  if (!data || typeof data !== 'object') return null;

  const obj = data as Record<string, unknown>;

  // Required fields
  if (typeof obj.message !== 'string') return null;
  if (!Array.isArray(obj.observations)) return null;
  if (!Array.isArray(obj.recommendations)) return null;
  if (!Array.isArray(obj.actions)) return null;
  if (obj.follow_up_question !== null && typeof obj.follow_up_question !== 'string') return null;

  // Validate observations are strings
  if (!obj.observations.every((o: unknown) => typeof o === 'string')) return null;

  // Validate recommendations are strings
  if (!obj.recommendations.every((r: unknown) => typeof r === 'string')) return null;

  // Validate actions have type and payload
  const validActionTypes = new Set([
    'START_SESSION', 'PAUSE_SESSION', 'RESUME_SESSION', 'STOP_SESSION', 'SET_SESSION_DURATION',
    'SET_BACKGROUND_SOUND', 'SET_VOLUME', 'TOGGLE_MIND_LOCK', 'TOGGLE_BREATHING',
    'SET_FOCUS_INTENT', 'SUGGEST_SUBTASKS', 'LINK_TASK_TO_TIMER',
    'OPEN_REFLECTION', 'LOG_MOOD', 'SAVE_NOTE'
  ]);

  for (const action of obj.actions as unknown[]) {
    if (!action || typeof action !== 'object') return null;
    const a = action as Record<string, unknown>;
    if (typeof a.type !== 'string' || !validActionTypes.has(a.type)) return null;
    if (!a.payload || typeof a.payload !== 'object') return null;
  }

  // Enforce max 3 actions
  const validatedActions = (obj.actions as CoachAction[]).slice(0, 3);

  // Validate memory_update if present
  const memoryUpdate = obj.memory_update
    ? validateMemoryUpdate(obj.memory_update)
    : null;

  return {
    message: obj.message as string,
    observations: (obj.observations as string[]).slice(0, 3),
    recommendations: (obj.recommendations as string[]).slice(0, 3),
    actions: validatedActions,
    follow_up_question: obj.follow_up_question as string | null,
    memory_update: memoryUpdate,
  };
}

// Safe fallback response when validation fails
function createFallbackResponse(rawMessage?: string): CoachResponse {
  return {
    message: rawMessage || "I'm here to help. What would you like to focus on?",
    observations: [],
    recommendations: [],
    actions: [],
    follow_up_question: null,
    memory_update: null,
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPrelight();
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    const user = await getUserFromAuth(authHeader);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(user.id, 'ai-coach-chat');
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt.toISOString(),
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
          },
        }
      );
    }

    // Parse request body
    const body: ChatRequest = await req.json();
    const { conversation_id, message, context } = body;

    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createSupabaseAdmin();

    // Load user's memory profile
    const { data: profileData } = await supabase
      .from('coach_profiles')
      .select('profile')
      .eq('user_id', user.id)
      .single();

    const userMemory: MemoryProfile | null = profileData?.profile || null;

    // Get or create conversation
    let conversationId = conversation_id;
    if (!conversationId) {
      const { data: newConversation, error: convError } = await supabase
        .from('ai_conversations')
        .insert({ user_id: user.id, title: message.substring(0, 50) })
        .select()
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        throw new Error('Failed to create conversation');
      }
      conversationId = newConversation.id;
    }

    // Load conversation history
    const { data: history } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20); // Last 20 messages for context

    // Build messages array for OpenAI
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: COACH_SYSTEM_PROMPT },
      { role: 'system', content: buildMemoryPrompt(userMemory) },
      { role: 'system', content: buildContextPrompt(context) },
    ];

    // Add conversation history
    if (history) {
      for (const msg of history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add the new user message
    messages.push({ role: 'user', content: message });

    // Call OpenAI API
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error('AI service temporarily unavailable');
    }

    const openaiData = await openaiResponse.json();
    const assistantContent = openaiData.choices[0]?.message?.content;

    if (!assistantContent) {
      throw new Error('No response from AI');
    }

    // Parse and validate the JSON response
    let coachResponse: CoachResponse;
    try {
      const parsed = JSON.parse(assistantContent);
      const validated = validateCoachResponse(parsed);
      if (validated) {
        coachResponse = validated;
      } else {
        console.warn('AI response failed validation:', assistantContent);
        // Try to extract message if it exists, otherwise use raw content
        const message = typeof parsed?.message === 'string' ? parsed.message : assistantContent;
        coachResponse = createFallbackResponse(message);
      }
    } catch {
      console.error('Failed to parse AI response as JSON:', assistantContent);
      coachResponse = createFallbackResponse();
    }

    // Handle memory update if present
    if (coachResponse.memory_update && Object.keys(coachResponse.memory_update).length > 0) {
      const updatedMemory: MemoryProfile = {
        ...(userMemory || {}),
        ...coachResponse.memory_update,
      };

      // Upsert the memory profile
      const { error: memoryError } = await supabase
        .from('coach_profiles')
        .upsert(
          {
            user_id: user.id,
            profile: updatedMemory,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (memoryError) {
        console.error('Error updating memory profile:', memoryError);
      } else {
        console.log('Memory profile updated:', coachResponse.memory_update);
      }
    }

    // Save user message to database
    const { error: userMsgError } = await supabase.from('ai_messages').insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: 'user',
      content: message,
    });

    if (userMsgError) {
      console.error('Error saving user message:', userMsgError);
    }

    // Save assistant message to database
    const { data: assistantMessage, error: assistantMsgError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: 'assistant',
        content: JSON.stringify(coachResponse),
        metadata: { raw_response: assistantContent },
      })
      .select()
      .single();

    if (assistantMsgError) {
      console.error('Error saving assistant message:', assistantMsgError);
    }

    // Update conversation timestamp
    await supabase
      .from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return new Response(
      JSON.stringify({
        conversation_id: conversationId,
        message: assistantMessage,
        response: coachResponse,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  } catch (error) {
    console.error('Error in ai-coach-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
