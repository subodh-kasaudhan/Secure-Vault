# Backend - Django REST API

This is the Django backend for the Secure Vault, providing a REST API with content-based deduplication, file management, and storage analytics.

## 🏗️ Architecture

### Two-Tier Storage Model

The backend implements a sophisticated two-tier storage system:

1. **FileBlob Model**: Stores unique file content
   - SHA-256 hash for content identification
   - Reference counting for garbage collection
   - Physical file storage in organized directory structure

2. **File Model**: Stores file metadata
   - Original filename and MIME type
   - Reference to FileBlob
   - Upload timestamp and user metadata

### Key Features

- **Content-Based Deduplication**: Identical files share storage
- **Reference Counting**: Tracks file usage for cleanup
- **Garbage Collection**: Automatically removes unused blobs
- **Advanced Filtering**: Search by name, type, size, and date with timezone-aware date filtering
- **Storage Analytics**: Real-time deduplication statistics
- **Duplicate Management**: Remove duplicate files with atomic operations
- **Sensitive Document Detection**: Automatic scanning for sensitive content in uploaded documents
- **Enhanced Error Handling**: Comprehensive validation with user-friendly error messages

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- pip
- SQLite (included with Python)

### Local Development

1. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   export DJANGO_DEBUG=True
   export DJANGO_SECRET_KEY=your-secret-key-here
   export CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   ```

4. **Create necessary directories**
   ```bash
   mkdir -p media staticfiles data
   ```

5. **Run database migrations**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. **Start development server**
   ```bash
   python manage.py runserver
   ```

### Docker Development

```bash
# Build and start backend only
docker-compose up backend

# Or start all services
docker-compose up -d
```

## 📝 API Endpoints

### File Management

#### List Files with Filtering
```
GET /api/files/
```

**Query Parameters:**
- `q`: Search by filename (case-insensitive)
- `file_type`: Filter by type (image,pdf,video,audio,doc)
- `min_size`: Minimum file size in bytes
- `max_size`: Maximum file size in bytes
- `date_from`: Start date (YYYY-MM-DD) - timezone-aware (Asia/Kolkata)
- `date_to`: End date (YYYY-MM-DD) - timezone-aware (Asia/Kolkata)
- `page`: Page number for pagination

**Response:**
```json
{
  "count": 100,
  "next": "http://localhost:8000/api/files/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "original_filename": "document.pdf",
      "file_type": "application/pdf",
      "size": 1048576,
      "uploaded_at": "2024-01-01T12:00:00Z",
      "file_url": "/media/blobs/ab/ab123456..."
    }
  ]
}
```

#### Upload File
```
POST /api/files/
```

**Request:** Multipart form data with 'file' field

**Features:**
- Automatic content-based deduplication
- SHA-256 hash computation
- Reference counting for shared blobs
- Streaming upload to avoid memory issues

**Response:**
```json
{
  "id": 1,
  "original_filename": "document.pdf",
  "file_type": "application/pdf",
  "size": 1048576,
  "uploaded_at": "2024-01-01T12:00:00Z",
  "file_url": "/media/blobs/ab/ab123456..."
}
```

#### Delete File
```
DELETE /api/files/{id}/
```

**Features:**
- Decrements blob reference count
- Automatic cleanup of unreferenced blobs
- Physical file deletion when no longer needed

**Response:** 204 No Content

#### Remove Duplicates
```
POST /api/files/remove-duplicates/
```

**Features:**
- Atomic transaction-based duplicate removal
- Keeps the oldest file, removes newer duplicates
- Automatic statistics update after removal

**Response:**
```json
{
  "message": "Removed 5 duplicate files",
  "removed_count": 5
}
```

### Storage Statistics

#### Get Storage Stats
```
GET /api/stats/storage/
```

**Response:**
```json
{
  "reported_total": 1048576,    // Sum of all file sizes
  "physical_total": 524288,     // Actual disk usage
  "savings": 524288,           // Space saved through deduplication
  "dedup_ratio": 0.5           // Deduplication ratio (0.0 to 1.0)
}
```

## 🧪 Testing

### Run All Tests
```bash
python manage.py test
```

### Run Specific Test Classes
```bash
# Test deduplication functionality
python manage.py test files.tests.FileDeduplicationTests

