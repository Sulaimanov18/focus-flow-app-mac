# AI Coach Feature Setup Guide

This guide walks you through deploying the AI Coach feature for CapyFocus.

## Prerequisites

- Supabase project set up and running
- Supabase CLI installed (`brew install supabase/tap/supabase`)
- OpenAI API key

## 1. Run Database Migrations

Apply the SQL migration to create the required tables:

```bash
# Option A: Via Supabase CLI
supabase db push

# Option B: Via Supabase Dashboard
# 1. Go to SQL Editor
# 2. Copy contents of supabase/migrations/001_ai_coach_tables.sql
# 3. Run the query
```

This creates:
- `timer_sessions` - Tracks focus session data
- `ai_conversations` - Stores chat threads
- `ai_messages` - Individual messages in conversations
- `ai_insights` - AI-generated insights
- `ai_rate_limits` - Rate limiting per user/endpoint

## 2. Deploy Edge Functions

```bash
# Navigate to the supabase directory
cd /path/to/focus-flow-app-mac/supabase

# Deploy both functions
supabase functions deploy ai-coach-chat
supabase functions deploy ai-coach-generate-insight
```

## 3. Configure Environment Variables

Set the OpenAI API key in Supabase:

```bash
# Via CLI
supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key

# Or via Supabase Dashboard:
# Settings > Edge Functions > Secrets
# Add: OPENAI_API_KEY = sk-your-openai-api-key
```

## 4. Verify RLS Policies

The migration includes Row Level Security policies. Verify they're active:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('timer_sessions', 'ai_conversations', 'ai_messages', 'ai_insights', 'ai_rate_limits');
```

All should show `rowsecurity = true`.

## 5. Test the Integration

### Test Chat Endpoint

```bash
# Get your user's JWT token from the app (stored in localStorage as sb-{project-ref}-auth-token)

curl -X POST 'https://arywfvsmpmdphnbfzltu.supabase.co/functions/v1/ai-coach-chat' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "How am I doing today?",
    "context": {
      "recentSessions": [],
      "taskStats": {"totalTasks": 5, "completedTasks": 2, "averagePomodorosPerTask": 1.5},
      "streak": {"currentDays": 3, "longestDays": 7},
      "today": {"pomodoros": 4, "focusMinutes": 100, "tasksCompleted": 2},
      "localTime": "2024-12-14T15:00:00Z",
      "timezone": "America/New_York"
    }
  }'
```

### Test Insight Generation

```bash
curl -X POST 'https://arywfvsmpmdphnbfzltu.supabase.co/functions/v1/ai-coach-generate-insight' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "period": "day",
    "context": {
      "recentSessions": [],
      "taskStats": {"totalTasks": 5, "completedTasks": 2, "averagePomodorosPerTask": 1.5},
      "streak": {"currentDays": 3, "longestDays": 7},
      "today": {"pomodoros": 4, "focusMinutes": 100, "tasksCompleted": 2},
      "localTime": "2024-12-14T15:00:00Z",
      "timezone": "America/New_York"
    }
  }'
```

## Rate Limits

Default rate limits (configurable in `_shared/rate-limit.ts`):
- `ai-coach-chat`: 20 requests per hour
- `ai-coach-generate-insight`: 10 requests per hour

## Troubleshooting

### "Unauthorized" error
- Verify the user is logged in
- Check the JWT token is being passed correctly

### "Rate limit exceeded"
- Wait for the rate limit window to reset
- Check `ai_rate_limits` table for current counts

### "AI service temporarily unavailable"
- Verify OPENAI_API_KEY is set correctly
- Check Edge Function logs in Supabase dashboard

### "Failed to create conversation"
- Verify RLS policies allow INSERT for the user
- Check `auth.uid()` matches the user_id

## Files Reference

```
electron-app/src/
├── types/index.ts              # AI Coach type definitions
├── services/aiCoach.ts         # API client for Edge Functions
├── stores/useCoachStore.ts     # Zustand state management
└── components/Coach/
    └── CoachView.tsx           # Main Coach UI component

supabase/
├── migrations/
│   └── 001_ai_coach_tables.sql # Database schema
└── functions/
    ├── _shared/
    │   ├── cors.ts             # CORS headers
    │   ├── supabase.ts         # Supabase client helpers
    │   ├── rate-limit.ts       # Rate limiting logic
    │   └── coach-prompt.ts     # AI prompts and context builder
    ├── ai-coach-chat/
    │   └── index.ts            # Chat endpoint
    └── ai-coach-generate-insight/
        └── index.ts            # Insight generation endpoint
```

## Next Steps

1. **Timer Session Logging**: Integrate `aiCoachService.logTimerSession()` calls in the timer hook to automatically track focus sessions.

2. **Customize Rate Limits**: Adjust limits in `_shared/rate-limit.ts` based on your usage patterns and OpenAI budget.

3. **Add More Insight Triggers**: Consider auto-generating insights after completing sessions or at end of day.
