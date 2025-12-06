# File Management System - Complete Features & Functionality Guide

## 🎯 Project Overview

A comprehensive file management system with content-based deduplication, advanced search/filtering, and modern web interface. Built with Django REST Framework backend and React TypeScript frontend.

## 🏗️ Architecture

### Backend (Django REST Framework)
- **Framework**: Django 5.1.6 with Django REST Framework
- **Database**: SQLite with optimized indexing
- **Storage**: Two-tier deduplication system (FileBlob + File models)
- **Security**: Comprehensive file upload validation and hardening
- **Performance**: Optimized queries with composite indices
- **Timezone**: Asia/Kolkata timezone support with proper date handling

### Frontend (React TypeScript)
- **Framework**: React 18 with TypeScript
- **State Management**: React Query (@tanstack/react-query)
- **HTTP Client**: Axios with robust error handling
- **Styling**: Tailwind CSS with responsive design and PostCSS processing
- **Routing**: React Router with URL persistence
- **Build System**: Production-optimized build with static file serving

## 🔧 Core Features

### 1. Content-Based Deduplication System

#### Two-Tier Storage Architecture
- **FileBlob Model**: Stores unique file content with SHA-256 hashing
  - `sha256`: Unique content identifier (64 chars)
  - `size`: File size in bytes
  - `path`: Relative storage path under MEDIA_ROOT
  - `ref_count`: Reference counter for garbage collection (defaults to 0)
  - `created_at`/`updated_at`: Timestamps

- **File Model**: User-visible file records
  - Links to FileBlob via foreign key
  - Stores metadata (filename, MIME type, extension)
  - Legacy support for direct file storage during migration

#### Deduplication Process
1. **Upload**: Stream file to temporary location
2. **Hash Calculation**: Compute SHA-256 on-the-fly (no memory loading)
3. **Blob Lookup**: Check if SHA-256 exists in FileBlob table
4. **Deduplication**: 
   - If exists: Increment `ref_count` atomically, delete temp file
   - If new: Create FileBlob record with `ref_count=0`, move temp file to blob storage, then increment `ref_count` to 1 atomically
5. **File Record**: Create File record linking to blob

#### Garbage Collection
- **Delete Process**: Decrement blob `ref_count` on file deletion
- **Cleanup**: Remove blob file and record when `ref_count` reaches 0
- **Robustness**: Handles missing disk files gracefully

### 2. Advanced Search & Filtering System

#### Query Parameters
- **`q`**: Case-insensitive filename search (substring matching)
- **`file_type`**: Comma-separated categories (image, pdf, video, audio, doc)
- **`min_size`/`max_size`**: File size range in bytes
- **`date_from`/`date_to`**: ISO date range for upload dates

#### Timezone-Aware Date Filtering
- **Local Timezone Support**: Configurable timezone (default: Asia/Kolkata)
- **Proper Date Boundaries**: Start of day (00:00:00) to end of day (23:59:59)
- **Timezone Conversion**: Automatic handling of date-only vs datetime strings
- **Docker Integration**: Container timezone environment variable support

#### Filter Categories
- **Image**: jpg, jpeg, png, gif, bmp, webp, svg
- **PDF**: pdf files
- **Video**: mp4, avi, mov, wmv, flv, webm, mkv
- **Audio**: mp3, wav, flac, aac, ogg, wma
- **Document**: pdf, txt, doc, docx, rtf

#### Filter Logic
- **AND Semantics**: All filters applied cumulatively
- **OR within file_type**: Multiple categories supported
- **Optimized Queries**: Leverages database indices

### 3. Storage Analytics & Metrics

#### Storage Statistics Endpoint (`/api/stats/storage/`)
- **Reported Total**: Sum of all File sizes (user-visible)
- **Physical Total**: Sum of FileBlob sizes (actual disk usage)
- **Savings**: Reported Total - Physical Total
- **Dedup Ratio**: 1 - (Physical Total / Reported Total)

