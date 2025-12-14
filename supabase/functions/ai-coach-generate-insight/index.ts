// AI Coach Generate Insight Edge Function
// Generates structured insights for session/day/week summaries

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCorsPrelight } from '../_shared/cors.ts';
import { createSupabaseAdmin, getUserFromAuth } from '../_shared/supabase.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';
import {
  INSIGHT_SYSTEM_PROMPT,
  buildContextPrompt,
  buildMemoryPrompt,
  validateMemoryUpdate,
  FocusContext,
  MemoryProfile,
} from '../_shared/coach-prompt.ts';

type InsightPeriod = 'session' | 'day' | 'week';

interface InsightRequest {
  period: InsightPeriod;
  context: FocusContext;
  session_id?: string;
}

interface InsightResponse {
  summary: string;
  observations: Array<{ type: 'positive' | 'neutral' | 'concern'; text: string }>;
  recommendations: string[];
  question?: string;
  confidence: number;
  memory_update?: Partial<MemoryProfile> | null;
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
    const rateLimit = await checkRateLimit(user.id, 'ai-coach-generate-insight');
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
    const body: InsightRequest = await req.json();
    const { period, context, session_id } = body;

    if (!period || !['session', 'day', 'week'].includes(period)) {
      return new Response(
        JSON.stringify({ error: 'Invalid period. Must be session, day, or week.' }),
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

    // Build period-specific prompt
    let periodPrompt = '';
    switch (period) {
      case 'session':
        periodPrompt = `Generate an insight for a single focus session.${session_id ? ` Session ID: ${session_id}` : ''}
Focus on:
- How this session went compared to typical sessions
- Any notable patterns (pauses, duration, completion)
- Quick actionable suggestion for the next session`;
        break;
      case 'day':
        periodPrompt = `Generate a daily insight summary.
Focus on:
- Overall productivity for today
- Patterns in focus/break timing
- Task completion progress
- Suggestion for tomorrow`;
        break;
      case 'week':
        periodPrompt = `Generate a weekly insight summary.
Focus on:
- Weekly trends and patterns
- Best performing days/times
- Areas of improvement
- Goals or challenges for next week`;
        break;
    }

    // Build messages for OpenAI
    const messages = [
      { role: 'system', content: INSIGHT_SYSTEM_PROMPT },
      { role: 'system', content: buildMemoryPrompt(userMemory) },
      { role: 'system', content: buildContextPrompt(context) },
      { role: 'user', content: periodPrompt },
    ];

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
        temperature: 0.6,
        max_tokens: 800,
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
    let insightResponse: InsightResponse;
    try {
      insightResponse = JSON.parse(assistantContent);
    } catch {
      console.error('Failed to parse AI response:', assistantContent);
      insightResponse = {
        summary: assistantContent,
        observations: [],
        recommendations: [],
        confidence: 0.5,
      };
    }

    // Handle memory_update if present
    const validatedMemoryUpdate = insightResponse.memory_update
      ? validateMemoryUpdate(insightResponse.memory_update)
      : null;

    if (validatedMemoryUpdate && Object.keys(validatedMemoryUpdate).length > 0) {
      const updatedMemory: MemoryProfile = {
        ...(userMemory || {}),
        ...validatedMemoryUpdate,
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
        console.error('Error updating memory profile from insight:', memoryError);
      } else {
        console.log('Memory profile updated from insight:', validatedMemoryUpdate);
      }
    }

    // Save insight to database
    const { data: insight, error: insertError } = await supabase
      .from('ai_insights')
      .insert({
        user_id: user.id,
        period,
        source_ref: session_id || new Date().toISOString().split('T')[0],
        summary: insightResponse.summary,
        observations: insightResponse.observations,
        recommendations: insightResponse.recommendations,
        question: insightResponse.question,
        confidence: insightResponse.confidence,
        raw_context: context,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving insight:', insertError);
      throw new Error('Failed to save insight');
    }

    return new Response(
      JSON.stringify({ insight }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  } catch (error) {
    console.error('Error in ai-coach-generate-insight:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
