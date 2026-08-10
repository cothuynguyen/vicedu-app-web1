import { createBrowserClient } from '@supabase/ssr';

// Client duy nhất dùng cookie để quản lý session - nhất quán với AuthContext
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export const getSupabase = () => {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabaseInstance;
};

// Alias để backward-compatible với code cũ dùng `import { supabase } from '@/lib/supabase'`
export const supabase = getSupabase();