#### Duplicate Management System
- **Remove Duplicates API**: `/api/files/remove-duplicates/` endpoint
- **Atomic Operations**: Transaction-based duplicate removal
- **Keep Oldest Strategy**: Preserves the oldest file, removes newer duplicates
- **Statistics Update**: Automatic stats refresh after duplicate removal
- **User Interface**: "Remove Duplicates" button in Storage Stats component
- **Loading States**: Visual feedback during duplicate removal process
- **Error Handling**: Comprehensive error handling for duplicate removal operations

### 4. File Upload System

#### Security Hardening
- **Max Upload Size**: Configurable limit (default: 10MB)
- **File Extension Validation**: Whitelist/blacklist support
- **MIME Type Detection**: Uses `python-magic` with fallback
- **Filename Sanitization**: Prevents path traversal attacks
- **Temporary File Security**: Secure temp directory handling

#### Upload Process
1. **Validation**: Size, extension, MIME type checks
2. **Streaming**: Process file in chunks (no OOM risk)
3. **Deduplication**: Check for existing content
4. **Storage**: Move to appropriate location
5. **Cleanup**: Remove temporary files

#### Enhanced Error Handling
- **Client-Side Validation**: Immediate feedback before upload
  - File size validation (10MB limit)
  - Blocked extension validation (exe, com, bat, etc.)
  - User-friendly error messages with emojis
- **Error Display**: Professional UI with auto-clearing
  - Clear error messages: "❌ File too large: 15MB (max: 10MB)"
  - Security-focused messages: "🚫 File type "EXE" is blocked for security"
  - 5-second auto-clear timeout
  - Accessibility support with ARIA labels
- **Configuration Management**: Centralized settings
  - All limits in `API_CONFIG`
  - Easy to modify file size limits
  - Configurable blocked extensions list

#### Sensitive Document Detection & Alerts
- **Server-Side Scanning**: Python-based scanner parses PDF, TXT, DOC, DOCX, and RTF uploads with `pypdf`, `python-docx`, `striprtf`, and `textract`
- **NLP Assist**: Optional spaCy (`en_core_web_sm`) entities enhance detection of emails and credential hints
- **Configurable Limits**: Environment flags (`SENSITIVE_SCAN_*`) control file types, size caps, and PDF page limits
- **Structured Results**: Each `File` record stores `sensitive_detected`, `sensitive_markers`, and a friendly `sensitive_summary`
- **Frontend Notifications**: Upload responses trigger a 5-second amber notice describing detected items (e.g., username, password, email)
- **File List Badges**: Sensitive uploads display inline badges reminding users before sharing

### 5. File Management Operations

#### Download System
- **Robust Downloads**: Blob-based download with progress tracking
- **Filename Preservation**: Original filename maintained
- **Error Handling**: Comprehensive error states
- **URL Management**: Object URL cleanup after download

#### Delete System
- **Reference Counting**: Decrements blob references
- **Garbage Collection**: Removes unused blobs
- **Cascade Protection**: Handles missing files gracefully

### 6. Edge Cases & Error Handling

#### Input Validation & Edge Cases
- **Size Range Validation**: Prevents min size > max size with automatic correction
- **Date Range Validation**: Prevents from date > to date with automatic correction
- **Focus Preservation**: Maintains input focus during debounced updates
- **Invalid Input Handling**: Graceful handling of malformed user input
- **Empty State Management**: Contextual empty states for different scenarios

#### Filter State Management
- **URL Synchronization**: Bidirectional sync between URL and component state
- **External Clear Triggers**: Support for clearing filters from external components
- **State Persistence**: Filter state survives page refreshes
- **Component Communication**: Ref-based communication for filter clearing

#### Error Recovery & Resilience
- **Network Error Handling**: Graceful degradation on connection issues
- **File System Errors**: Handles missing files and disk errors
- **Database Errors**: Robust error handling for database operations
- **Memory Management**: Efficient cleanup of temporary resources

## 🎨 User Interface Features

### 1. Modern React Components

#### Storage Stats Card
- **Real-time Metrics**: Auto-refreshes on file operations
- **Interactive Tooltips**: Information buttons with detailed explanations
- **Human-readable Formats**: Pretty bytes formatting
- **Visual Indicators**: Color-coded savings display

