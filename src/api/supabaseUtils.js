// Supabase Backend Utilities
// Common functions for database operations with error handling

import { supabase } from './supabase';

/**
 * Safely execute a database operation with error handling
 */
export const executeQuery = async (operation, operationName = 'Database Operation') => {
  try {
    console.log(`[v0] Executing: ${operationName}`);
    const result = await operation();
    
    if (result.error) {
      console.error(`[v0] ${operationName} error:`, result.error);
      return { success: false, error: result.error.message, data: null };
    }

    console.log(`[v0] ${operationName} success`);
    return { success: true, error: null, data: result.data };
  } catch (err) {
    console.error(`[v0] ${operationName} exception:`, err);
    return { success: false, error: err.message, data: null };
  }
};

/**
 * Get paginated results from a table
 */
export const getPaginatedData = async (tableName, page = 1, pageSize = 20, filters = {}) => {
  const offset = (page - 1) * pageSize;

  return executeQuery(async () => {
    let query = supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .range(offset, offset + pageSize - 1);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        query = query.eq(key, value);
      }
    });

    return query;
  }, `Get paginated data from ${tableName}`);
};

/**
 * Search records in a table
 */
export const searchRecords = async (tableName, searchField, searchValue) => {
  return executeQuery(async () => {
    return supabase
      .from(tableName)
      .select('*')
      .ilike(searchField, `%${searchValue}%`);
  }, `Search ${tableName} for ${searchValue}`);
};

/**
 * Get a single record by ID
 */
export const getRecordById = async (tableName, id) => {
  return executeQuery(async () => {
    return supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();
  }, `Get ${tableName} record by ID`);
};

/**
 * Create a new record
 */
export const createRecord = async (tableName, record) => {
  return executeQuery(async () => {
    return supabase
      .from(tableName)
      .insert([record])
      .select();
  }, `Create record in ${tableName}`);
};

/**
 * Update a record
 */
export const updateRecord = async (tableName, id, updates) => {
  return executeQuery(async () => {
    return supabase
      .from(tableName)
      .update(updates)
      .eq('id', id)
      .select();
  }, `Update record in ${tableName}`);
};

/**
 * Delete a record
 */
export const deleteRecord = async (tableName, id) => {
  return executeQuery(async () => {
    return supabase
      .from(tableName)
      .delete()
      .eq('id', id);
  }, `Delete record from ${tableName}`);
};

/**
 * Get aggregate data (sum, count, avg, etc.)
 */
export const getAggregateData = async (tableName, aggregateField, aggregateFunction = 'count') => {
  return executeQuery(async () => {
    return supabase
      .from(tableName)
      .select(aggregateField, { count: aggregateFunction });
  }, `Get ${aggregateFunction} of ${aggregateField} from ${tableName}`);
};

/**
 * Batch insert multiple records
 */
export const batchInsertRecords = async (tableName, records) => {
  return executeQuery(async () => {
    return supabase
      .from(tableName)
      .insert(records)
      .select();
  }, `Batch insert ${records.length} records into ${tableName}`);
};

/**
 * Perform a transaction-like operation with multiple queries
 */
export const executeMultipleQueries = async (operations) => {
  console.log('[v0] Executing multiple queries in sequence');
  const results = [];

  for (const op of operations) {
    const result = await executeQuery(op.operation, op.name);
    results.push(result);

    // Stop on first error if strictMode is enabled
    if (!result.success && op.strictMode) {
      console.error('[v0] Operation failed in strict mode, stopping execution');
      break;
    }
  }

  return results;
};

/**
 * Subscribe to real-time changes
 */
export const subscribeToChanges = (tableName, onChangeCallback, eventType = '*') => {
  console.log(`[v0] Subscribing to ${tableName} changes`);

  const subscription = supabase
    .channel(`${tableName}-${eventType}`)
    .on(
      'postgres_changes',
      {
        event: eventType,
        schema: 'public',
        table: tableName,
      },
      (payload) => {
        console.log(`[v0] Real-time update on ${tableName}:`, payload);
        onChangeCallback(payload);
      }
    )
    .subscribe((status) => {
      console.log(`[v0] Subscription status for ${tableName}:`, status);
    });

  return subscription;
};

/**
 * Unsubscribe from real-time changes
 */
export const unsubscribeFromChanges = (subscription) => {
  console.log('[v0] Unsubscribing from real-time changes');
  return supabase.removeChannel(subscription);
};

/**
 * Execute a raw SQL query (admin only)
 */
export const executeRawQuery = async (sqlQuery) => {
  return executeQuery(async () => {
    return supabase.rpc('execute_raw_sql', { sql: sqlQuery });
  }, 'Execute raw SQL query');
};

/**
 * Get database health status
 */
export const getHealthStatus = async () => {
  console.log('[v0] Checking Supabase health status');

  const results = {
    auth: null,
    database: null,
    realtime: null,
  };

  // Check auth
  try {
    const { data, error } = await supabase.auth.getSession();
    results.auth = error ? { status: 'error', message: error.message } : { status: 'ok' };
  } catch (err) {
    results.auth = { status: 'error', message: err.message };
  }

  // Check database
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('count', { count: 'exact', head: true });
    results.database = error ? { status: 'error', message: error.message } : { status: 'ok' };
  } catch (err) {
    results.database = { status: 'error', message: err.message };
  }

  console.log('[v0] Health status:', results);
  return results;
};

export default {
  executeQuery,
  getPaginatedData,
  searchRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
  getAggregateData,
  batchInsertRecords,
  executeMultipleQueries,
  subscribeToChanges,
  unsubscribeFromChanges,
  executeRawQuery,
  getHealthStatus,
};
