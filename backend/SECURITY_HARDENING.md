# File Upload Security Hardening Guide

This document outlines the comprehensive security measures implemented for the file upload system to prevent common vulnerabilities and ensure safe file handling.

## 🛡️ Security Features Overview

### 1. File Size Limits
- **Configurable maximum upload size** (default: 100MB)
- **Environment variable configuration**: `MAX_UPLOAD_SIZE`
- **Clear error messages** for oversized files

### 2. File Type Validation
- **MIME type detection** using multiple methods (python-magic, mimetypes, Django)
- **Extension-based validation** with allowlist/blocklist
- **Configurable allowed/blocked extensions** via environment variables
- **Default to `application/octet-stream`** for unknown types

### 3. Filename Security
- **Path traversal prevention** using `os.path.basename()`
- **Dangerous character sanitization** (replaced with underscores)
- **Length limits** (255 characters max)
- **Empty filename handling** (defaults to "unnamed_file")

### 4. Temporary File Security
- **Secure temp directory creation** with proper permissions (0o700)
- **Path validation** to ensure temp files stay within project bounds
- **Automatic cleanup** with safety checks
- **No temp file leaks** even on errors

## 🔧 Configuration

### Environment Variables

```bash
# File size limits (in bytes)
MAX_UPLOAD_SIZE=104857600  # 100MB

# Allowed file extensions (comma-separated, optional)
ALLOWED_FILE_EXTENSIONS=jpg,png,pdf,txt,doc,docx

# Blocked file extensions (comma-separated)
BLOCKED_FILE_EXTENSIONS=exe,com,bat,cmd,scr,pif,vbs,js,jar,msi,app

# Allowed MIME types (comma-separated, optional)
ALLOWED_MIME_TYPES=image/jpeg,image/png,application/pdf,text/plain
```

### Default Security Settings

```python
# Default blocked extensions (dangerous file types)
BLOCKED_FILE_EXTENSIONS = [
    'exe', 'com', 'bat', 'cmd', 'scr', 'pif', 
    'vbs', 'js', 'jar', 'msi', 'app'
]

# Default max upload size: 100MB
MAX_UPLOAD_SIZE = 100 * 1024 * 1024

# Temporary upload directory
UPLOAD_TEMP_DIR = os.path.join(BASE_DIR, 'temp_uploads')
```

## 🔍 Security Validation Process

### 1. File Size Validation
```python
def validate_file_size(file_obj):
    """Validate file size against configured maximum"""
    if file_obj.size > settings.MAX_UPLOAD_SIZE:
        max_size_mb = settings.MAX_UPLOAD_SIZE / (1024 * 1024)
        raise FileValidationError(
            f'File size ({file_obj.size / (1024 * 1024):.1f}MB) '
            f'exceeds maximum allowed size ({max_size_mb:.1f}MB)'
        )
```

### 2. Filename Sanitization
```python
def sanitize_filename(filename):
    """Sanitize filename to prevent path traversal and other security issues"""
    # Remove path traversal attempts
    filename = os.path.basename(filename)
    
    # Remove or replace dangerous characters
    filename = re.sub(r'[^\w\s\-\.]', '_', filename)
    
    # Normalize spaces and underscores
    filename = re.sub(r'[_\s]+', '_', filename)
    
    # Remove leading/trailing characters
    filename = filename.strip('_.')
    
    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        max_name_length = 255 - len(ext)
        filename = name[:max_name_length] + ext
    
    return filename or 'unnamed_file'
```

### 3. MIME Type Validation
```python
def validate_mime_type(file_obj):
    """Validate MIME type using multiple detection methods"""
    # Method 1: Django's content_type
    django_mime = file_obj.content_type or 'application/octet-stream'
    
    # Method 2: Python mimetypes (extension-based)
    python_mime, _ = mimetypes.guess_type(file_obj.name)
    python_mime = python_mime or 'application/octet-stream'
    
    # Method 3: python-magic (content-based) - most reliable
    try:
        file_obj.seek(0)
        sample = file_obj.read(2048)
        file_obj.seek(0)
        
        if sample:
            magic_mime = magic.from_buffer(sample, mime=True)
        else:
            magic_mime = 'application/octet-stream'
    except Exception:
        magic_mime = python_mime
    
    # Priority: magic > python_mimetypes > django_content_type
    detected_mime = magic_mime or python_mime or django_mime
    
    # Validate against allowed MIME types (if configured)
    if settings.ALLOWED_MIME_TYPES:
        if detected_mime not in settings.ALLOWED_MIME_TYPES:
            raise FileValidationError(
                f'MIME type "{detected_mime}" is not allowed'
            )
    
    return detected_mime
```

### 4. Extension Validation
```python
def validate_file_extension(filename):
    """Validate file extension against allowed/blocked lists"""
    ext = os.path.splitext(filename)[1].lower().lstrip('.')
    
    # Check blocked extensions
    if ext in [x.lower() for x in settings.BLOCKED_FILE_EXTENSIONS if x]:
        raise FileValidationError(
            f'File extension "{ext}" is not allowed for security reasons'
        )
    
    # Check allowed extensions (if configured)
    if settings.ALLOWED_FILE_EXTENSIONS:
        if ext not in [x.lower() for x in settings.ALLOWED_FILE_EXTENSIONS if x]:
            raise FileValidationError(
                f'File extension "{ext}" is not allowed'
            )
```

## 🛡️ Temporary File Security

