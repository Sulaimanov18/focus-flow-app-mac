import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Create Supabase client with service role for admin operations
export function createSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

// Create Supabase client scoped to user's JWT
export function createSupabaseClient(authHeader: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );
}

// Extract and validate user from JWT
export async function getUserFromAuth(authHeader: string | null): Promise<{ id: string; email: string } | null> {
  if (!authHeader) return null;

  const supabase = createSupabaseClient(authHeader);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return null;

  return {
    id: user.id,
    email: user.email ?? '',
  };
}
