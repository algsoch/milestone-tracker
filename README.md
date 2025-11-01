# IITian Academy Milestone Tracker

🚀 **Full-Stack Project Management Dashboard** built with Python FastAPI + MongoDB

[![Live Demo](https://img.shields.io/badge/demo-live-success?style=for-the-badge&logo=render)](https://milestone-tracker-vq7d.onrender.com/)
[![Deploy to Render](https://img.shields.io/badge/deploy-render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/deploy)

> **🌐 Live Application:** [https://milestone-tracker-vq7d.onrender.com/](https://milestone-tracker-vq7d.onrender.com/)

## 🌟 Features

### 📊 User Dashboard
- **Multi-Milestone Tracking**: Dynamic progress across all milestones
- **6 Progress States**: Ready → Starting → Working → Halfway → Almost → Complete
- **Advanced Analytics**: Timeline view, Quick stats, Performance insights
- **Smart Pivot Table**: Dynamic grouping & intelligent sorting
- **Export Capabilities**: Excel, CSV, PDF with one click
- **Dark Mode**: Toggle for comfortable viewing
- **Responsive Design**: Mobile-first approach

### �️ Admin Panel
- **Secure Authentication**: JWT-based admin access
- **Milestone Management**: Add/Edit/Delete milestones with custom ranges
- **Page Management**: Add/Edit question pages with search & filter
- **Live Progress Cards**: Previous/Current/Overall milestone tracking
- **Quick Stats Dashboard**: Real-time metrics
- **Auto-Detection**: Extracts subject/year from URLs

### 💡 Technical Highlights
- **Smart Algorithm**: Dynamic question-to-milestone mapping
- **RESTful API**: Proper error handling & validation
- **MongoDB Integration**: Efficient data storage & aggregation
- **Auto-Backup System**: Daily scheduled backups
- **Real-time Updates**: Across both interfaces
- **Docker Ready**: Production-optimized container

## 🛠️ Tech Stack

- **Backend:** FastAPI, Uvicorn, Pydantic
- **Database:** MongoDB Atlas
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Charts:** Chart.js
- **Deployment:** Docker + Render
- **Scheduling:** APScheduler for automated backups

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- MongoDB Atlas account
- Docker (optional)

### 1. Clone Repository
```bash
git clone <repository-url>
cd milestone-tracker
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
# ADMIN_API_KEY=your-secure-api-key
# DATABASE_NAME=tracker_db
# PORT=8000
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run Application
```bash
# Development
python -m uvicorn app.main:app --reload --port 8000

# Production
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

### 5. Access Dashboard
- **Public Dashboard:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health

## 🐳 Docker Deployment

### Local Docker
```bash
# Build image
docker build -t milestone-tracker .

# Run container
docker run -p 8000:8000 --env-file .env milestone-tracker
```

### Docker Compose
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## ☁️ Render Deployment

### 1. Prepare Repository
- Push code to GitHub/GitLab
- Ensure Dockerfile is in root directory

### 2. Create Render Service
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Web Service"
3. Connect your repository
4. Configure settings:
   - **Name:** `iitian-academy-tracker`
   - **Environment:** `Docker`
   - **Region:** Choose closest to your users
   - **Instance Type:** `Starter` (free tier)

### 3. Environment Variables
Set these in Render dashboard:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
ADMIN_API_KEY=your-secure-api-key-here
DATABASE_NAME=tracker_db
MILESTONE_DEADLINE=2025-10-17
MILESTONE_CREATED=2025-10-13
TOTAL_QUESTIONS=480
MILESTONE_AMOUNT=30
PORT=8000
```

### 4. Deploy
- Click "Create Web Service"
- Render will automatically build and deploy
- Access your app at `https://your-app-name.onrender.com`

## 📱 Using the Dashboard

### Public Access (Client View)
1. Visit the deployed URL
2. View real-time progress and statistics
3. Browse pages table with search/filter
4. Monitor performance insights
5. Auto-refresh every 30 seconds

### Admin Access
1. Click "Admin Panel" button
2. Toggle admin mode to see:
   - Add new page form
   - Update/Delete buttons on pages
   - Additional controls

### Adding Pages (Admin)
1. Enter admin mode
2. Fill out "Add New Page" form:
   - Page Name (required)
   - Page Link (optional)
   - Total Questions (required)
   - Status (Pending/In Progress/Completed)
   - Admin API Key (required)
3. Click "Add Page"

### Updating Progress (Admin)
1. Click "Update" button on any page
2. Enter new completed questions count
3. Provide admin API key
4. Click "Update Progress"
5. Status automatically updates based on completion

## 📊 Data Models

### Page Model
```json
{
  "_id": "ObjectId",
  "page_name": "string",
  "page_link": "url (optional)",
  "total_questions": "integer",
  "completed_questions": "integer",
  "status": "Pending|In Progress|Completed",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Milestone Summary
```json
{
  "total_questions": 480,
  "completed_questions": 250,
  "remaining_questions": 230,
  "progress_percentage": 52.08,
  "total_pages": 15,
  "completed_pages": 5,
  "pending_pages": 7,
  "in_progress_pages": 3,
  "deadline": "2025-10-17",
  "days_remaining": 1
}
```

## 🔒 Security Features

### API Key Authentication
- All write operations require `X-API-Key` header
- Admin API key stored securely in environment variables
- Rate limiting and input validation

### Data Protection
- MongoDB connection uses SSL/TLS
- Environment variables for all sensitive data
- CORS middleware configured for security
- Input sanitization and validation

## 📈 Performance Analytics

The system automatically calculates:
- **Average Daily Rate:** Questions completed per day
- **Estimated Completion:** Projected completion date
- **Performance Trend:** On Track / Slightly Behind / Behind Schedule
- **Recommendations:** AI-generated suggestions based on progress

## 🔄 Backup System

### Automated Backups
- Daily backups at 2 AM server time
- Triggered after each data update
- Stored in `/backups/` directory
- JSON format with timestamp

### Backup Structure
```json
{
  "backup_timestamp": "2025-10-16T10:30:00Z",
  "pages": [...],
  "summary": {...}
}
```

### Manual Backup
```bash
# Via API (Admin only)
curl -X POST "https://your-app.onrender.com/api/backup" \
  -H "X-API-Key: your-admin-key"
```

## 🎨 Customization

### Theming
Edit `/static/styles.css`:
- Update CSS variables in `:root`
- Modify color scheme and branding
- Adjust responsive breakpoints

### Configuration
Update environment variables:
- `PROJECT_NAME` - Dashboard title
- `MILESTONE_DEADLINE` - Project deadline
- `TOTAL_QUESTIONS` - Expected total questions

## 🔧 Troubleshooting

### Common Issues

**1. MongoDB Connection Failed**
```bash
# Check connection string format
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# Verify network access in MongoDB Atlas
# Whitelist IP: 0.0.0.0/0 for cloud deployment
```

**2. API Key Authentication Error**
```bash
# Ensure API key matches exactly
# Check header format: X-API-Key: your-key-here
```

**3. Docker Build Issues**
```bash
# Clear Docker cache
docker system prune -a

# Rebuild image
docker build --no-cache -t milestone-tracker .
```

**4. Render Deployment Fails**
- Check build logs in Render dashboard
- Verify environment variables are set
- Ensure Dockerfile is in repository root

### Logs and Monitoring
```bash
# View application logs
docker-compose logs -f milestone-tracker

# Check health endpoint (Local)
curl http://localhost:8000/health

# Check health endpoint (Production)
curl https://milestone-tracker-vq7d.onrender.com/health

# Monitor MongoDB Atlas
# Use built-in Atlas monitoring dashboard
```

## 🌐 Live Deployment

**Production Application:** [https://milestone-tracker-vq7d.onrender.com/](https://milestone-tracker-vq7d.onrender.com/)

### Quick Access
- 📊 **Dashboard:** [https://milestone-tracker-vq7d.onrender.com/](https://milestone-tracker-vq7d.onrender.com/)
- ⚙️ **Admin Panel:** Click "Admin Panel" button on dashboard
- 📚 **API Docs:** [https://milestone-tracker-vq7d.onrender.com/docs](https://milestone-tracker-vq7d.onrender.com/docs)
- 💓 **Health Check:** [https://milestone-tracker-vq7d.onrender.com/health](https://milestone-tracker-vq7d.onrender.com/health)

### Deployment Details
- **Platform:** Render (Free Tier)
- **Auto-Deploy:** Enabled via GitHub Actions
- **Uptime:** Keep-alive workflow (pings every 14 minutes)
- **Database:** MongoDB Atlas

## 📞 Support

For issues with this tracker:
1. Check the troubleshooting section above
2. Review application logs
3. Verify environment configuration
4. Test API endpoints using `/docs`

## 🔮 Future Enhancements

- **Email Notifications:** Automated progress alerts
- **Advanced Analytics:** Detailed progress charts
- **Multi-Project Support:** Track multiple milestones
- **Integration APIs:** Connect with project management tools
- **Mobile App:** Native iOS/Android application

## 📄 License

This project is created for IITian Academy milestone tracking. All rights reserved.

---

<div align="center">

### 🚀 Production Deployment

**Live URL:** [milestone-tracker-vq7d.onrender.com](https://milestone-tracker-vq7d.onrender.com/)

[![Admin Panel](https://img.shields.io/badge/Admin-Panel-blue?style=flat-square)](https://milestone-tracker-vq7d.onrender.com/)
[![API Docs](https://img.shields.io/badge/API-Documentation-green?style=flat-square)](https://milestone-tracker-vq7d.onrender.com/docs)
[![Health](https://img.shields.io/badge/Health-Check-success?style=flat-square)](https://milestone-tracker-vq7d.onrender.com/health)

**Made with ❤️ for IITian Academy**

</div>  
**Last Updated:** October 16, 2025