# EasyBMT Supabase Backend API Reference

## Overview

Complete backend API documentation for the EasyBMT billing and management system running on Supabase PostgreSQL.

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [API Modules](#api-modules)
3. [Core Functions](#core-functions)
4. [Authentication](#authentication)
5. [Error Handling](#error-handling)
6. [Examples](#examples)

---

## Database Schema

### 21 PostgreSQL Tables

#### Authentication & User Management
- **branches** - Multi-branch locations and settings
- **users_profile** - User account profiles
- **user_branch_assignments** - User-to-branch relationships
- **roles** - Role definitions with hierarchy

#### Access Control
- **permissions** - Role-based permissions
- **sensitive_field_access** - Field-level access control

#### Products & Inventory
- **categories** - Product categories
- **products** - Product catalog with pricing
- **inventory_stock** - Real-time stock levels
- **stock_movements** - Inventory audit trail

#### Billing & Transactions
- **bills** - Customer invoices
- **bill_items** - Invoice line items
- **daily_sales_reports** - Sales analytics
- **customers** - Customer profiles with loyalty

#### Purchasing & Operations
- **purchase_orders** - Vendor POs
- **po_items** - PO line items
- **vendors** - Supplier management
- **expenses** - Expense tracking

---

## API Modules

### 1. supabase.js
Initializes Supabase client with environment variables.

```javascript
import { supabase } from '@/api/supabase';

// Access Supabase client
const { data, error } = await supabase
  .from('products')
  .select('*');
```

### 2. base44ClientSupabase.js (520+ lines)
Comprehensive data access layer with entity repositories.

**Key Features:**
- CRUD operations for all entities
- Caching with localStorage
- Error handling
- Query optimization

**Available Repositories:**
- User, Role, Permission
- Product, Category, Inventory
- Bill, BillItem, Customer
- PurchaseOrder, Vendor
- Expense, DailySalesReport

```javascript
import { base44 } from '@/api/base44ClientSupabase';

// List products
const products = await base44.Product.list();

// Create a bill
const bill = await base44.Bill.create({
  bill_number: 'BILL-001',
  total_amount: 1000,
  ...
});
```

### 3. supabaseUtils.js (250+ lines)
Common database utility functions with error handling.

```javascript
import { createRecord, updateRecord, deleteRecord } from '@/api/supabaseUtils';

// Create
await createRecord('products', { name: 'Item', price: 100 });

// Update
await updateRecord('products', productId, { price: 150 });

// Delete
await deleteRecord('products', productId);
```

### 4. supabaseConfig.js (320+ lines)
Application initialization and configuration.

```javascript
import { initializeApplication, getApplicationStatus } from '@/api/supabaseConfig';

// Initialize app on startup
await initializeApplication(userId);

// Check app status
const status = await getApplicationStatus();
```

### 5. supabaseBackendTests.js (175+ lines)
Comprehensive backend testing suite.

```javascript
import { runBackendTests } from '@/api/supabaseBackendTests';

// Run all tests
const results = await runBackendTests();
```

---

## Core Functions

### Utility Functions

#### executeQuery()
Execute database operation with error handling.

```javascript
const result = await executeQuery(
  () => supabase.from('products').select('*'),
  'Fetch products'
);

if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

#### getPaginatedData()
Fetch paginated results with optional filters.

```javascript
const result = await getPaginatedData(
  'products',        // table name
  1,                 // page number
  20,                // page size
  { category_id: '123' }  // filters
);
```

#### searchRecords()
Search records in a table.

```javascript
const result = await searchRecords(
  'products',
  'name',     // search field
  'laptop'    // search value (case-insensitive)
);
```

#### getRecordById()
Get a single record by ID.

```javascript
const result = await getRecordById('products', productId);
```

#### createRecord()
Create a new record.

```javascript
const result = await createRecord('products', {
  name: 'New Product',
  price: 999,
  category_id: categoryId,
});
```

#### updateRecord()
Update an existing record.

```javascript
const result = await updateRecord('products', productId, {
  price: 1099,
  stock: 50,
});
```

#### deleteRecord()
Delete a record.

```javascript
const result = await deleteRecord('products', productId);
```

#### batchInsertRecords()
Insert multiple records at once.

```javascript
const result = await batchInsertRecords('products', [
  { name: 'Product 1', price: 100 },
  { name: 'Product 2', price: 200 },
  { name: 'Product 3', price: 300 },
]);
```

#### subscribeToChanges()
Subscribe to real-time changes on a table.

```javascript
const subscription = subscribeToChanges(
  'products',
  (payload) => {
    console.log('Change received:', payload);
  },
  '*'  // event type: 'INSERT', 'UPDATE', 'DELETE', '*'
);

// Later: unsubscribe
unsubscribeFromChanges(subscription);
```

### Configuration Functions

#### verifyDatabaseSchema()
Verify all required tables exist.

```javascript
const schemaStatus = await verifyDatabaseSchema();
console.log('Tables verified:', schemaStatus.verified);
console.log('Missing tables:', schemaStatus.missingTables);
```

#### initializeDefaultRoles()
Create default role definitions.

```javascript
const result = await initializeDefaultRoles();
// Creates: Owner, Admin, Manager, Supervisor, Cashier, Inventory, Accountant
```

#### ensureDefaultBranch()
Create default branch for new user.

```javascript
const result = await ensureDefaultBranch(userId);
console.log('Branch ID:', result.branch.id);
```

#### initializeApplication()
Complete application initialization.

```javascript
const initStatus = await initializeApplication(userId);
console.log('Status:', initStatus.status);
```

#### getApplicationStatus()
Check real-time application status.

```javascript
const status = await getApplicationStatus();
// Returns: { database, auth, services, overall }
```

---

## Authentication

### Supabase Auth Integration

```javascript
import { supabase } from '@/api/supabase';

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securePassword123',
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securePassword123',
});

// Get current user
const { data: { user }, error } = await supabase.auth.getUser();

// Sign out
await supabase.auth.signOut();

// Listen to auth changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event);
  console.log('Session:', session);
});
```

### Row Level Security (RLS)

All tables have RLS enabled for security:

- **branches** - User can access their branches
- **products** - Access based on branch assignment
- **bills** - Access based on branch and role
- **users_profile** - Self access + role-based access
- All other tables - Authenticated user access with role filtering

---

## Error Handling

### Error Response Format

All utility functions return consistent error responses:

```javascript
{
  success: false,
  error: "Error message",
  data: null
}
```

### Common Errors

```javascript
// Authentication required
{ success: false, error: "User must be authenticated" }

// Record not found
{ success: false, error: "No records found" }

// Database constraint violated
{ success: false, error: "Unique constraint violation" }

// Permission denied
{ success: false, error: "Insufficient permissions" }
```

### Error Handling Example

```javascript
const result = await createRecord('products', record);

if (!result.success) {
  // Handle error
  console.error('Failed to create product:', result.error);
  
  // Show user-friendly message
  showErrorToast(result.error);
} else {
  // Use data
  console.log('Product created:', result.data);
}
```

---

## Examples

### Complete Product Management Flow

```javascript
import { createRecord, updateRecord, deleteRecord, getRecordById } from '@/api/supabaseUtils';

// 1. Create a new product
const createResult = await createRecord('products', {
  name: 'Laptop',
  price: 50000,
  category_id: categoryId,
  sku: 'LAPTOP-001',
  stock: 10,
});

const productId = createResult.data[0].id;

// 2. Get the product
const getResult = await getRecordById('products', productId);
console.log('Product:', getResult.data);

// 3. Update the product
const updateResult = await updateRecord('products', productId, {
  price: 48000,
  stock: 8,
});

// 4. Delete the product
const deleteResult = await deleteRecord('products', productId);
```

### Bill Creation with Items

```javascript
import { executeMultipleQueries } from '@/api/supabaseUtils';

const billOperations = [
  {
    name: 'Create bill',
    operation: () => supabase.from('bills').insert([billData]).select(),
    strictMode: true,
  },
  {
    name: 'Insert bill items',
    operation: () => supabase.from('bill_items').insert(billItems).select(),
    strictMode: true,
  },
  {
    name: 'Update inventory',
    operation: () => supabase.from('inventory_stock').update(stockUpdates),
    strictMode: false,
  },
];

const results = await executeMultipleQueries(billOperations);
```

### Real-time Inventory Sync

```javascript
import { subscribeToChanges } from '@/api/supabaseUtils';

// Subscribe to stock changes
const subscription = subscribeToChanges(
  'inventory_stock',
  (payload) => {
    console.log('Inventory updated:', payload);
    
    // Update UI
    if (payload.eventType === 'UPDATE') {
      updateInventoryInUI(payload.new);
    }
  },
  'UPDATE'
);

// Clean up on component unmount
onUnmount(() => {
  unsubscribeFromChanges(subscription);
});
```

---

## Database Indexes

All tables have optimized indexes for performance:

```
- branches: user_id, code, is_active
- products: branch_id, category_id, sku, barcode
- inventory_stock: product_id, branch_id
- bills: branch_id, bill_number, bill_date, created_by
- customers: branch_id
- purchase_orders: branch_id, po_number, po_date
- stock_movements: product_id, branch_id, created_at
```

---

## Performance Tuning

### Caching
The data layer implements localStorage caching:
- Cache key: `base44_cache_${userId}_${tableName}`
- Background refresh keeps data fresh
- Manual cache clear available

### Query Optimization
- Indexes on frequently filtered columns
- Pagination support (default 20 items per page)
- Select specific columns when possible

### Connection Pooling
Managed automatically by Supabase:
- Concurrent connections: Scalable
- Idle timeout: 15 minutes
- Connection reuse: Optimized

---

## Deployment Checklist

- [x] Database schema verified (21 tables)
- [x] Authentication configured
- [x] RLS enabled on all tables
- [x] Indexes created for performance
- [x] Error handling implemented
- [x] Caching configured
- [x] Real-time subscriptions ready
- [x] Audit logging setup
- [x] Testing suite available
- [x] Backup configured (Supabase automatic)

---

## Support

For issues or questions:
1. Check the console logs for `[v0]` debug messages
2. Run `runBackendTests()` to verify backend connectivity
3. Check Supabase dashboard for database status
4. Review error messages in application status

---

## Version

- API Version: 1.0
- Database: PostgreSQL (Supabase)
- Migration Date: 2026-05-23
- Status: Production Ready
