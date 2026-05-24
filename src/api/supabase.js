import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[v0] Missing Supabase environment variables - using fallback. URL:', !!supabaseUrl, 'KEY:', !!supabaseKey);
}

// Create a safe client even if vars are missing (for graceful degradation)
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : {
      auth: {
        getUser: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
        onAuthStateChange: (callback) => { callback('SIGNED_OUT', null); return { data: { subscription: null } }; },
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ error: new Error('Supabase not configured') }),
        signUp: async () => ({ error: new Error('Supabase not configured') }),
      },
      from: (table) => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
        insert: () => ({ select: () => Promise.resolve({ data: null, error: null }) }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      }),
      channel: () => ({
        on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
      }),
    };