#### File Upload Component
- **Drag & Drop**: Modern file upload interface
- **Progress Tracking**: Visual upload progress
- **Enhanced Error Handling**: Specific, user-friendly error messages
  - File size validation with exact size display
  - Blocked file type validation with security messaging
  - Auto-clearing error display with emojis
  - Real-time validation before upload attempts
- **Success Feedback**: Clear success states

#### Advanced Filters Bar
- **Search Input**: Debounced filename search
- **Multi-select**: File type category selection
- **Range Inputs**: Size and date range filters with validation
- **URL Persistence**: Filter state saved in URL
- **Real-time Updates**: Instant filter application
- **Input Validation**: Real-time validation with automatic correction
- **Focus Management**: Preserves input focus during updates
- **Toast Notifications**: User-friendly validation error messages

#### File List Component
- **Pagination**: Efficient large dataset handling
- **Sorting**: Multiple sort options
- **Action Buttons**: Download and delete operations
- **Empty States**: Contextual empty state messages with appropriate actions
- **Loading States**: Skeleton loading indicators
- **Conditional Empty States**: Different messages for "no files" vs "no matching files"
- **Clear Filters Integration**: Seamless integration with filter clearing

### 2. Responsive Design
- **Mobile-First**: Optimized for all screen sizes
- **Flexible Layout**: Adaptive component positioning
- **Touch-Friendly**: Mobile-optimized interactions

### 3. Accessibility Features
- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Proper focus indicators and preservation
- **Color Contrast**: WCAG compliant color schemes
- **Error Announcements**: Screen reader announcements for validation errors
- **Interactive Elements**: Proper ARIA roles and states

## 🔒 Security Features

### 1. File Upload Security
- **Size Validation**: Enforces upload limits
- **Extension Validation**: Whitelist/blacklist approach
- **MIME Type Detection**: Content-based type detection
- **Filename Sanitization**: Removes dangerous characters

### 2. Path Security
- **Path Traversal Prevention**: Sanitized file paths
- **Secure Temp Directory**: Isolated temporary storage
- **File Cleanup**: Automatic temporary file removal

## ⚡ Performance Optimizations

### 1. Database Indexing
- **Composite indices**: Optimized for common query patterns
- **Single field indices**: Fast lookups on individual fields
- **Relationship indices**: Efficient foreign key queries

### 2. Query Optimization
- **Select Related**: Prevents N+1 queries
- **Efficient Aggregation**: Optimized storage stats calculation
- **Index Usage**: All filters leverage database indices

### 3. Frontend Performance
- **React Query**: Intelligent caching and background updates
- **Debounced Search**: Reduces API calls
- **Pagination**: Efficient large dataset handling
- **Lazy Loading**: Component-level code splitting
- **Focus Optimization**: Efficient focus management without unnecessary re-renders
- **State Synchronization**: Optimized URL and component state sync

## 🧪 Testing & Quality Assurance

### 1. Backend Testing
- **Deduplication Tests**: Verify content-based deduplication
- **Filter Tests**: Comprehensive search/filter validation
- **Security Tests**: File upload security validation
- **Garbage Collection Tests**: Reference counting verification

### 2. Test Coverage
- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end workflow testing
- **Security Tests**: File validation and sanitization
- **Performance Tests**: Query optimization verification
- **Edge Case Tests**: Input validation and error handling
- **UI Interaction Tests**: Focus management and user interactions

## 🚀 Deployment & Operations

### 1. Docker Support
- **Multi-container Setup**: Backend and frontend containers
- **Volume Persistence**: Named volumes for data persistence
- **Environment Configuration**: Configurable via environment variables
- **Hot Reload**: Development-friendly container setup

### 2. Environment Variables
- **Backend**: Django settings, CORS, upload limits
- **Frontend**: API URL, polling settings
- **Security**: Allowed extensions, MIME types

### 3. Production Considerations
- **Static File Serving**: Optimized for production
- **Database Migration**: Safe migration strategies
- **Security Hardening**: Production-ready security settings
- **Monitoring**: Health check endpoints

## 📊 API Endpoints

