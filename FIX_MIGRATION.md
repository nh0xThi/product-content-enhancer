# Fix Migration Error: DATETIME to TIMESTAMP

## The Problem

The migration was created for SQLite (which uses `DATETIME`), but you're now using PostgreSQL (which uses `TIMESTAMP`). PostgreSQL doesn't support `DATETIME` type.

## Solution

The migration file has been fixed to use `TIMESTAMP(3)` instead of `DATETIME`. However, since the migration partially failed, you need to resolve the migration state.

## Step 1: Check Database State

The migration might have partially created the table. You need to either:

### Option A: Drop the Failed Table (Recommended for Fresh Start)

If this is a new deployment and you don't have important data:

1. Connect to your Neon database
2. Run this SQL to drop the table if it exists:
   ```sql
   DROP TABLE IF EXISTS "Session";
   ```

### Option B: Manually Fix the Table

If the table was partially created:

1. Connect to your Neon database
2. Check if the table exists:
   ```sql
   SELECT * FROM "Session" LIMIT 1;
   ```
3. If it exists with wrong column types, drop it:
   ```sql
   DROP TABLE IF EXISTS "Session";
   ```

## Step 2: Mark Migration as Resolved

After fixing the database, mark the migration as applied:

```bash
# This tells Prisma the migration is resolved
npx prisma migrate resolve --applied 20240530213853_create_session_table
```

## Step 3: Redeploy

After fixing the migration file and resolving the state:

1. Commit the fixed migration file
2. Push to trigger deployment
3. Or manually deploy on Render

## Alternative: Create New Migration

If you prefer to create a fresh migration:

1. Delete the old migration folder:
   ```bash
   rm -rf prisma/migrations/20240530213853_create_session_table
   ```

2. Create a new migration:
   ```bash
   npx prisma migrate dev --name create_session_table
   ```

3. This will create a PostgreSQL-compatible migration

## Quick Fix Script

If you have access to your Neon database via SQL editor:

```sql
-- Drop the table if it exists (with wrong schema)
DROP TABLE IF EXISTS "Session";

-- The migration will recreate it with correct TIMESTAMP types
```

Then redeploy - the fixed migration will run successfully.

## Verify

After deployment, check the logs. You should see:
```
✅ Migration applied successfully
✅ Server started
```

## What Changed

- `DATETIME` → `TIMESTAMP(3)` (PostgreSQL compatible)
- The `(3)` specifies millisecond precision, matching Prisma's DateTime type
