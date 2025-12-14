-- Coach Memory Profiles
-- Stores personalized memory for the AI Coach to provide context-aware responses

-- Create the coach_profiles table
CREATE TABLE IF NOT EXISTS public.coach_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT their own profile
CREATE POLICY "Users can view own coach profile"
  ON public.coach_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can INSERT their own profile
CREATE POLICY "Users can create own coach profile"
  ON public.coach_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can UPDATE their own profile
CREATE POLICY "Users can update own coach profile"
  ON public.coach_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_coach_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coach_profiles_updated_at
  BEFORE UPDATE ON public.coach_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_coach_profile_updated_at();

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_coach_profiles_user_id ON public.coach_profiles(user_id);

-- Comment for documentation
COMMENT ON TABLE public.coach_profiles IS 'Stores AI Coach memory profiles for personalized responses';
COMMENT ON COLUMN public.coach_profiles.profile IS 'JSONB containing memory fields: primary_goal, focus_style, best_session_length_min, common_distractions, best_time_of_day, preferred_tone, last_updated_reason';