### 1. File Management
- **`GET /api/files/`**: List files with filtering
- **`POST /api/files/`**: Upload file with deduplication
- **`DELETE /api/files/{id}/`**: Delete file with garbage collection
- **`POST /api/files/remove-duplicates/`**: Remove duplicate files with atomic operations

### 2. Storage Analytics
- **`GET /api/stats/storage/`**: Storage statistics and deduplication metrics

### 3. File Download
- **`GET /media/blobs/{path}`**: Direct file access (via generated URLs)

## 🔧 Development Tools

### 1. Startup Scripts
- **`start-services.bat`**: Windows batch script for easy startup
- **`start-services.ps1`**: PowerShell script with monitoring

### 2. Development Features
- **Hot Reload**: Automatic code reloading
- **Type Safety**: Full TypeScript support
- **Error Boundaries**: Graceful error handling
- **Development Tools**: React Query DevTools

### 3. Debugging Support
- **Comprehensive Logging**: Detailed operation logs
- **Error Tracking**: Structured error reporting
- **Performance Monitoring**: Query performance analysis

## 📈 Scalability Features

### 1. Database Scalability
- **Efficient Indexing**: Optimized for large datasets
- **Query Optimization**: Minimal database load
- **Connection Pooling**: Efficient database connections

### 2. Storage Scalability
- **Deduplication**: Reduces storage requirements
- **Efficient Cleanup**: Automatic garbage collection
- **Flexible Storage**: Configurable storage backends

### 3. Application Scalability
- **Stateless Design**: Horizontal scaling support
- **Caching**: React Query intelligent caching
- **Pagination**: Efficient large dataset handling

## 🎯 Key Improvements & Innovations

### 1. Content-Based Deduplication
- **SHA-256 Hashing**: Cryptographic content identification
- **Reference Counting**: Efficient storage management
- **Garbage Collection**: Automatic cleanup of unused content

### 2. Advanced Filtering
- **Multi-category Support**: Flexible file type categorization
- **URL Persistence**: Shareable filter states
- **Real-time Updates**: Instant filter application

### 3. Security Hardening
- **Comprehensive Validation**: Multi-layer security checks
- **Path Security**: Traversal attack prevention
- **Content Detection**: MIME type validation

### 4. User Experience
- **Modern UI**: Clean, responsive interface
- **Accessibility**: Full accessibility compliance
- **Error Handling**: User-friendly error states
- **Performance**: Fast, responsive interactions

## 📋 Feature Checklist

### ✅ Core Functionality
- [x] File upload with deduplication
- [x] File download with original filename
- [x] File deletion with garbage collection
- [x] Advanced search and filtering
- [x] Storage analytics and metrics
- [x] Pagination for large datasets

### ✅ Security Features
- [x] File upload validation
- [x] MIME type detection
- [x] Filename sanitization
- [x] Path traversal prevention
- [x] Configurable security settings

### ✅ Performance Features
- [x] Database indexing optimization
- [x] Query optimization
- [x] Frontend caching
- [x] Efficient file streaming
- [x] Background processing

### ✅ User Experience
- [x] Responsive design
- [x] Accessibility compliance
- [x] Error handling
- [x] Loading states
- [x] Interactive tooltips

### ✅ Development Features
- [x] Hot reload support
- [x] TypeScript integration
- [x] Comprehensive testing
- [x] Docker deployment
- [x] Environment configuration


### 5. Edge Case Handling
- **Input Validation**: Real-time validation with automatic correction
- **State Management**: Robust filter state synchronization
- **Error Recovery**: Comprehensive error handling and recovery
- **Focus Management**: Intelligent focus preservation

## 📋 Feature Checklist

### ✅ Core Functionality
- [x] File upload with deduplication
- [x] File download with original filename
- [x] File deletion with garbage collection
- [x] Advanced search and filtering
- [x] Storage analytics and metrics
- [x] Pagination for large datasets

### ✅ Security Features
- [x] File upload validation
- [x] MIME type detection
- [x] Filename sanitization
- [x] Path traversal prevention
- [x] Configurable security settings

### ✅ Performance Features
- [x] Database indexing optimization
- [x] Query optimization
- [x] Frontend caching
- [x] Efficient file streaming
- [x] Background processing

