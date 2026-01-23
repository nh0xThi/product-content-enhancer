# Setting Up Neon PostgreSQL Database

## Step 1: Create Neon Account and Database

1. Go to **https://neon.tech**
2. Click **"Sign Up"** (free account)
3. After signing in, click **"Create a project"**
4. Fill in:
   - **Project name**: `product-content-enhancer`
   - **Region**: Choose closest to your Render service (e.g., `us-east-1`)
   - **PostgreSQL version**: `15` or `16` (both work)
5. Click **"Create project"**

## Step 2: Get Connection String

After project is created:

1. You'll see the **Neon dashboard**
2. Look for **"Connection string"** section
3. Click **"Copy"** next to the connection string
   
   It will look like:
   ```
   postgresql://username:password@ep-xxxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

   Or you might see it in this format:
   ```
   postgresql://username:password@ep-xxxxx.us-east-1.aws.neon.tech/neondb
   ```

4. **Important**: If the connection string doesn't have `?sslmode=require`, add it:
   ```
   postgresql://username:password@ep-xxxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

## Step 3: Add DATABASE_URL to Render

1. Go to your **Render Dashboard**
2. Select your **Web Service**
3. Click **"Environment"** tab
4. Look for `DATABASE_URL`:
   - If it exists, click **Edit** and replace the value
   - If it doesn't exist, click **"Add Environment Variable"**
5. Set:
   - **Key**: `DATABASE_URL`
   - **Value**: Paste the Neon connection string (with `?sslmode=require`)
6. Click **"Save Changes"**

## Step 4: Redeploy

1. Go to **"Manual Deploy"** tab
2. Click **"Deploy latest commit"**
3. Wait for deployment

## Connection String Format

Your `DATABASE_URL` should look like:
```
postgresql://username:password@ep-xxxxx-xxxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### Breaking it down:
- `postgresql://` - Protocol
- `username:password` - Your Neon credentials
- `ep-xxxxx-xxxxx` - Your Neon endpoint
- `us-east-1.aws.neon.tech` - Neon host
- `neondb` - Database name (default)
- `?sslmode=require` - SSL requirement (important!)

## Neon Dashboard Features

After setup, you can:
- **View tables**: Go to "Tables" in Neon dashboard
- **Run SQL queries**: Use the SQL Editor
- **Monitor usage**: Check "Usage" tab
- **Connection pooling**: Available in paid plans

## Free Tier Limits

Neon free tier includes:
- ✅ 0.5 GB storage
- ✅ Shared CPU
- ✅ Automatic backups
- ✅ Connection pooling (limited)
- ✅ No credit card required

## Troubleshooting

### Error: "Connection refused"
- **Fix**: Ensure `?sslmode=require` is in the connection string
- **Fix**: Check if database is paused (Neon pauses after inactivity on free tier)

### Error: "Database does not exist"
- **Fix**: Use the default database name `neondb` or create a new database in Neon dashboard

### Error: "SSL required"
- **Fix**: Add `?sslmode=require` to the end of your connection string

### Database is Sleeping
- Neon free tier pauses databases after 5 minutes of inactivity
- **Fix**: The first request will wake it up (takes ~2-3 seconds)
- **Fix**: Upgrade to paid plan for always-on database

## Verify Connection

After deployment, check Render logs. You should see:
```
✅ Prisma migrations applied successfully
✅ Database connection established
✅ Server started
```

## Alternative: Get Connection String from Neon Dashboard

If you need to find the connection string later:

1. Go to **Neon Dashboard** → Your project
2. Click **"Connection Details"** or **"Connection string"**
3. Select **"Pooled connection"** (recommended) or **"Direct connection"**
4. Copy the connection string
5. Update `DATABASE_URL` in Render

## Next Steps

After setting up Neon:
1. ✅ Add `DATABASE_URL` to Render environment variables
2. ✅ Redeploy your service
3. ✅ Verify migrations ran successfully
4. ✅ Test your app

Your app will now use Neon PostgreSQL instead of Render's database!
