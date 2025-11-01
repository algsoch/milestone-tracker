# 🚀 Render Deployment Guide - IITian Academy Milestone Tracker

This guide provides step-by-step instructions for deploying the IITian Academy Milestone Tracker to Render.com.

## Prerequisites

Before deploying, ensure you have:

1. ✅ **GitHub Repository** - Code pushed to GitHub
2. ✅ **MongoDB Atlas Account** - Database setup with connection string
3. ✅ **Render Account** - Free account at render.com
4. ✅ **Admin API Key** - Secure key for admin operations

## Step 1: MongoDB Atlas Setup

### Create MongoDB Cluster

1. **Sign up/Login** to [MongoDB Atlas](https://cloud.mongodb.com/)
2. **Create a new cluster** (free tier M0 is sufficient)
3. **Create database user**:
   - Username: `tracker_user`
   - Password: Generate strong password
   - Roles: Read and write to any database

4. **Configure Network Access**:
   - Add IP: `0.0.0.0/0` (allow from anywhere)
   - Or add Render's IP ranges for better security

5. **Get Connection String**:
   ```
   mongodb+srv://tracker_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Create Database and Collection

1. **Connect to cluster** using MongoDB Compass or CLI
2. **Create database**: `tracker_db`
3. **Create collection**: `pages`

## Step 2: Prepare Your Repository

### Ensure Required Files Exist

Your repository should contain:
```
milestone-tracker/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── models.py
│   ├── database.py
│   └── auth.py
├── static/
│   ├── styles.css
│   └── dashboard.js
├── templates/
│   └── dashboard.html
├── backups/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── render.yaml
└── README.md
```

### Verify Dockerfile

Ensure your `Dockerfile` is optimized for Render:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN mkdir -p /app/backups

COPY app/ /app/app/
COPY static/ /app/static/
COPY templates/ /app/templates/

RUN adduser --disabled-password --gecos '' appuser
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Step 3: Deploy to Render

### Method 1: Using Render Dashboard

1. **Login to Render**
   - Go to [render.com](https://render.com)
   - Sign in with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the milestone-tracker repository

3. **Configure Service**
   ```
   Name: iitian-milestone-tracker
   Environment: Docker
   Region: Oregon (or closest to your location)
   Branch: main
   Docker Context Directory: .
   Dockerfile Path: ./Dockerfile
   ```

4. **Set Environment Variables**
   Click "Advanced" and add:
   ```
   MONGODB_URI=mongodb+srv://tracker_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   DATABASE_NAME=tracker_db
   ADMIN_API_KEY=your-secure-admin-api-key-here
   PORT=8000
   HOST=0.0.0.0
   PROJECT_NAME=IITian Academy Question Tracker
   MILESTONE_DEADLINE=2025-10-17
   MILESTONE_CREATED=2025-10-13
   TOTAL_QUESTIONS=480
   MILESTONE_AMOUNT=30
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for build and deployment (5-10 minutes)

### Method 2: Using render.yaml (Infrastructure as Code)

1. **Ensure render.yaml exists** in repository root:
   ```yaml
   services:
     - type: web
       name: iitian-milestone-tracker
       env: docker
       plan: free
       region: oregon
       branch: main
       dockerfilePath: ./Dockerfile
       envVars:
         - key: MONGODB_URI
           sync: false
         - key: DATABASE_NAME
           value: tracker_db
         - key: ADMIN_API_KEY
           generateValue: true
         - key: PORT
           value: 8000
         - key: HOST
           value: 0.0.0.0
         - key: PROJECT_NAME
           value: IITian Academy Question Tracker
         - key: MILESTONE_DEADLINE
           value: 2025-10-17
         - key: MILESTONE_CREATED
           value: 2025-10-13
         - key: TOTAL_QUESTIONS
           value: 480
         - key: MILESTONE_AMOUNT
           value: 30
       healthCheckPath: /health
   ```

2. **Deploy from Blueprint**
   - In Render dashboard, click "New +" → "Blueprint"
   - Connect repository and select render.yaml
   - Review configuration and deploy

## Step 4: Configure Environment Variables

### Required Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas connection string |
| `DATABASE_NAME` | `tracker_db` | Database name |
| `ADMIN_API_KEY` | `your-secure-key` | Admin authentication key |
| `PORT` | `8000` | Server port (Render auto-detects) |
| `HOST` | `0.0.0.0` | Server host |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PROJECT_NAME` | `IITian Academy Question Tracker` | Display name |
| `MILESTONE_DEADLINE` | `2025-10-17` | Project deadline |
| `MILESTONE_CREATED` | `2025-10-13` | Project start date |
| `TOTAL_QUESTIONS` | `480` | Total questions target |
| `MILESTONE_AMOUNT` | `30` | Milestone value |

### Setting Variables in Render

1. **Navigate to your service** in Render dashboard
2. **Go to Environment tab**
3. **Add each variable**:
   - Key: Variable name
   - Value: Variable value
   - Click "Add"
4. **Save Changes** - triggers automatic redeployment

## Step 5: Verify Deployment

### Check Service Status

1. **View Logs**
   - Go to "Logs" tab in Render dashboard
   - Look for successful startup messages:
     ```
     Successfully connected to MongoDB
     Application started successfully
     Uvicorn running on http://0.0.0.0:8000
     ```

2. **Test Health Check**
   - Visit: `https://your-app.onrender.com/health`
   - Should return: `{"status": "healthy", ...}`

3. **Access Dashboard**
   - Visit: `https://your-app.onrender.com`
   - Should load the milestone tracker dashboard

### Test API Endpoints

```bash
# Test public endpoints
curl https://your-app.onrender.com/api/progress
curl https://your-app.onrender.com/health

# Test admin endpoint (replace with your API key)
curl -X POST "https://your-app.onrender.com/api/backup" \
  -H "X-API-Key: your-admin-api-key"
```

## Step 6: Custom Domain (Optional)

### Add Custom Domain

1. **Purchase domain** from registrar (GoDaddy, Namecheap, etc.)
2. **In Render dashboard**:
   - Go to service settings
   - Click "Custom Domains"
   - Add your domain: `tracker.yourdomain.com`
3. **Configure DNS** at your registrar:
   - Add CNAME record: `tracker` → `your-app.onrender.com`
4. **Wait for SSL** certificate (automatic)

## Step 7: Monitoring & Maintenance

### Monitor Application

1. **Health Checks**
   - Render automatically monitors `/health` endpoint
   - Restarts service if health checks fail

2. **View Metrics**
   - Go to "Metrics" tab in dashboard
   - Monitor CPU, memory, and response times

3. **Set Up Alerts**
   - Configure email notifications for failures
   - Set up Slack/Discord webhooks if needed

### Update Application

1. **Push to GitHub**
   - Make changes locally
   - Commit and push to main branch
   - Render automatically redeploys

2. **Manual Redeploy**
   - In Render dashboard, click "Manual Deploy"
   - Select latest commit or specific commit

### Backup Management

1. **Automatic Backups**
   - Application creates daily backups at 2 AM UTC
   - Stored in `/backups/` directory (ephemeral on Render)

2. **External Backup Storage**
   - Consider adding AWS S3 or Google Cloud Storage
   - Modify backup function to upload to cloud storage

## Troubleshooting

### Common Issues

**❌ Build Failed**
```
Solution:
- Check Dockerfile syntax
- Verify all files are committed to repository
- Review build logs for specific errors
```

**❌ Database Connection Error**
```
Solution:
- Verify MONGODB_URI is correct
- Check MongoDB Atlas network access (0.0.0.0/0)
- Ensure database user has proper permissions
```

**❌ Environment Variables Not Working**
```
Solution:
- Check spelling of variable names
- Ensure values don't have extra spaces
- Redeploy after adding variables
```

**❌ Application Won't Start**
```
Solution:
- Check logs for Python errors
- Verify all dependencies in requirements.txt
- Ensure PORT environment variable is set
```

### Getting Help

1. **Check Render Logs**
   - Detailed error messages in logs tab
   - Look for Python tracebacks

2. **Test Locally**
   - Run `docker build .` to test build
   - Use `docker-compose up` to test locally

3. **Render Support**
   - Check Render documentation
   - Contact Render support for platform issues

## Security Considerations

### Production Security

1. **Environment Variables**
   - Never commit API keys to repository
   - Use Render's environment variable encryption

2. **API Key Management**
   - Generate strong, unique API keys
   - Rotate keys regularly
   - Monitor API usage

3. **Database Security**
   - Use MongoDB Atlas with proper access controls
   - Enable auditing and monitoring
   - Regular security updates

4. **HTTPS**
   - Render provides free SSL certificates
   - Redirect HTTP to HTTPS (automatic)

## Cost Optimization

### Render Pricing

- **Free Tier**: 750 hours/month, sleeps after 15 min inactivity
- **Starter Plan**: $7/month, no sleeping, more resources
- **Standard Plan**: $25/month, enhanced features

### Optimization Tips

1. **Use Free Tier** for development/demo
2. **Upgrade for Production** if constant availability needed
3. **Monitor Usage** in Render dashboard
4. **Optimize Docker Image** to reduce build times

## Conclusion

Your IITian Academy Milestone Tracker is now deployed on Render! 🎉

**Your URLs:**
- **Dashboard**: `https://your-app.onrender.com`
- **API Docs**: `https://your-app.onrender.com/docs`
- **Health Check**: `https://your-app.onrender.com/health`

Share the dashboard URL with your client for real-time project monitoring.

---

**Need Help?** Check the main README.md for additional configuration and usage instructions.