### Secure Temp Directory Creation
```python
def ensure_temp_directory():
    """Ensure temporary upload directory exists and is secure"""
    temp_dir = settings.UPLOAD_TEMP_DIR
    
    # Create directory if it doesn't exist
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir, mode=0o700)  # Secure permissions
    
    # Ensure directory is within project bounds
    real_temp_dir = os.path.realpath(temp_dir)
    real_project_dir = os.path.realpath(settings.BASE_DIR)
    
    if not real_temp_dir.startswith(real_project_dir):
        raise FileValidationError(
            'Temporary directory path is outside project bounds'
        )
    
    return temp_dir
```

### Safe Temp File Creation
```python
def get_safe_temp_path(prefix='upload_', suffix='.tmp'):
    """Generate a safe temporary file path"""
    temp_dir = ensure_temp_directory()
    
    # Use secure temp file creation
    temp_fd, temp_path = tempfile.mkstemp(
        prefix=prefix,
        suffix=suffix,
        dir=temp_dir
    )
    
    # Close the file descriptor immediately
    os.close(temp_fd)
    
    return temp_path
```

### Secure Cleanup
```python
def cleanup_temp_file(file_path):
    """Safely cleanup temporary file"""
    try:
        if file_path and os.path.exists(file_path):
            # Ensure file is within temp directory
            real_file_path = os.path.realpath(file_path)
            real_temp_dir = os.path.realpath(settings.UPLOAD_TEMP_DIR)
            
            if real_file_path.startswith(real_temp_dir):
                os.unlink(file_path)
    except (OSError, IOError) as e:
        # Log error but don't raise - cleanup failures shouldn't break upload
        print(f"Warning: Failed to cleanup temp file {file_path}: {e}")
```

## 🚨 Security Threats Mitigated

### 1. Path Traversal Attacks
**Threat**: `../../../etc/passwd`
**Mitigation**: 
- Use `os.path.basename()` to extract only filename
- Validate paths are within project bounds
- Sanitize dangerous characters

### 2. File Size Exhaustion
**Threat**: Large file uploads consuming disk space
**Mitigation**:
- Configurable maximum file size
- Early validation before processing
- Clear error messages

### 3. Malicious File Types
**Threat**: Executable files, scripts, etc.
**Mitigation**:
- Blocked extensions list
- MIME type validation
- Content-based detection with python-magic

### 4. Temp File Leaks
**Threat**: Temporary files left on disk
**Mitigation**:
- Secure temp directory creation
- Automatic cleanup with safety checks
- Path validation before deletion

### 5. Filename-based Attacks
**Threat**: Special characters, null bytes, etc.
**Mitigation**:
- Character sanitization
- Length limits
- Default filename for empty cases

## 📊 Error Handling

### Clear Error Messages
```python
# File too large
{
    "error": "File size (150.5MB) exceeds maximum allowed size (100.0MB)"
}

# Blocked extension
{
    "error": "File extension \"exe\" is not allowed for security reasons"
}

# Invalid MIME type
{
    "error": "MIME type \"application/x-executable\" is not allowed"
}
```

### Graceful Degradation
- **Cleanup failures** don't break uploads
- **Missing dependencies** (python-magic) fall back to alternatives
- **Invalid configurations** use safe defaults

## 🧪 Testing

### Running Security Tests
```bash
# Run all security tests
python manage.py test files.test_security

# Run specific test classes
python manage.py test files.test_security.FileSecurityValidationTests
python manage.py test files.test_security.TempFileSecurityTests
python manage.py test files.test_security.FileUploadSecurityIntegrationTests
```

### Test Coverage
- ✅ File size validation
- ✅ Extension validation (allowed/blocked)
- ✅ Filename sanitization
- ✅ MIME type detection
- ✅ Path traversal prevention
- ✅ Temporary file security
- ✅ Integration testing

## 🔧 Production Deployment

### Recommended Settings
```python
# Production security settings
MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50MB for production
ALLOWED_FILE_EXTENSIONS = 'jpg,jpeg,png,gif,pdf,txt,doc,docx,xls,xlsx'
BLOCKED_FILE_EXTENSIONS = 'exe,com,bat,cmd,scr,pif,vbs,js,jar,msi,app,php,asp,aspx'
ALLOWED_MIME_TYPES = 'image/jpeg,image/png,image/gif,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
```

### Security Headers
```python
# Add to Django settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
```

### Monitoring
- **Log file upload attempts** (success/failure)
- **Monitor temp directory size**
- **Track blocked file attempts**
- **Alert on suspicious patterns**

## 🚨 Incident Response

### Suspicious Activity Indicators
- Multiple failed upload attempts
- Attempts to upload blocked file types
- Path traversal attempts in filenames
- Unusually large files

### Response Actions
1. **Log the incident** with full details
2. **Block the source** if necessary
3. **Review security logs** for patterns
4. **Update blocked lists** if needed
5. **Monitor for similar attempts**

## 📚 Additional Resources

- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [Django Security Documentation](https://docs.djangoproject.com/en/stable/topics/security/)
- [Python Security Best Practices](https://python-security.readthedocs.io/)

## 🔄 Maintenance

### Regular Tasks
- **Review blocked extensions** list
- **Update MIME type mappings**
- **Monitor temp directory** usage
- **Review security logs**
- **Update dependencies** (especially python-magic)

### Security Updates
- **Keep python-magic updated** for latest file type detection
- **Monitor CVE databases** for related vulnerabilities
- **Update Django** and other dependencies regularly
- **Review and update** security configurations
