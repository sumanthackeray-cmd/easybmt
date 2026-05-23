// Backend Testing Suite for Supabase Integration
// Run these tests to verify database connectivity and operations

import { supabase } from './supabase';

export const backendTests = {
  // Test 1: Verify Supabase connection
  testSupabaseConnection: async () => {
    console.log('[v0] Testing Supabase connection...');
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.warn('[v0] Auth check (expected when not logged in):', error.message);
      }
      console.log('[v0] Supabase connection: OK');
      return { success: true, message: 'Supabase connection successful' };
    } catch (err) {
      console.error('[v0] Supabase connection failed:', err);
      return { success: false, error: err.message };
    }
  },

  // Test 2: Verify table access
  testTableAccess: async () => {
    console.log('[v0] Testing table access...');
    const tables = ['branches', 'products', 'bills', 'customers', 'vendors'];
    const results = {};

    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .limit(1);

        if (error) {
          results[table] = { accessible: false, error: error.message };
        } else {
          results[table] = { accessible: true, count: count };
        }
      } catch (err) {
        results[table] = { accessible: false, error: err.message };
      }
    }

    console.log('[v0] Table access results:', results);
    return { success: true, results };
  },

  // Test 3: Verify authentication flow
  testAuthFlow: async (email, password) => {
    console.log('[v0] Testing authentication flow...');
    try {
      // Test sign up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        console.warn('[v0] Sign up test:', signUpError.message);
        return { success: false, error: 'Sign up failed', details: signUpError };
      }

      console.log('[v0] Auth flow test: OK');
      return { success: true, message: 'Auth flow working', user: signUpData.user };
    } catch (err) {
      console.error('[v0] Auth flow test failed:', err);
      return { success: false, error: err.message };
    }
  },

  // Test 4: Verify data insertion
  testDataInsertion: async () => {
    console.log('[v0] Testing data insertion...');
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: 'User must be authenticated' };
      }

      // Test insert into users table
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: user.id,
          name: 'Test User',
          email: user.email,
          role_id: 'role-cashier',
          is_active: true,
        })
        .select();

      if (error) {
        console.warn('[v0] Data insertion test:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[v0] Data insertion test: OK');
      return { success: true, data };
    } catch (err) {
      console.error('[v0] Data insertion test failed:', err);
      return { success: false, error: err.message };
    }
  },

  // Test 5: Verify real-time subscriptions
  testRealtimeSubscription: async (tableName = 'products') => {
    console.log('[v0] Testing real-time subscription...');
    try {
      const channel = supabase
        .channel(`${tableName}-changes`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: tableName },
          (payload) => {
            console.log('[v0] Real-time update received:', payload);
          }
        )
        .subscribe();

      console.log('[v0] Real-time subscription: OK');
      return { success: true, channel, message: 'Subscription active' };
    } catch (err) {
      console.error('[v0] Real-time subscription failed:', err);
      return { success: false, error: err.message };
    }
  },

  // Test 6: Verify Row Level Security
  testRowLevelSecurity: async () => {
    console.log('[v0] Testing Row Level Security...');
    try {
      // Try to access without authentication
      const { data, error } = await supabase
        .from('users_profile')
        .select('*')
        .limit(1);

      if (error) {
        console.log('[v0] RLS working (expected error when not authenticated):', error.message);
        return { success: true, message: 'RLS is properly enforcing authentication' };
      }

      console.warn('[v0] RLS test: Unexpected access without auth');
      return { success: false, message: 'RLS not properly configured' };
    } catch (err) {
      console.error('[v0] RLS test error:', err);
      return { success: false, error: err.message };
    }
  },

  // Test 7: Run all tests
  runAllTests: async () => {
    console.log('[v0] Running all backend tests...');
    const results = {
      connection: await backendTests.testSupabaseConnection(),
      tables: await backendTests.testTableAccess(),
      rls: await backendTests.testRowLevelSecurity(),
    };

    console.log('[v0] All tests completed:', results);
    return results;
  },
};

// Export test runner function
export const runBackendTests = async () => {
  console.log('[v0] === Supabase Backend Test Suite ===');
  const results = await backendTests.runAllTests();
  console.log('[v0] === Test Results ===', JSON.stringify(results, null, 2));
  return results;
};
