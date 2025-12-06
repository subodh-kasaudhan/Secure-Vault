# Quick Start Deployment Guide

## 🎯 Deployment Order

1. **Cloudinary** → Get storage credentials
2. **Neon Database** → Get database URL  
3. **Railway Backend** → Deploy with database + storage
4. **Vercel Frontend** → Deploy with backend URL

---

## Step 1: Cloudinary (5 minutes)

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Copy **Cloudinary URL** from dashboard
   - Format: `cloudinary://api_key:api_secret@cloud_name`
3. **Save this** → You'll need it for Railway

---

## Step 2: Neon Database (5 minutes)

1. Sign up at [neon.tech](https://neon.tech) (GitHub login)
2. Create new project: `secure-vault-db`
3. Copy **Connection String** from "Connection Details"
   - Format: `postgresql://user:password@host/db?sslmode=require`
4. **Save this** → You'll need it for Railway

---

## Step 3: Railway Backend (10 minutes)

1. Sign up at [railway.app](https://railway.app) (GitHub login)
2. New Project → Deploy from GitHub → Select your repo
3. Set **Root Directory**: `backend`
4. Go to **Variables** tab, add:

```bash
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=<generate-with-python-command-below>
DJANGO_ALLOWED_HOSTS=*.railway.app
DATABASE_URL=<neon-connection-string-from-step-2>
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
MAX_UPLOAD_SIZE=10485760
TOTAL_STORAGE_LIMIT=209715200
CLOUDINARY_URL=<cloudinary-url-from-step-1>
TZ=Asia/Kolkata
```

**Generate Secret Key:**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

5. Deploy → Wait for build
6. Copy backend URL: `https://your-backend.railway.app`
7. Run migrations (Railway dashboard → Deployments → View Logs, or use CLI)

**Save backend URL** → You'll need it for Vercel

---

## Step 4: Vercel Frontend (5 minutes)

1. Sign up at [vercel.com](https://vercel.com) (GitHub login)
2. Add New Project → Import your repo
3. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
4. **Environment Variables**:
   ```bash
   REACT_APP_API_URL=https://your-backend.railway.app/api
   ```
5. Deploy → Wait 1-2 minutes
6. Copy frontend URL: `https://your-app.vercel.app`

---

## Step 5: Update CORS

1. Go back to Railway
2. Update `CORS_ALLOWED_ORIGINS`:
   ```bash
   CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
   ```
3. Redeploy (or auto-redeploys)

---

## ✅ Test

1. Visit: `https://your-app.vercel.app`
2. Upload a file
3. Check if it works!

---

## 🔧 Troubleshooting

**CORS Errors:**
- Check `CORS_ALLOWED_ORIGINS` includes your Vercel URL (no trailing slash)

**Database Errors:**
- Verify `DATABASE_URL` is correct
- Run migrations: `railway run python manage.py migrate`

**File Upload Errors:**
- Check `CLOUDINARY_URL` is set correctly
- Verify Cloudinary dashboard for limits

**Build Errors:**
- Check Railway/Vercel build logs
- Ensure all dependencies in requirements.txt/package.json

---

## 📝 Environment Variables Summary

### Railway (Backend)
```bash
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=<secret>
DJANGO_ALLOWED_HOSTS=*.railway.app
DATABASE_URL=<neon-url>
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
MAX_UPLOAD_SIZE=10485760
TOTAL_STORAGE_LIMIT=209715200
CLOUDINARY_URL=<cloudinary-url>
TZ=Asia/Kolkata
```

### Vercel (Frontend)
```bash
REACT_APP_API_URL=https://your-backend.railway.app/api
```

---

**Total Time: ~25 minutes** ⚡

For detailed instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

