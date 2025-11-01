# 🚀 Deployment Guide - IITian Academy Milestone Tracker

## Deploy to Render with GitHub Actions (Always Running)

### Prerequisites
- GitHub account
- Render account (free tier available)
- MongoDB Atlas account (free tier)
- Git installed locally

---

## 📋 Step 1: Push Code to GitHub

1. **Initialize Git repository** (if not already done):
```powershell
cd "E:\IITIAN academy\milestone-tracker"
git init
git add .
git commit -m "Initial commit - Milestone Tracker"
```

2. **Create GitHub repository**:
   - Go to https://github.com/new
   - Name: `iitian-academy-milestone-tracker`
   - Keep it Public or Private
   - DO NOT initialize with README

3. **Push code to GitHub**:
```powershell
git remote add origin https://github.com/YOUR_USERNAME/iitian-academy-milestone-tracker.git
git branch -M main
git push -u origin main
```

---

## 🌐 Step 2: Deploy to Render

### Option A: Using render.yaml (Recommended)

1. **Go to Render Dashboard**: https://dashboard.render.com

2. **Click "New +" → "Blueprint"**

3. **Connect your GitHub repository**:
   - Select `iitian-academy-milestone-tracker`
   - Render will detect `render.yaml` automatically

4. **Set Environment Variables** (IMPORTANT):
   Click on your service → Environment tab → Add the following:

   ```
   MONGODB_URI=mongodb+srv://npdimagine_db_user:Xt5UX6JpD9JOSkHQ@cluster0.hpzvljs.mongodb.net/
   MONGODB_DB_NAME=milestone_tracker
   ADMIN_API_KEY=IITian_Academy_Admin_2024_SecureKey_Ticky7065
   ADMIN_EMAIL=npdimagine@gmail.com
   ADMIN_PASSWORD=Ticky7065@
   JWT_SECRET_KEY=IITian_Academy_JWT_Secret_Key_2024_Milestone_Tracker_Secure
   ```

5. **Deploy**: Click "Apply" and wait for deployment (5-10 minutes)

### Option B: Manual Setup

1. **New Web Service**: Dashboard → "New +" → "Web Service"

2. **Connect Repository**: Select your GitHub repo

3. **Configure Service**:
   - **Name**: `iitian-academy-milestone-tracker`
   - **Region**: Oregon (US West)
   - **Branch**: `main`
   - **Runtime**: Docker
   - **Plan**: Free

4. **Advanced Settings**:
   - **Health Check Path**: `/health`
   - **Auto-Deploy**: Yes

5. **Add Environment Variables** (same as Option A)

6. **Create Web Service**

---

## ⚙️ Step 3: Setup GitHub Actions (Auto-Deploy)

1. **Get Render API Key**:
   - Go to Render Dashboard → Account Settings
   - Click "API Keys" → "Create API Key"
   - Copy the key (you won't see it again!)

2. **Get Service ID**:
   - Go to your deployed service on Render
   - Copy the ID from URL: `https://dashboard.render.com/web/srv-XXXXX`
   - The `srv-XXXXX` part is your Service ID

3. **Add GitHub Secrets**:
   - Go to your GitHub repo → Settings → Secrets and variables → Actions
   - Click "New repository secret" and add:

   ```
   Name: RENDER_API_KEY
   Value: [Your Render API Key]

   Name: RENDER_SERVICE_ID  
   Value: srv-XXXXX

   Name: RENDER_APP_URL
   Value: https://iitian-academy-milestone-tracker.onrender.com
   ```

4. **Test Auto-Deploy**:
   ```powershell
   # Make a small change
   echo "# Test" >> README.md
   git add .
   git commit -m "Test auto-deploy"
   git push origin main
   ```

   - Go to GitHub → Actions tab
   - Watch the deployment workflow run
   - Once complete, Render will auto-deploy your app!

---

## 🔍 Step 4: Verify Deployment

1. **Check Health Endpoint**:
   ```powershell
   curl https://YOUR-APP-NAME.onrender.com/health
   ```
   Should return:
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-11-01T...",
     "version": "1.0.0"
   }
   ```

2. **Access Dashboard**:
   - Open: `https://YOUR-APP-NAME.onrender.com`
   - You should see your dashboard!

