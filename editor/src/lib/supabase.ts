import { createClient } from '@supabase/supabase-js';

// Browser-safe client — uses publishable key (safe to expose via NEXT_PUBLIC_)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

// Server-only client — uses secret key (never expose to browser)
// Import this only in Server Components, API routes, or Server Actions
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Ensure this doesn't leak into the browser
    process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
