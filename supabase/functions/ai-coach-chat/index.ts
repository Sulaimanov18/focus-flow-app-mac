// AI Coach Chat Edge Function
// Handles conversational interactions with the AI coach

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCorsPrelight } from '../_shared/cors.ts';
import { createSupabaseAdmin, getUserFromAuth } from '../_shared/supabase.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';
import { COACH_SYSTEM_PROMPT, buildContextPrompt, FocusContext } from '../_shared/coach-prompt.ts';

interface ChatRequest {
  conversation_id?: string;
  message: string;
  context: FocusContext;
}

interface CoachResponse {
  summary: string;
  observations: Array<{ type: 'positive' | 'neutral' | 'concern'; text: string }>;
  recommendations: string[];
  question?: string;
  confidence: number;
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

    // Parse the JSON response
    let coachResponse: CoachResponse;
    try {
      coachResponse = JSON.parse(assistantContent);
    } catch {
      console.error('Failed to parse AI response:', assistantContent);
      // Fallback response
      coachResponse = {
        summary: assistantContent,
        observations: [],
        recommendations: [],
        confidence: 0.5,
      };
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