3. **Test Admin Panel**:
   - Go to: `https://YOUR-APP-NAME.onrender.com/admin`
   - Login with credentials from .env

---

## 🎯 Step 5: Keep It Always Running

### Render Free Tier Limitations:
- **Spins down after 15 minutes of inactivity**
- **Spins up automatically on request** (takes 30-60 seconds)

### Solutions to Keep Running:

#### Option 1: Use Cron Job Monitor (Free)
```yaml
# Add to .github/workflows/keep-alive.yml
name: Keep Alive

on:
  schedule:
    - cron: '*/14 * * * *'  # Every 14 minutes
  workflow_dispatch:

jobs:
  keep-alive:
    runs-on: ubuntu-latest
    steps:
      - name: Ping application
        run: |
          curl -f ${{ secrets.RENDER_APP_URL }}/health || true
```

#### Option 2: Upgrade to Paid Plan ($7/month)
- Render Starter Plan: Always running, no spin-down
- Go to Service → Settings → Instance Type → Starter

#### Option 3: Use UptimeRobot (Free)
1. Go to https://uptimerobot.com
2. Create free account
3. Add New Monitor:
   - Monitor Type: HTTP(s)
   - URL: `https://YOUR-APP.onrender.com/health`
   - Monitoring Interval: 5 minutes
4. UptimeRobot will ping every 5 minutes, keeping it alive!

---

## 📊 Monitoring & Logs

### View Logs:
- Render Dashboard → Your Service → Logs tab
- Real-time logs of application activity

### Monitor Health:
```powershell
# Check health
curl https://YOUR-APP.onrender.com/health

# Check milestones
curl https://YOUR-APP.onrender.com/api/public/milestones

# Check pages  
curl https://YOUR-APP.onrender.com/api/pages
```

---

## 🔄 Update Deployment

Every time you push to GitHub main branch:
1. GitHub Actions triggers automatically
2. Render detects the update
3. Rebuilds Docker container
4. Deploys new version (zero downtime!)

**Manual deploy**:
```powershell
git add .
git commit -m "Update: Added new feature"
git push origin main
```

---

## 🛠️ Troubleshooting

### Issue: Build fails
**Solution**: Check Render logs for errors, verify Dockerfile syntax

### Issue: Health check fails
**Solution**: Ensure `/health` endpoint returns 200 status

### Issue: Environment variables not working
**Solution**: Double-check Render dashboard → Environment tab

### Issue: MongoDB connection fails
**Solution**: 
- Verify MONGODB_URI is correct
- Check MongoDB Atlas network access (allow all IPs: 0.0.0.0/0)

### Issue: App spins down too quickly
**Solution**: Implement keep-alive workflow or upgrade plan

---

## 🎉 Success!

Your app is now:
✅ Deployed to Render
✅ Auto-deploys on GitHub push
✅ Running on custom domain
✅ Monitored with health checks
✅ Always available (with keep-alive)

**Live URL**: `https://YOUR-APP-NAME.onrender.com`

---

## 📝 Next Steps

1. **Custom Domain** (Optional):
   - Render Dashboard → Your Service → Settings
   - Add Custom Domain
   - Update DNS records

2. **Environment Variables** (Production):
   - Update JWT_SECRET_KEY to a new secure value
   - Change ADMIN_PASSWORD
   - Use production MongoDB cluster

3. **Monitoring** (Optional):
   - Set up Sentry for error tracking
   - Add analytics (Google Analytics)
   - Configure email notifications

---

## 💡 Tips

- **Free Tier**: 750 hours/month (enough for 1 app always running)
- **Cold Start**: First request after spin-down takes ~30-60s
- **Logs Retention**: 7 days on free tier
- **Database**: Use MongoDB Atlas free tier (512MB)

---

## 🆘 Support

- Render Docs: https://render.com/docs
- GitHub Actions Docs: https://docs.github.com/actions
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com

**Need help?** Check logs first, then review this guide!
