"""
File validation utilities for security hardening
"""

import os
import re
import mimetypes
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

# Try to import magic, but handle gracefully if not available
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False
    magic = None


class FileValidationError(ValidationError):
    """Custom exception for file validation errors"""
    pass


def validate_file_size(file_obj):
    """
    Validate file size against configured maximum
    
    Args:
        file_obj: Django UploadedFile object
        
    Raises:
        FileValidationError: If file is too large
    """
    if file_obj.size > settings.MAX_UPLOAD_SIZE:
        max_size_mb = settings.MAX_UPLOAD_SIZE / (1024 * 1024)
        raise FileValidationError(
            _('File size ({file_size_mb:.1f}MB) exceeds maximum allowed size ({max_size_mb:.1f}MB)').format(
                file_size_mb=file_obj.size / (1024 * 1024),
                max_size_mb=max_size_mb
            )
        )


def validate_file_extension(filename):
    """
    Validate file extension against allowed/blocked lists
    
    Args:
        filename: Original filename
        
    Raises:
        FileValidationError: If extension is blocked or not allowed
    """
    if not filename:
        raise FileValidationError(_('Filename is required'))
    
    # Extract extension (case-insensitive)
    ext = os.path.splitext(filename)[1].lower().lstrip('.')
    
    # Check blocked extensions
    if ext in [x.lower() for x in settings.BLOCKED_FILE_EXTENSIONS if x]:
        raise FileValidationError(
            _('File extension "{ext}" is not allowed for security reasons').format(ext=ext)
        )
    
    # Check allowed extensions (if configured)
    if settings.ALLOWED_FILE_EXTENSIONS and ext not in [x.lower() for x in settings.ALLOWED_FILE_EXTENSIONS if x]:
        allowed_exts = ', '.join(settings.ALLOWED_FILE_EXTENSIONS)
        raise FileValidationError(
            _('File extension "{ext}" is not allowed. Allowed extensions: {allowed_exts}').format(
                ext=ext, allowed_exts=allowed_exts
            )
        )


def validate_mime_type(file_obj):
    """
    Validate MIME type using multiple detection methods
    
    Args:
        file_obj: Django UploadedFile object
        
    Returns:
        str: Validated MIME type
        
    Raises:
        FileValidationError: If MIME type is not allowed
    """
    # Method 1: Django's content_type
    django_mime = file_obj.content_type or 'application/octet-stream'
    
    # Method 2: Python mimetypes (extension-based)
    ext = os.path.splitext(file_obj.name)[1].lower()
    python_mime, _ = mimetypes.guess_type(file_obj.name)
    python_mime = python_mime or 'application/octet-stream'
    
    # Method 3: python-magic (content-based) - most reliable
    if MAGIC_AVAILABLE:
        try:
            # Read first 2048 bytes for magic detection
            file_obj.seek(0)
            sample = file_obj.read(2048)
            file_obj.seek(0)  # Reset position
            
            if sample:
                magic_mime = magic.from_buffer(sample, mime=True)
            else:
                magic_mime = 'application/octet-stream'
        except Exception:
            # Fallback if magic detection fails
            magic_mime = python_mime
    else:
        # Magic not available, use python_mimetypes as fallback
        magic_mime = python_mime
    
    # Priority: magic > python_mimetypes > django_content_type
    detected_mime = magic_mime or python_mime or django_mime
    
    # Validate against allowed MIME types (if configured)
    if settings.ALLOWED_MIME_TYPES:
        if detected_mime not in settings.ALLOWED_MIME_TYPES:
            allowed_mimes = ', '.join(settings.ALLOWED_MIME_TYPES)
            raise FileValidationError(
                _('MIME type "{mime}" is not allowed. Allowed types: {allowed_mimes}').format(
                    mime=detected_mime, allowed_mimes=allowed_mimes
                )
            )
    
    return detected_mime


def sanitize_filename(filename):
    """
    Sanitize filename to prevent path traversal and other security issues
    
    Args:
        filename: Original filename
        
    Returns:
        str: Sanitized filename
    """
    if not filename:
        return 'unnamed_file'
    
    # Remove path traversal attempts
    filename = os.path.basename(filename)
    
    # Remove or replace dangerous characters
    # Keep alphanumeric, dots, hyphens, underscores, spaces
    filename = re.sub(r'[^\w\s\-\.]', '_', filename)
    
    # Remove multiple consecutive underscores/spaces
    filename = re.sub(r'[_\s]+', '_', filename)
    
    # Remove leading/trailing underscores and dots
    filename = filename.strip('_.')
    
    # Remove trailing underscores that might be left after sanitization
    filename = filename.rstrip('_')
    
    # Ensure filename is not empty after sanitization
    if not filename:
        return 'unnamed_file'
    
    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        max_name_length = 255 - len(ext)
        filename = name[:max_name_length] + ext
    
    return filename


def validate_file_security(file_obj):
    """
    Comprehensive file security validation
    
    Args:
        file_obj: Django UploadedFile object
        
    Returns:
        dict: Validation results with sanitized data
        
    Raises:
        FileValidationError: If file fails security checks
    """
    # Validate file size
    validate_file_size(file_obj)
    
    # Validate and sanitize filename
    original_filename = file_obj.name
    sanitized_filename = sanitize_filename(original_filename)
    validate_file_extension(sanitized_filename)
    
    # Validate MIME type
    detected_mime = validate_mime_type(file_obj)
    
    # Extract extension from sanitized filename
    extension = os.path.splitext(sanitized_filename)[1].lower().lstrip('.')
    
    return {
        'original_filename': original_filename,
        'sanitized_filename': sanitized_filename,
        'mime_type': detected_mime,
        'extension': extension,
        'size': file_obj.size
    }


def ensure_temp_directory():
    """
    Ensure temporary upload directory exists and is secure
    
    Returns:
        str: Path to temp directory
    """
    temp_dir = settings.UPLOAD_TEMP_DIR
    
    # Create directory if it doesn't exist
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir, mode=0o700)  # Secure permissions
    
    # Ensure directory is within project bounds
    real_temp_dir = os.path.realpath(temp_dir)
    real_project_dir = os.path.realpath(settings.BASE_DIR)
    
    if not real_temp_dir.startswith(real_project_dir):
        raise FileValidationError(
            _('Temporary directory path is outside project bounds')
        )
    
    return temp_dir


def cleanup_temp_file(file_path):
    """
    Safely cleanup temporary file
    
    Args:
        file_path: Path to temporary file
    """
    try:
        if file_path and os.path.exists(file_path):
            # Ensure file is within temp directory
            real_file_path = os.path.realpath(file_path)
            real_temp_dir = os.path.realpath(settings.UPLOAD_TEMP_DIR)
            
            if real_file_path.startswith(real_temp_dir):
                os.unlink(file_path)
    except (OSError, IOError) as e:
        # Log error but don't raise - cleanup failures shouldn't break upload
        pass


def get_safe_temp_path(prefix='upload_', suffix='.tmp'):
    """
    Generate a safe temporary file path
    
    Args:
        prefix: File prefix
        suffix: File suffix
        
    Returns:
        str: Safe temporary file path
    """
    temp_dir = ensure_temp_directory()
    
    # Use secure temp file creation
    import tempfile
    temp_fd, temp_path = tempfile.mkstemp(
        prefix=prefix,
        suffix=suffix,
        dir=temp_dir
    )
    
    # Close the file descriptor immediately
    os.close(temp_fd)
    
    return temp_path
