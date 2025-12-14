import { createSupabaseAdmin } from './supabase.ts';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // milliseconds
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'ai-coach-chat': { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour
  'ai-coach-generate-insight': { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
};

export async function checkRateLimit(
  userId: string,
  endpoint: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const config = RATE_LIMITS[endpoint] ?? { maxRequests: 10, windowMs: 60 * 60 * 1000 };
  const supabase = createSupabaseAdmin();

  // Get or create rate limit record
  const { data: existing } = await supabase
    .from('ai_rate_limits')
    .select('*')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .single();

  const now = new Date();
  const windowStart = existing?.window_start ? new Date(existing.window_start) : now;
  const windowEnd = new Date(windowStart.getTime() + config.windowMs);

  // Check if we're in a new window
  if (now >= windowEnd) {
    // Reset the window
    await supabase.from('ai_rate_limits').upsert({
      user_id: userId,
      endpoint,
      request_count: 1,
      window_start: now.toISOString(),
    }, { onConflict: 'user_id,endpoint' });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now.getTime() + config.windowMs),
    };
  }

  // Check if we've exceeded the limit
  const currentCount = existing?.request_count ?? 0;
  if (currentCount >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: windowEnd,
    };
  }

  // Increment the counter
  await supabase
    .from('ai_rate_limits')
    .update({ request_count: currentCount + 1 })
    .eq('user_id', userId)
    .eq('endpoint', endpoint);

  return {
    allowed: true,
    remaining: config.maxRequests - currentCount - 1,
    resetAt: windowEnd,
  };
}
