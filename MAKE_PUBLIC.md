# Making Your App Publicly Accessible

## The Issue

Vercel preview URLs (like `reminders-xxxxx.vercel.app`) require authentication by default. This is called "Deployment Protection."

## Solution: Use Your Production Domain

Your app has a production domain that should be publicly accessible:
**https://reminders-liard.vercel.app**

## If Production Domain Also Requires Auth

If the production domain also requires authentication, disable Deployment Protection:

### Steps to Disable Deployment Protection:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `reminders` project
3. Go to **Settings** → **Security**
4. Find **Deployment Protection** section
5. For **Production** deployments:
   - Set to **"None"** or **"Public"**
   - Save changes
6. Redeploy:
   ```bash
   vercel --prod
   ```

### Alternative: Add a Custom Domain

You can also add a custom domain (like `reminders.yourdomain.com`):
1. Go to **Settings** → **Domains**
2. Add your domain
3. Follow DNS configuration instructions
4. Custom domains are typically public by default

## Current Status

- **Preview URLs**: Require Vercel authentication (by design)
- **Production URL**: Should be public at `https://reminders-liard.vercel.app`
- **Custom Domain**: Can be added for a cleaner URL

Try accessing: **https://reminders-liard.vercel.app**

If it still requires auth, follow the steps above to disable deployment protection.