### ✅ User Experience
- [x] Responsive design
- [x] Accessibility compliance
- [x] Error handling
- [x] Loading states
- [x] Interactive tooltips

### ✅ Development Features
- [x] Hot reload support
- [x] TypeScript integration
- [x] Comprehensive testing
- [x] Docker deployment
- [x] Environment configuration

### ✅ Edge Cases & Error Handling
- [x] Input validation with automatic correction
- [x] Focus preservation during updates
- [x] Conditional empty states
- [x] Filter state synchronization
- [x] Component communication via refs
- [x] Toast notifications for validation errors
- [x] Network error handling
- [x] File system error recovery

### ✅ File Upload Error Handling
- [x] Client-side file size validation (10MB limit)
- [x] Blocked file extension validation (security-focused)
- [x] User-friendly error messages with emojis
- [x] Auto-clearing error display (5-second timeout)
- [x] Real-time validation before upload attempts
- [x] Centralized configuration management
- [x] Professional error UI with accessibility support

### ✅ Duplicate Management
- [x] Remove duplicates API endpoint with atomic operations
- [x] Keep oldest file strategy for duplicate removal
- [x] Automatic statistics update after duplicate removal
- [x] User interface integration with loading states
- [x] Comprehensive error handling for duplicate operations

### ✅ Timezone & Internationalization
- [x] Asia/Kolkata timezone support
- [x] Proper date boundary handling (start/end of day)
- [x] Timezone-aware date filtering
- [x] Docker container timezone configuration
- [x] Automatic timezone conversion for date inputs

## 🔄 Recent Improvements & Fixes

### Duplicate Management System (Latest Update)
- **Added**: Remove duplicates API endpoint with atomic transaction support
- **Implemented**: Keep oldest file strategy for duplicate removal
- **Enhanced**: Automatic statistics refresh after duplicate removal
- **Added**: User interface integration with "Remove Duplicates" button
- **Implemented**: Loading states and error handling for duplicate operations
- **Added**: Comprehensive error handling and user feedback

### Build System Improvements (Latest Update)
- **Added**: PostCSS configuration for Tailwind CSS processing
- **Enhanced**: Production-optimized build system with static file serving
- **Improved**: Docker container configuration for production deployment
- **Added**: Proper CSS compilation and optimization

### Timezone Handling (Latest Update)
- **Fixed**: Date filtering inconsistency with IST timezone
- **Added**: Asia/Kolkata timezone configuration in Django settings
- **Improved**: Date boundary handling for proper start/end of day filtering
- **Enhanced**: Timezone-aware datetime parsing in backend API
- **Configured**: Docker container timezone environment variable

### Code Quality Improvements
- **Cleaned**: Removed all console.log and print statements for production readiness
- **Optimized**: Date filtering logic with proper timezone conversion
- **Enhanced**: Error handling in date parsing with informative logging
- **Improved**: Docker configuration with timezone support

### Enhanced File Upload Error Handling (Latest Update)
- **Added**: Client-side file size validation with specific error messages
- **Added**: Blocked file extension validation with security-focused messaging
- **Improved**: User-friendly error display with emojis and clear messaging
- **Enhanced**: Auto-clearing error messages (5-second timeout)
- **Added**: Real-time validation before upload attempts
- **Improved**: Centralized configuration for file size limits and blocked extensions
- **Enhanced**: Professional error UI with icons and accessibility support

## 🎉 Summary

This File Management System represents a comprehensive solution for modern file storage needs, featuring:

1. **Innovative Deduplication**: Content-based storage optimization
2. **Advanced Filtering**: Powerful search and categorization with timezone support
3. **Security First**: Comprehensive security hardening
4. **Performance Optimized**: Efficient database and frontend design
5. **User Friendly**: Modern, accessible interface
6. **Production Ready**: Docker deployment and monitoring
7. **Robust Error Handling**: Comprehensive edge case management
8. **Timezone Aware**: Proper local timezone support for global users

The system successfully combines cutting-edge technology with practical usability, providing a robust foundation for file management applications with exceptional attention to edge cases, user experience, and international timezone requirements.