# Test filtering functionality
python manage.py test files.tests.FileFilteringTests

# Test storage statistics
python manage.py test files.tests.FileStatsTests
```

### Run with Coverage
```bash
pip install coverage
coverage run --source='.' manage.py test
coverage report
coverage html  # Generate HTML report
```

### Test Examples

The test suite includes comprehensive examples:

1. **Deduplication Tests**
   - Upload same file twice → verify one blob with ref_count=2
   - Upload different files → verify separate blobs
   - Delete one duplicate → verify ref_count decrements

2. **Filtering Tests**
   - Search by filename
   - Filter by file type
   - Filter by size range
   - Filter by date range
   - Combine multiple filters

3. **Storage Stats Tests**
   - Verify reported vs physical totals
   - Check deduplication ratio calculation
   - Test with empty storage

## 🔧 Configuration

### Settings

Key settings in `core/settings.py`:

```python
# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# CORS settings
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
CORS_ALLOW_ALL_ORIGINS = True  # Development only

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny'
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
}
```

### Environment Variables

```bash
# Required
DJANGO_DEBUG=True                    # Enable debug mode
DJANGO_SECRET_KEY=your-secret-key    # Django secret key

# Optional
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
DATABASE_URL=sqlite:///data/db.sqlite3
```

## 📊 Database Schema

### FileBlob Model
```python
class FileBlob(models.Model):
    sha256 = models.CharField(max_length=64, unique=True, db_index=True)
    size = models.BigIntegerField()
    path = models.CharField(max_length=500)
    ref_count = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### File Model
```python
class File(models.Model):
    original_filename = models.CharField(max_length=255, db_index=True)
    file_type = models.CharField(max_length=100)
    size = models.BigIntegerField()
    extension = models.CharField(max_length=10, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True, db_index=True)
    blob = models.ForeignKey(FileBlob, on_delete=models.CASCADE)
    sensitive_detected = models.BooleanField(default=False)
    sensitive_markers = models.JSONField(default=list, blank=True)
    sensitive_summary = models.TextField(blank=True)
```

## 🔍 Debugging

### Common Issues

1. **Migration Errors**
   ```bash
   # Reset migrations
   rm -rf files/migrations/0*.py
   python manage.py makemigrations
   python manage.py migrate
   ```

2. **File Upload Issues**
   ```bash
   # Check media directory permissions
   chmod -R 755 media/
   
   # Check disk space
   df -h
   ```

3. **CORS Errors**
   ```bash
   # Verify CORS settings
   python manage.py shell
   >>> from django.conf import settings
   >>> print(settings.CORS_ALLOWED_ORIGINS)
   ```

### Useful Commands

```bash
# Django shell
python manage.py shell

# Create superuser
python manage.py createsuperuser

# Check database
python manage.py dbshell

# Collect static files
python manage.py collectstatic

# Check for issues
python manage.py check
```

## 🚀 Production Deployment

### Security Considerations

1. **Environment Variables**
   ```bash
   DJANGO_DEBUG=False
   DJANGO_SECRET_KEY=<secure-random-key>
   CORS_ALLOWED_ORIGINS=<your-frontend-domain>
   ```

2. **Database**
   - Use PostgreSQL or MySQL for production
   - Configure proper database URL
   - Set up database backups

3. **File Storage**
   - Consider using cloud storage (AWS S3, etc.)
   - Configure proper file permissions
   - Set up monitoring for disk usage

4. **SSL/TLS**
   - Enable HTTPS
   - Configure proper SSL certificates
   - Set up reverse proxy (nginx)

### Performance Optimization

1. **Database**
   - Add database indexes for frequently queried fields
   - Use database connection pooling
   - Monitor query performance

2. **File Serving**
   - Use CDN for static files
   - Configure proper caching headers
   - Consider using Django Storages for cloud storage

3. **API Performance**
   - Implement API rate limiting
   - Use pagination for large datasets
   - Add caching for frequently accessed data 