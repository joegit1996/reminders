# Vercel Environment Variables Setup

## ✅ Already Added to Vercel

The following environment variables have been added to your Vercel project:

- ✅ `NEXT_PUBLIC_SUPABASE_URL` = `https://bczwvzzmdlofoaknqcge.supabase.co`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your anon key)
- ✅ `CRON_SECRET` = `08dcff801bb8a27b4a534e1b55ade01a`

## Next Steps

1. **Set up Supabase Database Tables:**
   - Go to your Supabase project: https://supabase.com/dashboard/project/bczwvzzmdlofoaknqcge
   - Navigate to **SQL Editor** → **New Query**
   - Copy and paste the contents of `supabase-setup.sql`
   - Click **Run**
   - Verify tables were created in **Table Editor**

2. **Redeploy to Vercel:**
   ```bash
   vercel --prod
   ```
   
   Or trigger a redeploy from the Vercel dashboard to apply the new environment variables.

3. **Test the App:**
   - Visit your Vercel deployment URL
   - Create a test reminder
   - Check your Slack channel for the notification

## Environment Variables Summary

For **Production**, **Preview**, and **Development** environments:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `CRON_SECRET` - Secret for securing cron endpoints

All variables are now configured! 🎉
