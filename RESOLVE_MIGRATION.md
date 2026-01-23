# Resolve Failed Migration

## The Problem

Prisma detected a failed migration and won't apply new migrations until it's resolved. The migration `20240530213853_create_session_table` failed previously.

## Solution: Mark Migration as Rolled Back

You need to tell Prisma that the failed migration has been rolled back, so it can retry with the fixed SQL.

## Step 1: Connect to Your Database

You have two options:

### Option A: Use Neon SQL Editor (Easiest)

1. Go to **https://console.neon.tech**
2. Select your project
3. Click **"SQL Editor"**
4. Connect to your database

### Option B: Use Prisma Studio or psql

If you have database access locally, you can use:
```bash
npx prisma studio
```

## Step 2: Check Migration Table

Run this SQL to see the migration state:

```sql
SELECT * FROM "_prisma_migrations";
```

You should see the failed migration listed.

## Step 3: Mark Migration as Rolled Back

Run this SQL to mark the migration as rolled back:

```sql
UPDATE "_prisma_migrations" 
SET finished_at = NULL, 
    rolled_back_at = NOW()
WHERE migration_name = '20240530213853_create_session_table';
```

Or if you want to completely remove it from the migrations table:

```sql
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20240530213853_create_session_table';
```

## Step 4: Drop the Partially Created Table

If the table was partially created, drop it:

```sql
DROP TABLE IF EXISTS "Session";
```

## Step 5: Redeploy

After marking the migration as rolled back:

1. Commit and push your changes (the fixed migration file)
2. Render will redeploy
3. The migration will run again with the fixed SQL (using TIMESTAMP instead of DATETIME)

## Alternative: Use Prisma CLI (If You Have Database Access)

If you can run Prisma commands with access to the production database:

```bash
# Mark as rolled back
npx prisma migrate resolve --rolled-back 20240530213853_create_session_table

# Then deploy again
```

## Quick Fix: Complete SQL Script

Run this complete script in Neon SQL Editor:

```sql
-- 1. Drop the partially created table
DROP TABLE IF EXISTS "Session";

-- 2. Remove the failed migration record
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20240530213853_create_session_table';
```

Then redeploy - Prisma will treat it as a new migration and apply it successfully.

## Verify

After running the SQL and redeploying, check Render logs. You should see:

```
✅ Migration applied successfully
✅ All migrations have been successfully applied
✅ Server started
```

## What This Does

- Removes the failed migration record from Prisma's tracking table
- Drops any partially created tables
- Allows Prisma to retry the migration with the fixed SQL (TIMESTAMP instead of DATETIME)
