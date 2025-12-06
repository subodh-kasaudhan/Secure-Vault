# Development Mode Setup

## 🚀 Quick Start

### Windows (PowerShell)
```powershell
.\start-dev.ps1
```

### Linux/Mac (Bash)
```bash
chmod +x start-dev.sh
./start-dev.sh
```

### Manual Start
```bash
docker-compose -f docker-compose.dev.yml up --build
```

## ✨ Features

### Hot Reload Enabled
- **Backend**: Django `runserver` with auto-reload on file changes
- **Frontend**: React development server with Fast Refresh
- **Instant Updates**: Changes to code are reflected immediately without restarting containers

### Volume Mounts
- **Backend**: `./backend` → `/app` (code changes sync instantly)
- **Frontend**: `./frontend` → `/app` (code changes sync instantly)
- **Node Modules**: Excluded from mount to prevent conflicts

## 📋 Services

### Backend
- **URL**: http://localhost:8000
- **API**: http://localhost:8000/api
- **Admin**: http://localhost:8000/admin
- **Auto-reload**: ✅ Enabled (Django runserver)

### Frontend
- **URL**: http://localhost:3000
- **Hot Reload**: ✅ Enabled (React Fast Refresh)
- **Polling**: Enabled for Docker volume compatibility

## 🔧 Development Workflow

1. **Start Development Mode**:
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

2. **Make Code Changes**:
   - Edit files in `backend/` or `frontend/`
   - Changes are automatically detected and reloaded

3. **View Logs**:
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f
   ```

4. **Stop Services**:
   ```bash
   docker-compose -f docker-compose.dev.yml down
   ```

## 🛠️ Useful Commands

### Run Migrations
```bash
docker-compose -f docker-compose.dev.yml exec backend python manage.py migrate
```

### Create Migrations
```bash
docker-compose -f docker-compose.dev.yml exec backend python manage.py makemigrations
```

### Access Backend Shell
```bash
docker-compose -f docker-compose.dev.yml exec backend python manage.py shell
```

### Install New Python Package
1. Add to `backend/requirements.txt`
2. Rebuild: `docker-compose -f docker-compose.dev.yml build backend`
3. Restart: `docker-compose -f docker-compose.dev.yml up`

### Install New NPM Package
1. Add to `frontend/package.json`
2. Rebuild: `docker-compose -f docker-compose.dev.yml build frontend`
3. Restart: `docker-compose -f docker-compose.dev.yml up`

### View Logs
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Backend only
docker-compose -f docker-compose.dev.yml logs -f backend

# Frontend only
docker-compose -f docker-compose.dev.yml logs -f frontend
```

## 🔍 Troubleshooting

### Changes Not Reflecting

**Backend**:
- Ensure volume mount is working: `docker-compose -f docker-compose.dev.yml exec backend ls -la /app`
- Check Django is in DEBUG mode (should see auto-reload messages)
- Restart: `docker-compose -f docker-compose.dev.yml restart backend`

**Frontend**:
- Check volume mount: `docker-compose -f docker-compose.dev.yml exec frontend ls -la /app`
- Verify `CHOKIDAR_USEPOLLING=true` is set
- Check browser console for errors
- Restart: `docker-compose -f docker-compose.dev.yml restart frontend`

### Port Already in Use
```bash
# Find process using port
netstat -ano | findstr :8000  # Windows
lsof -i :8000                 # Mac/Linux

# Or change ports in docker-compose.dev.yml
```

### Container Won't Start
```bash
# Rebuild from scratch
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up
```

### Database Issues
```bash
# Reset database (WARNING: Deletes all data)
docker-compose -f docker-compose.dev.yml exec backend rm /app/data/db.sqlite3
docker-compose -f docker-compose.dev.yml exec backend python manage.py migrate
```

## 📝 Environment Variables

Edit `docker-compose.dev.yml` to customize:

```yaml
environment:
  - DJANGO_DEBUG=True
  - SENSITIVE_SCAN_ENABLED=true
  - SENSITIVE_SCAN_MAX_BYTES=2097152
  # Add more as needed
```

## 🎯 Production vs Development

| Feature | Development | Production |
|---------|------------|-----------|
| Server | Django runserver | Gunicorn |
| Frontend | npm start (dev server) | serve (static build) |
| Hot Reload | ✅ Yes | ❌ No |
| Volume Mounts | ✅ Yes | ❌ No |
| Debug Mode | ✅ Enabled | ❌ Disabled |
| File | `docker-compose.dev.yml` | `docker-compose.yml` |

## 📚 Next Steps

1. Start development mode: `.\start-dev.ps1` (Windows) or `./start-dev.sh` (Linux/Mac)
2. Open http://localhost:3000 in your browser
3. Make changes to code and see them instantly!
4. Check backend at http://localhost:8000/api

Happy coding! 🎉

