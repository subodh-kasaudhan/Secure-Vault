# Docker Setup for Secure Vault

This document describes the Docker configuration for Secure Vault, a file management system with content-based deduplication, sensitive document detection, and advanced search capabilities.

## 🏗️ Architecture

The system consists of two main services:

- **Backend**: Django REST API with SQLite database and file storage
- **Frontend**: React application with TypeScript

## 📁 Volume Configuration

### Persistent Storage

The following named volumes ensure data persistence across container rebuilds:

- `backend_storage`: Stores uploaded files in `/app/media`
- `backend_static`: Stores Django static files in `/app/staticfiles`
- `backend_data`: Stores SQLite database in `/app/data`

### Volume Mapping

```yaml
volumes:
  - backend_storage:/app/media      # Uploaded files persist here
  - backend_static:/app/staticfiles # Static assets
  - backend_data:/app/data          # Database
```

## 🔧 Configuration

### Environment Variables

**Backend:**
- `DJANGO_DEBUG=True`: Enables debug mode
- `DJANGO_SECRET_KEY`: Django secret key
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed origins

**Frontend:**
- `REACT_APP_API_URL`: Backend API base URL
- `CHOKIDAR_USEPOLLING=true`: Enables file watching in Docker
- `WATCHPACK_POLLING=true`: Enables webpack polling

### CORS Configuration

The backend is configured to allow requests from:
- `http://localhost:3000`
- `http://127.0.0.1:3000`

## 🚀 Quick Start

### Prerequisites

1. Docker Desktop installed and running
2. Git repository cloned

### Start Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Test Setup

Run the test script to verify everything is working:

```bash
# Windows PowerShell
.\test-docker-setup.ps1

# Linux/macOS
./test-docker-setup.sh
```

## 🌐 Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **Django Admin**: http://localhost:8000/admin

## 📊 File Storage

### Upload Process

1. Files are uploaded to the backend via `/api/files/`
2. Content is hashed using SHA-256 for deduplication
3. Unique files are stored in `/app/media/blobs/<hash[:2]>/<hash>`
4. File metadata is stored in SQLite database

### Deduplication

- Identical files share the same blob storage
- Reference counting tracks file usage
- Garbage collection removes unused blobs

## 🔍 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify `CORS_ALLOWED_ORIGINS` includes frontend URL
   - Check that `django-cors-headers` is installed

2. **File Upload Failures**
   - Ensure `backend_storage` volume has proper permissions
   - Check available disk space

3. **Frontend Not Loading**
   - Verify React development server is running
   - Check for JavaScript errors in browser console

4. **Database Issues**
   - Ensure `backend_data` volume is properly mounted
   - Run migrations: `docker-compose exec backend python manage.py migrate`

### Useful Commands

```bash
# View service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Access backend shell
docker-compose exec backend python manage.py shell

# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Check volume contents
docker-compose exec backend ls -la /app/media/
docker-compose exec backend ls -la /app/data/
```

## 🔒 Security Notes

⚠️ **Development Only Configuration**

This setup is configured for development:

- `CORS_ALLOW_ALL_ORIGINS = True`
- `DJANGO_DEBUG = True`
- Insecure secret key
- No SSL/TLS

For production deployment:
- Configure proper CORS origins
- Disable debug mode
- Use secure secret key
- Enable HTTPS
- Configure proper database (PostgreSQL/MySQL)

## 📈 Monitoring

### Health Checks

The test script verifies:
- Backend API responsiveness
- Frontend accessibility
- CORS configuration
- Volume persistence

### Logs

Monitor application logs:
```bash
docker-compose logs -f
```

## 🧹 Cleanup

To completely reset the system:

```bash
# Stop and remove containers, networks, and volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Clean up unused volumes
docker volume prune
```

⚠️ **Warning**: This will delete all uploaded files and database data.
