# Deployment Guide - Secure Vault

This guide walks you through deploying Secure Vault to production using free tier services:
- **Frontend**: Vercel (static hosting)
- **Backend**: Railway (Docker web service)
- **Database**: Neon PostgreSQL (serverless database)
- **Storage**: Cloudinary (CDN-backed file storage)

## 📋 Prerequisites

1. GitHub account with your code pushed to a repository
2. Accounts on:
   - [Vercel](https://vercel.com) (free)
   - [Railway](https://railway.app) (free tier available)
   - [Neon](https://neon.tech) (free tier available)
   - [Cloudinary](https://cloudinary.com) (free tier available)

## 🚀 Deployment Order

Deploy in this order:
1. **Cloudinary** (get storage credentials)
2. **Neon Database** (get database URL)
3. **Railway Backend** (needs database + storage credentials)
4. **Vercel Frontend** (needs backend URL)

---

## Step 1: Set Up Cloudinary (File Storage)

### 1.1 Create Cloudinary Account
1. Go to [cloudinary.com](https://cloudinary.com)
2. Sign up for free account
3. Verify your email

### 1.2 Get Credentials
1. Go to Dashboard
2. Copy your **Cloudinary URL** from the dashboard
   - Format: `cloudinary://api_key:api_secret@cloud_name`
   - Or note down:
     - Cloud Name
     - API Key
     - API Secret

**Save these credentials** - you'll need them for Railway backend configuration.

---

## Step 2: Set Up Neon PostgreSQL Database

### 2.1 Create Neon Account
1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub
3. Create a new project

### 2.2 Create Database
1. Click "Create Project"
2. Name: `secure-vault-db`
3. Region: Choose closest to your users
4. PostgreSQL version: 15 or 16 (recommended)

### 2.3 Get Connection String
1. In your project dashboard, go to "Connection Details"
2. Copy the **Connection String**
   - Format: `postgresql://user:password@host/database?sslmode=require`
   - This is your `DATABASE_URL`

**Save this connection string** - you'll need it for Railway backend.

### 2.4 (Optional) Run Migrations Locally
If you want to test the connection:
```bash
cd backend
export DATABASE_URL="your-neon-connection-string"
python manage.py migrate
```

---

## Step 3: Deploy Backend to Railway

### 3.1 Connect Railway to GitHub
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your Secure Vault repository

### 3.2 Configure Service
1. Railway will auto-detect it's a Python project
2. If not, click "Add Service" → "GitHub Repo"
3. Select your repository
4. Set **Root Directory**: `backend`

### 3.3 Configure Build Settings
1. Go to Settings → Build
2. **Build Command**: (leave empty or use)
   ```bash
   pip install -r requirements.txt
   ```
3. **Start Command**:
   ```bash
   gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
   ```
   Or if using Dockerfile (recommended):
   - Railway will auto-detect Dockerfile in `backend/` directory

### 3.4 Set Environment Variables
Go to **Variables** tab and add:

```bash
# Django Settings
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=<generate-a-strong-secret-key>
DJANGO_ALLOWED_HOSTS=your-backend.railway.app,*.railway.app

# Database (from Step 2)
DATABASE_URL=<your-neon-connection-string>

# CORS (update after frontend deployment)
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app

# File Upload Limits
MAX_UPLOAD_SIZE=10485760
TOTAL_STORAGE_LIMIT=209715200

# Cloudinary (from Step 1)
CLOUDINARY_URL=<your-cloudinary-url>

# Timezone
TZ=Asia/Kolkata
```

**Generate Secret Key:**
```python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 3.5 Deploy
1. Click "Deploy"
2. Wait for build to complete
3. Railway will provide a URL like: `https://your-backend.railway.app`
4. Test the API: `https://your-backend.railway.app/api/stats/storage/`

### 3.6 Run Migrations
1. Go to Railway dashboard → your service
2. Click "Deployments" → "View Logs"
3. Or use Railway CLI:
   ```bash
   railway run python manage.py migrate
   ```
4. Or add to build command:
   ```bash
   pip install -r requirements.txt && python manage.py migrate
   ```

**Save your backend URL** - you'll need it for Vercel frontend.

---

## Step 4: Deploy Frontend to Vercel

### 4.1 Connect Vercel to GitHub
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Add New Project"
4. Import your Secure Vault repository

### 4.2 Configure Project
1. **Framework Preset**: Create React App
2. **Root Directory**: `frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `build`
5. **Install Command**: `npm install --legacy-peer-deps`

### 4.3 Set Environment Variables
Go to **Environment Variables** and add:

```bash
REACT_APP_API_URL=https://your-backend.railway.app/api
```

Replace `your-backend.railway.app` with your actual Railway backend URL.

### 4.4 Deploy
1. Click "Deploy"
2. Wait for build (usually 1-2 minutes)
3. Vercel will provide a URL like: `https://your-app.vercel.app`

### 4.5 Update Backend CORS
1. Go back to Railway dashboard
2. Update `CORS_ALLOWED_ORIGINS` environment variable:
   ```bash
   CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
   ```
3. Redeploy backend (or it will auto-redeploy)

---

## ✅ Verification

### Test Your Deployment

1. **Frontend**: Visit `https://your-app.vercel.app`
   - Should load the React app
   - Check browser console for errors

2. **Backend API**: Visit `https://your-backend.railway.app/api/stats/storage/`
   - Should return JSON with storage stats

3. **Full Flow**:
   - Upload a file from frontend
   - Check if it appears in the file list
   - Verify storage stats update
   - Test file download

### Common Issues

**CORS Errors:**
- Make sure `CORS_ALLOWED_ORIGINS` in Railway includes your Vercel URL
- Check for trailing slashes (use `https://your-app.vercel.app` not `https://your-app.vercel.app/`)

**Database Connection Errors:**
- Verify `DATABASE_URL` is correct in Railway
- Check Neon dashboard to ensure database is active
- Run migrations: `railway run python manage.py migrate`

**File Upload Errors:**
- Verify `CLOUDINARY_URL` is set correctly in Railway
- Check Cloudinary dashboard for usage limits
- Ensure `TOTAL_STORAGE_LIMIT` is set (209715200 = 200MB)

**Build Errors:**
- Check Railway/Vercel build logs
- Ensure all dependencies are in `requirements.txt` / `package.json`
- Verify Node.js and Python versions are compatible

---

## 🔧 Environment Variables Reference

### Backend (Railway)
```bash
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=<secret-key>
DJANGO_ALLOWED_HOSTS=your-backend.railway.app
DATABASE_URL=<neon-connection-string>
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
MAX_UPLOAD_SIZE=10485760
TOTAL_STORAGE_LIMIT=209715200
CLOUDINARY_URL=<cloudinary-url>
TZ=Asia/Kolkata
```

### Frontend (Vercel)
```bash
REACT_APP_API_URL=https://your-backend.railway.app/api
```

---

## 📊 Monitoring

### Railway
- View logs: Railway dashboard → Service → Deployments → View Logs
- Monitor usage: Dashboard → Usage tab
- Check metrics: Service → Metrics

### Vercel
- View logs: Project → Deployments → Click deployment → View Function Logs
- Analytics: Project → Analytics tab

### Cloudinary
- Dashboard: [cloudinary.com/console](https://cloudinary.com/console)
- Monitor storage usage and bandwidth

### Neon
- Dashboard: [console.neon.tech](https://console.neon.tech)
- Monitor database size and connections

---

## 🎉 Success!

Your Secure Vault is now live on:
- **Frontend**: `https://your-app.vercel.app`
- **Backend API**: `https://your-backend.railway.app/api`
- **Admin Panel**: `https://your-backend.railway.app/admin` (if you set up admin)

All services are on free tiers and should handle your 200MB storage limit comfortably!

---

## 🔄 Updating Your Deployment

### Backend Updates
1. Push changes to GitHub
2. Railway will auto-deploy
3. Check logs if issues occur

### Frontend Updates
1. Push changes to GitHub
2. Vercel will auto-deploy
3. Usually completes in 1-2 minutes

### Database Migrations
```bash
railway run python manage.py migrate
```

---

## 💡 Tips

1. **Keep Backend Warm**: Railway free tier spins down after inactivity. Consider using a free uptime monitor (UptimeRobot) to ping your backend every 10 minutes.

2. **Monitor Storage**: Check Cloudinary dashboard regularly to ensure you're within free tier limits (25GB storage, 25GB bandwidth/month).

3. **Database Backups**: Neon provides automatic backups, but you can also export your database manually if needed.

4. **Custom Domains**: Both Vercel and Railway support custom domains (may require paid plans for some features).

---

## 📝 Notes

- All services offer free tiers suitable for this project
- Total storage limit: 200MB (enforced in code)
- Single file limit: 10MB (enforced in code)
- Railway free tier: 500 hours/month, $5 credit
- Vercel free tier: Unlimited deployments, 100GB bandwidth
- Neon free tier: 0.5GB storage, unlimited projects
- Cloudinary free tier: 25GB storage, 25GB bandwidth/month

