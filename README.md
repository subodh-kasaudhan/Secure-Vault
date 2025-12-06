# Secure Vault

A full-stack file management application built with React and Django, featuring **content-based deduplication**, advanced search/filtering, and comprehensive file management capabilities.

## 🚀 Quick Start

### Clone and Run with Docker (Fastest)

```bash
# Clone the repository
git clone https://github.com/your-username/secure-vault.git
cd secure-vault

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/api
```

**That's it!** The application will be running in a few minutes. See [Installation & Setup](#-installation--setup) for detailed instructions.

### Clone and Run Locally

```bash
# Clone the repository
git clone https://github.com/your-username/secure-vault.git
cd secure-vault

# Backend (Terminal 1)
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend (Terminal 2)
cd frontend
npm install
echo "REACT_APP_API_URL=http://localhost:8000/api" > .env.local
npm start
```

See [Local Development Setup](#option-2-local-development-without-docker) for detailed step-by-step instructions.

## ✨ Key Features

- **🔍 Content-Based Deduplication**: Identical files are stored once, saving storage space
- **📊 Storage Analytics**: Real-time storage savings and deduplication ratio
- **🔎 Advanced Search & Filtering**: Search by filename, filter by type, size, and date with timezone-aware date filtering
- **📱 Modern UI**: Responsive design with accessibility features
- **⚡ Fast Downloads**: Optimized file serving with proper caching
- **🛡️ Garbage Collection**: Automatic cleanup of unreferenced files
- **🔄 Duplicate Management**: Remove duplicate files with atomic operations, keeping the oldest file
- **🔒 Sensitive Document Detection**: Automatic scanning and alerts for sensitive content in uploaded documents
- **✅ Enhanced Error Handling**: Comprehensive client-side and server-side validation with user-friendly error messages
- **🌐 Timezone Support**: Asia/Kolkata timezone support with proper date boundary handling

## 🏗️ Architecture

### Two-Tier Storage Model
- **FileBlob**: Stores unique file content (SHA-256 hashed)
- **File**: Stores metadata and references to FileBlob
- **Reference Counting**: Tracks file usage for garbage collection

### Technology Stack

**Backend**
- Django 5.1.6 with Django REST Framework
- SQLite database (development)
- Content-based deduplication with SHA-256
- Sensitive document scanning with NLP support
- Gunicorn + WhiteNoise for production serving
- Timezone-aware date filtering (Asia/Kolkata)

**Frontend**
- React 18 with TypeScript
- TanStack Query for state management
- Tailwind CSS for styling
- Axios for API communication

**Infrastructure**
- Docker and Docker Compose
- Named volumes for data persistence
- CORS configuration for cross-origin requests

## 🚀 Technology Stack

### Backend
- Django 5.1.6 (Python web framework)
- Django REST Framework (API development)
- SQLite (Development database)
- Sensitive document scanning (pypdf, python-docx, textract, spaCy)
- Gunicorn (WSGI HTTP Server)
- WhiteNoise (Static file serving)

### Frontend
- React 18 with TypeScript
- TanStack Query (React Query) for data fetching
- Axios for API communication
- Tailwind CSS for styling
- Heroicons for UI elements

### Infrastructure
- Docker and Docker Compose
- Local file storage with volume mounting

## 📋 Prerequisites

Before you begin, ensure you have installed:
- **Git** - for cloning the repository
- **Docker Desktop** (20.10.x or higher) and Docker Compose (2.x or higher) - for Docker setup
- **Node.js** (18.x or higher) - for local development without Docker
- **Python** (3.9 or higher) - for local development without Docker
- **npm** or **yarn** - for frontend dependencies

## 🔧 Environment Variables

### Backend Environment Variables
```bash
# Django Settings
DJANGO_DEBUG=True                    # Enable debug mode (development)
DJANGO_SECRET_KEY=your-secret-key    # Django secret key
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Database (defaults to SQLite)
DATABASE_URL=sqlite:///data/db.sqlite3

# File Storage
MEDIA_ROOT=/app/media                # File storage directory
MEDIA_URL=/media/                    # Media URL prefix
```

### Frontend Environment Variables
```bash
# API Configuration
REACT_APP_API_URL=http://localhost:8000/api    # Backend API base URL

# Development Settings
CHOKIDAR_USEPOLLING=true             # Enable file watching in Docker
WATCHPACK_POLLING=true               # Enable webpack polling
```

## 🚀 Getting Started

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-username/secure-vault.git

# Navigate to the project directory
cd secure-vault
```

**Note:** Replace `your-username` with the actual GitHub username/organization name.

---

## 🛠️ Installation & Setup

Choose one of the following setup methods based on your preference:

### Option 1: Docker (Recommended - Easiest)

This method uses Docker Compose to run both frontend and backend in containers. No need to install Python or Node.js dependencies locally.

#### Step-by-Step Docker Setup

1. **Ensure Docker Desktop is running**
   - Windows: Open Docker Desktop application
   - macOS: Open Docker Desktop application
   - Linux: Start Docker service (`sudo systemctl start docker`)

2. **Clone and navigate to the project** (if not already done)
   ```bash
   git clone https://github.com/your-username/secure-vault.git
   cd secure-vault
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```
   This will:
   - Build Docker images for backend and frontend
   - Create necessary volumes for data persistence
   - Start both services in detached mode

4. **Wait for services to be ready** (first time may take 2-5 minutes)
   ```bash
   # Check service status
   docker-compose ps
   
   # View logs to see startup progress
   docker-compose logs -f
   ```

5. **Verify setup** (optional)
   ```bash
   # Windows PowerShell
   .\test-docker-setup.ps1
   
   # Linux/macOS
   ./test-docker-setup.sh
   ```

6. **Access the application**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8000/api
   - **Django Admin**: http://localhost:8000/admin
   - **Storage Stats API**: http://localhost:8000/api/stats/storage/

#### Useful Docker Commands

```bash
# View logs (all services)
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop all services
docker-compose down

# Stop and remove volumes (clears all data)
docker-compose down -v

# Rebuild and restart (after code changes)
docker-compose up --build -d

# Restart a specific service
docker-compose restart backend
docker-compose restart frontend

# Access backend shell
docker-compose exec backend python manage.py shell

# Run migrations manually
docker-compose exec backend python manage.py migrate

# Check service status
docker-compose ps

# View resource usage
docker stats
```

#### Troubleshooting Docker Setup

**Port already in use:**
```bash
# Check what's using the ports
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# Linux/macOS
lsof -i :3000
lsof -i :8000

# Change ports in docker-compose.yml if needed
```

**Docker build fails:**
```bash
# Clean Docker cache and rebuild
docker-compose down
docker system prune -a
docker-compose up --build -d
```

**Permission issues (Linux):**
```bash
# Add your user to docker group
sudo usermod -aG docker $USER
# Log out and log back in
```

### Option 2: Local Development (Without Docker)

This method requires Python and Node.js installed on your system. Use this if you prefer to run services directly or need to debug/develop.

#### Prerequisites Check

```bash
# Check Python version (should be 3.9+)
python --version
# or
python3 --version

# Check Node.js version (should be 18+)
node --version

# Check npm version
npm --version
```

#### Backend Setup (Step-by-Step)

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create Python virtual environment**
   ```bash
   # Windows
   python -m venv venv
   
   # Linux/macOS
   python3 -m venv venv
   ```

3. **Activate virtual environment**
   ```bash
   # Windows (PowerShell)
   .\venv\Scripts\Activate.ps1
   
   # Windows (Command Prompt)
   venv\Scripts\activate.bat
   
   # Linux/macOS
   source venv/bin/activate
   ```
   
   You should see `(venv)` in your terminal prompt when activated.

4. **Upgrade pip** (recommended)
   ```bash
   pip install --upgrade pip
   ```

5. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```
   
   **Note:** On some systems, you may need to install system dependencies first:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install python3-dev libmagic1
   
   # macOS (with Homebrew)
   brew install libmagic
   ```

6. **Create necessary directories**
   ```bash
   # Windows
   mkdir media staticfiles data temp_uploads
   
   # Linux/macOS
   mkdir -p media staticfiles data temp_uploads
   ```

7. **Set up environment variables** (optional, defaults work for local dev)
   
   Create a `.env` file in the `backend` directory (optional):
   ```bash
   # backend/.env
   DJANGO_DEBUG=True
   DJANGO_SECRET_KEY=your-local-secret-key-here
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   ```
   
   **Note:** For local development, you can skip this - defaults will work.

8. **Run database migrations**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```
   
   This creates the SQLite database and all necessary tables.

9. **Create superuser** (optional, for admin access)
   ```bash
   python manage.py createsuperuser
   ```
   Follow the prompts to create an admin user.

10. **Collect static files** (for production-like setup)
    ```bash
    python manage.py collectstatic --noinput
    ```

11. **Start the Django development server**
    ```bash
    python manage.py runserver
    ```
    
    You should see:
    ```
    Starting development server at http://127.0.0.1:8000/
    Quit the server with CTRL-BREAK.
    ```
    
    The backend API is now running at http://localhost:8000

#### Frontend Setup (Step-by-Step)

**Open a new terminal window** (keep backend running in the first terminal)

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   # (from project root)
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```
   
   **Note:** If you encounter peer dependency issues:
   ```bash
   npm install --legacy-peer-deps
   ```
   
   This may take a few minutes on first install.

3. **Create environment file**
   
   Create `.env.local` in the `frontend` directory:
   ```bash
   # frontend/.env.local
   REACT_APP_API_URL=http://localhost:8000/api
   ```
   
   **Windows PowerShell:**
   ```powershell
   echo "REACT_APP_API_URL=http://localhost:8000/api" > .env.local
   ```
   
   **Linux/macOS:**
   ```bash
   echo "REACT_APP_API_URL=http://localhost:8000/api" > .env.local
   ```

4. **Start the React development server**
   ```bash
   npm start
   ```
   
   This will:
   - Start the development server
   - Open http://localhost:3000 in your browser automatically
   - Enable hot-reload for code changes

#### Running Both Services

You need **two terminal windows**:

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # or .\venv\Scripts\Activate.ps1 on Windows
python manage.py runserver
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

#### Access Points

Once both services are running:
- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **Django Admin**: http://localhost:8000/admin
- **API Documentation**: http://localhost:8000/api/stats/storage/

#### Troubleshooting Local Setup

**Backend won't start:**
```bash
# Check if port 8000 is in use
# Windows
netstat -ano | findstr :8000

# Linux/macOS
lsof -i :8000

# Use a different port
python manage.py runserver 8001
```

**Frontend won't start:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check if port 3000 is in use
# Windows
netstat -ano | findstr :3000

# Linux/macOS
lsof -i :3000
```

**CORS errors in browser:**
- Ensure backend is running on port 8000
- Check `.env.local` has correct `REACT_APP_API_URL`
- Verify `CORS_ALLOWED_ORIGINS` in backend settings includes `http://localhost:3000`

**Database errors:**
```bash
# Delete database and recreate
cd backend
rm db.sqlite3  # or delete data/db.sqlite3
python manage.py migrate
```

**Module not found errors:**
```bash
# Reinstall dependencies
cd backend
pip install -r requirements.txt

cd ../frontend
npm install
```

## 🧪 Running Tests

### Backend Tests
```bash
# Run all tests
cd backend
python manage.py test

# Run specific test file
python manage.py test files.tests.FileDeduplicationTests

# Run with coverage
pip install coverage
coverage run --source='.' manage.py test
coverage report
```

### Frontend Tests
```bash
# Run tests
cd frontend
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## 🔍 Verification Checklist

### 1. Basic Setup Verification
- [ ] Backend server starts without errors
- [ ] Frontend application loads in browser
- [ ] No CORS errors in browser console
- [ ] API endpoints respond correctly

### 2. Deduplication Demo
Follow these steps to verify the deduplication system:

**Step 1: Upload the same file twice**
1. Navigate to http://localhost:3000
2. Upload a file (e.g., `test.txt` with content "Hello World")
3. Upload the same file again
4. Verify both files appear in the list

**Step 2: Check storage statistics**
1. Look at the "Storage Savings" card
2. Verify:
   - **Reported Total**: Shows combined size of both files
   - **Physical Total**: Shows actual disk usage (should be less)
   - **Savings**: Shows space saved through deduplication
   - **Dedup Ratio**: Shows percentage of space saved

**Step 3: Delete one file**
1. Delete one of the duplicate files
2. Verify the file is removed from the list
3. Check that storage statistics update correctly

**Step 4: Delete the last reference**
1. Delete the remaining file
2. Verify:
   - File is removed from the list
   - Storage statistics show zero usage
   - Physical file is cleaned up (garbage collection)

### 3. Search and Filtering
- [ ] Search by filename works
- [ ] File type filters work (Images, PDFs, Videos, Audio, Documents)
- [ ] Size range filters work
- [ ] Date range filters work
- [ ] Filters can be combined
- [ ] Clear all filters works

### 4. File Operations
- [ ] File upload with progress indicator
- [ ] File download works correctly
- [ ] File deletion with confirmation
- [ ] Error handling for failed operations

### 5. Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] Focus indicators visible
- [ ] ARIA labels present

## 🌐 Accessing the Application

Once setup is complete, access the application at:

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **Django Admin Panel**: http://localhost:8000/admin (if superuser created)
- **Storage Statistics API**: http://localhost:8000/api/stats/storage/

## 📚 Quick Reference

### First Time Setup Summary

**Docker Method:**
```bash
git clone https://github.com/your-username/secure-vault.git
cd secure-vault
docker-compose up -d
# Wait 2-5 minutes, then visit http://localhost:3000
```

**Local Development Method:**
```bash
git clone https://github.com/your-username/secure-vault.git
cd secure-vault

# Terminal 1 - Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Terminal 2 - Frontend
cd frontend
npm install
echo "REACT_APP_API_URL=http://localhost:8000/api" > .env.local
npm start
```

## 📝 API Documentation

### File Management Endpoints

#### List Files with Filtering
- **GET** `/api/files/`
- **Query Parameters:**
  - `q`: Search by filename (case-insensitive)
  - `file_type`: Filter by file type (comma-separated: image,pdf,video,audio,doc)
  - `min_size`: Minimum file size in bytes
  - `max_size`: Maximum file size in bytes
  - `date_from`: Start date (ISO format: YYYY-MM-DD)
  - `date_to`: End date (ISO format: YYYY-MM-DD)
  - `page`: Page number for pagination
- **Response:** Paginated list of files with metadata

#### Upload File (with Deduplication)
- **POST** `/api/files/`
- **Request:** Multipart form data with 'file' field
- **Features:**
  - Automatic content-based deduplication
  - SHA-256 hash computation
  - Reference counting for shared blobs
- **Response:** File metadata including ID, size, and upload status

#### Get File Details
- **GET** `/api/files/<file_id>/`
- **Response:** Complete file metadata including download URL

#### Delete File (with Garbage Collection)
- **DELETE** `/api/files/<file_id>/`
- **Features:**
  - Decrements blob reference count
  - Automatic cleanup of unreferenced blobs
  - Physical file deletion when no longer needed
- **Response:** 204 No Content on success

#### Remove Duplicates
- **POST** `/api/files/remove-duplicates/`
- **Features:**
  - Atomic transaction-based duplicate removal
  - Keeps the oldest file, removes newer duplicates
  - Automatic statistics update after removal
- **Response:** Success message with number of duplicates removed

#### Download File
- **GET** `/media/blobs/<hash[:2]>/<hash>`
- Direct file access through generated URL
- Proper MIME type serving

### Storage Statistics

#### Get Storage Stats
- **GET** `/api/stats/storage/`
- **Response:**
  ```json
  {
    "reported_total": 1048576,    // Sum of all file sizes
    "physical_total": 524288,     // Actual disk usage
    "savings": 524288,           // Space saved through deduplication
    "dedup_ratio": 0.5           // Deduplication ratio (0.0 to 1.0)
  }
  ```

### Query Parameters Examples

```bash
# Search for files containing "report"
GET /api/files/?q=report

# Filter by file type
GET /api/files/?file_type=image,pdf

# Filter by size range (1MB to 10MB)
GET /api/files/?min_size=1048576&max_size=10485760

# Filter by date range (timezone-aware, Asia/Kolkata)
GET /api/files/?date_from=2024-01-01&date_to=2024-12-31

# Combine multiple filters
GET /api/files/?q=report&file_type=pdf&min_size=1048576
```

### Sensitive Document Detection

The system automatically scans uploaded documents (PDF, TXT, DOC, DOCX, RTF) for sensitive content:
- **Email addresses**: Detected and flagged
- **Password hints**: Credential-related keywords identified
- **Personal information**: Names, phone numbers, and other PII
- **Frontend notifications**: 5-second amber alerts for sensitive uploads
- **File list badges**: Visual indicators for sensitive files

### Duplicate Management

- **Remove Duplicates Endpoint**: `/api/files/remove-duplicates/`
- **Strategy**: Keeps the oldest file, removes newer duplicates
- **Atomic Operations**: Transaction-based for data integrity
- **UI Integration**: "Remove Duplicates" button in Storage Stats component

## 🗄️ Project Structure

```
Secure-Vault/
├── backend/                          # Django backend
│   ├── files/                       # Main application
│   │   ├── models.py               # File and FileBlob models
│   │   ├── views.py                # API views with deduplication
│   │   ├── urls.py                 # URL routing
│   │   ├── serializers.py          # Data serialization
│   │   └── tests.py                # Comprehensive test suite
│   ├── core/                       # Project settings
│   │   ├── settings.py             # Django configuration
│   │   └── urls.py                 # Main URL configuration
│   ├── requirements.txt            # Python dependencies
│   ├── Dockerfile                  # Backend container
│   └── start.sh                    # Container startup script
├── frontend/                       # React frontend
│   ├── src/
│   │   ├── components/             # React components
│   │   │   ├── FileList.tsx       # File listing with actions
│   │   │   ├── FileFilters.tsx    # Search and filtering
│   │   │   ├── FileUpload.tsx     # File upload component
│   │   │   └── StorageStats.tsx   # Storage analytics
│   │   ├── services/              # API services
│   │   │   └── fileService.ts     # File operations and download
│   │   ├── hooks/                 # Custom React hooks
│   │   │   └── useFiles.ts        # File management hook
│   │   ├── types/                 # TypeScript definitions
│   │   ├── config/                # Configuration
│   │   │   └── api.ts             # API configuration
│   │   └── utils/                 # Utility functions
│   ├── package.json               # Node.js dependencies
│   └── Dockerfile                 # Frontend container
├── docker-compose.yml             # Docker composition
├── DOCKER_README.md               # Docker setup documentation
├── test-docker-setup.ps1          # Windows test script
├── test-docker-setup.sh           # Linux/macOS test script
└── README.md                      # This file
```

### Key Files Explained

**Backend:**
- `files/models.py`: Two-tier storage model (File + FileBlob)
- `files/views.py`: API endpoints with deduplication logic
- `files/tests.py`: Comprehensive test suite for all features
- `core/settings.py`: Django configuration with CORS and media settings

**Frontend:**
- `components/FileList.tsx`: Main file listing with download/delete
- `components/FileFilters.tsx`: Advanced search and filtering UI
- `components/StorageStats.tsx`: Real-time storage analytics
- `services/fileService.ts`: API communication and file operations
- `hooks/useFiles.ts`: React Query integration for state management

## 🔧 Development Features

- Hot reloading for both frontend and backend
- React Query DevTools for debugging data fetching
- TypeScript for better development experience
- Tailwind CSS for rapid UI development

## 🐛 Troubleshooting

### Common Issues

1. **Docker Issues**
   ```bash
   # Docker Desktop not running
   # Solution: Start Docker Desktop application
   
   # Port conflicts
   # Solution: Modify ports in docker-compose.yml or stop conflicting services
   
   # Volume permission issues
   # Solution: docker-compose down -v && docker-compose up -d
   ```

2. **Backend Issues**
   ```bash
   # Database migration errors
   cd backend
   python manage.py makemigrations
   python manage.py migrate
   
   # CORS errors
   # Check CORS_ALLOWED_ORIGINS in settings.py
   # Ensure frontend URL is included
   
   # File upload failures
   # Check media directory permissions
   # Verify disk space availability
   ```

3. **Frontend Issues**
   ```bash
   # API connection errors
   # Verify REACT_APP_API_URL in .env.local
   # Check backend is running on correct port
   
   # Build errors
   npm install --legacy-peer-deps
   npm run build
   
   # Hot reload not working in Docker
   # Check CHOKIDAR_USEPOLLING=true in environment
   ```

4. **File Operations Issues**
   ```bash
   # Download failures
   # Check file URL construction in fileService.ts
   # Verify media files are accessible
   
   # Deduplication not working
   # Check FileBlob model and reference counting
   # Verify SHA-256 hash computation
   
   # Garbage collection issues
   # Check ref_count decrement logic
   # Verify physical file deletion
   ```

### Debug Commands

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Access backend shell
docker-compose exec backend python manage.py shell

# Check volume contents
docker-compose exec backend ls -la /app/media/
docker-compose exec backend ls -la /app/data/

# Test API endpoints
curl http://localhost:8000/api/files/
curl http://localhost:8000/api/stats/storage/

# Check database
docker-compose exec backend python manage.py dbshell
```

### Performance Issues

1. **Large File Uploads**
   - Files are streamed to avoid memory issues
   - Progress indicators show upload status
   - Maximum file size: 10MB (configurable)

2. **Database Performance**
   - SQLite with proper indexing
   - Pagination for large file lists
   - Optimized queries for filtering

3. **Memory Usage**
   - Streaming file processing
   - Proper cleanup of temporary files
   - Garbage collection of unused blobs

## 🆕 Recent Features

### Duplicate Management System
- **Remove Duplicates API**: `/api/files/remove-duplicates/` endpoint with atomic transaction support
- **Keep Oldest Strategy**: Preserves the oldest file, removes newer duplicates
- **UI Integration**: "Remove Duplicates" button in Storage Stats component
- **Automatic Statistics Update**: Storage stats refresh after duplicate removal

### Sensitive Document Detection
- **Automatic Scanning**: Scans PDF, TXT, DOC, DOCX, and RTF files for sensitive content
- **NLP Enhancement**: Optional spaCy integration for improved detection
- **Frontend Notifications**: 5-second amber alerts for sensitive uploads
- **File List Badges**: Visual indicators for sensitive files
- **Detected Content**: Email addresses, passwords, usernames, phone numbers, and other PII

### Enhanced Error Handling
- **Client-Side Validation**: Real-time file size and extension validation
- **User-Friendly Messages**: Clear error messages with emojis and specific details
- **Auto-Clearing Errors**: 5-second timeout for error display
- **Security-Focused**: Blocked file type validation (exe, com, bat, etc.)

### Timezone Support
- **Asia/Kolkata Timezone**: Proper timezone-aware date filtering
- **Date Boundary Handling**: Correct start/end of day filtering
- **Docker Integration**: Container timezone environment variable support

For detailed information about all features, see [AllFeatures.md](AllFeatures.md).

# Project Submission Instructions

## Preparing Your Submission

1. Before creating your submission zip file, ensure:
   - All features are implemented and working as expected
   - All tests are passing
   - The application runs successfully locally
   - Remove any unnecessary files or dependencies
   - Clean up any debug/console logs

2. Create the submission zip file:
   ```bash
   # Activate your backend virtual environment first
   cd backend
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Run the submission script from the project root
   cd ..
   python create_submission_zip.py
   ```

   The script will:
   - Create a zip file named `username_YYYYMMDD.zip` (e.g., `johndoe_20240224.zip`)
   - Respect .gitignore rules to exclude unnecessary files
   - Preserve file timestamps
   - Show you a list of included files and total size
   - Warn you if the zip is unusually large

3. Verify your submission zip file:
   - Extract the zip file to a new directory
   - Ensure all necessary files are included
   - Verify that no unnecessary files (like node_modules, __pycache__, etc.) are included
   - Test the application from the extracted files to ensure everything works

Once you have prepared the project for submission follow the instructions in the email to submit the project along with the video. 


---

## 🌍 Production Deployment

This project can be deployed to production using free-tier services. See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide.

### Quick Deployment Overview

1. **Cloudinary** - File storage (free tier: 25GB)
2. **Neon** - PostgreSQL database (free tier: 0.5GB)
3. **Railway** - Backend hosting (free tier available)
4. **Vercel** - Frontend hosting (free tier: unlimited)

For step-by-step deployment instructions, see:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [DEPLOYMENT_QUICK_START.md](DEPLOYMENT_QUICK_START.md) - Quick reference

---

## 📖 Additional Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment guide
- [DEPLOYMENT_QUICK_START.md](DEPLOYMENT_QUICK_START.md) - Quick deployment reference
- [DOCKER_README.md](DOCKER_README.md) - Docker-specific documentation
- [AllFeatures.md](AllFeatures.md) - Complete feature list
- [GITHUB_CHECKLIST.md](GITHUB_CHECKLIST.md) - GitHub upload checklist

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is open source and available for educational purposes.

---

## 🙏 Acknowledgments

- Django REST Framework for the robust API framework
- React and TanStack Query for the modern frontend stack
- All contributors and users of this project

