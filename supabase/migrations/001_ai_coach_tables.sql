-- AI Coach Feature: Database Schema Migration
-- Run this in Supabase SQL Editor or via supabase db push

-- ============================================================
-- 1. Timer Sessions Table (for tracking focus data)
-- ============================================================
CREATE TABLE IF NOT EXISTS timer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    mode TEXT NOT NULL CHECK (mode IN ('pomodoro', 'shortBreak', 'longBreak')),
    pauses_count INTEGER DEFAULT 0,
    task_id TEXT,
    task_title TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient user queries
CREATE INDEX IF NOT EXISTS idx_timer_sessions_user_id ON timer_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_timer_sessions_start_time ON timer_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_timer_sessions_user_date ON timer_sessions(user_id, start_time DESC);

-- RLS Policy: Users can only access their own sessions
ALTER TABLE timer_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own timer sessions" ON timer_sessions;
CREATE POLICY "Users can view own timer sessions" ON timer_sessions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own timer sessions" ON timer_sessions;
CREATE POLICY "Users can insert own timer sessions" ON timer_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own timer sessions" ON timer_sessions;
CREATE POLICY "Users can update own timer sessions" ON timer_sessions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own timer sessions" ON timer_sessions;
CREATE POLICY "Users can delete own timer sessions" ON timer_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 2. AI Conversations Table
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated_at ON ai_conversations(updated_at DESC);

-- RLS Policy
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversations" ON ai_conversations;
CREATE POLICY "Users can view own conversations" ON ai_conversations
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own conversations" ON ai_conversations;
CREATE POLICY "Users can insert own conversations" ON ai_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON ai_conversations;
CREATE POLICY "Users can update own conversations" ON ai_conversations
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON ai_conversations;
CREATE POLICY "Users can delete own conversations" ON ai_conversations
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 3. AI Messages Table
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_user_id ON ai_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON ai_messages(created_at);

-- RLS Policy
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own messages" ON ai_messages;
CREATE POLICY "Users can view own messages" ON ai_messages
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own messages" ON ai_messages;
CREATE POLICY "Users can insert own messages" ON ai_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. AI Insights Table
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period TEXT NOT NULL CHECK (period IN ('session', 'day', 'week')),
    source_ref TEXT,
    summary TEXT NOT NULL,
    observations JSONB NOT NULL DEFAULT '[]',
    recommendations JSONB NOT NULL DEFAULT '[]',
    question TEXT,
    confidence FLOAT DEFAULT 0.5,
    raw_context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_period ON ai_insights(period);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON ai_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_period ON ai_insights(user_id, period, created_at DESC);

-- RLS Policy
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own insights" ON ai_insights;
CREATE POLICY "Users can view own insights" ON ai_insights
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own insights" ON ai_insights;
CREATE POLICY "Users can insert own insights" ON ai_insights
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own insights" ON ai_insights;
CREATE POLICY "Users can delete own insights" ON ai_insights
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 5. Rate Limiting Table
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_user_endpoint ON ai_rate_limits(user_id, endpoint);

-- RLS Policy
ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own rate limits" ON ai_rate_limits;
CREATE POLICY "Users can view own rate limits" ON ai_rate_limits
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own rate limits" ON ai_rate_limits;
CREATE POLICY "Users can insert own rate limits" ON ai_rate_limits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own rate limits" ON ai_rate_limits;
CREATE POLICY "Users can update own rate limits" ON ai_rate_limits
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- 6. Helper function to update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ai_conversations
DROP TRIGGER IF EXISTS update_ai_conversations_updated_at ON ai_conversations;
CREATE TRIGGER update_ai_conversations_updated_at
    BEFORE UPDATE ON ai_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. Grants for service role (Edge Functions)
-- ============================================================
-- Service role has full access by default, but we explicitly grant for clarity
GRANT ALL ON timer_sessions TO service_role;
GRANT ALL ON ai_conversations TO service_role;
GRANT ALL ON ai_messages TO service_role;
GRANT ALL ON ai_insights TO service_role;
GRANT ALL ON ai_rate_limits TO service_role;
