import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[v0] Missing Supabase environment variables:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
}

export const supabase = createClient(supabaseUrl, supabaseKey);
