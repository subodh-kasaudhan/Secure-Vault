from django.db import models
import uuid
import os
import hashlib

def file_upload_path(instance, filename):
    """Generate file path for new file upload (legacy function for migrations)"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('uploads', filename)

def blob_upload_path(instance, filename):
    """Generate file path for blob storage based on SHA-256"""
    # Use first 2 chars of hash for directory structure
    hash_prefix = instance.sha256[:2]
    return os.path.join('blobs', hash_prefix, instance.sha256)

class FileBlob(models.Model):
    """Content blob storage with deduplication via SHA-256"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sha256 = models.CharField(max_length=64, unique=True, db_index=True, 
                             help_text="SHA-256 hash of file content")
    size = models.BigIntegerField(db_index=True, help_text="Size in bytes")
    path = models.CharField(max_length=500, help_text="Relative path under MEDIA_ROOT")
    ref_count = models.PositiveIntegerField(default=0, 
                                          help_text="Number of files referencing this blob")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sha256']),
            models.Index(fields=['size']),
            models.Index(fields=['created_at']),
            models.Index(fields=['ref_count']),
        ]
    
    def __str__(self):
        return f"Blob {self.sha256[:8]}... ({self.size} bytes, refs: {self.ref_count})"
    
    @classmethod
    def calculate_sha256(cls, file_obj):
        """Calculate SHA-256 hash of file content"""
        hasher = hashlib.sha256()
        for chunk in file_obj.chunks():
            hasher.update(chunk)
        return hasher.hexdigest()

class File(models.Model):
    """User-visible file record that references content blobs"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    blob = models.ForeignKey(FileBlob, on_delete=models.CASCADE, related_name='files', 
                            null=True, blank=True)
    # Legacy fields - will be removed after data migration
    file = models.FileField(upload_to=file_upload_path, null=True, blank=True)
    
    original_filename = models.CharField(max_length=255, db_index=True)
    file_type = models.CharField(max_length=100, db_index=True, 
                                help_text="MIME type")
    extension = models.CharField(max_length=10, blank=True, db_index=True,
                               help_text="File extension without dot")
    sensitive_detected = models.BooleanField(
        default=False,
        help_text="Whether the automated scanner found sensitive markers",
    )
    sensitive_markers = models.JSONField(
        default=list,
        blank=True,
        help_text="List of sensitive markers detected during upload",
    )
    sensitive_summary = models.CharField(
        max_length=255,
        blank=True,
        help_text="Human friendly summary of the sensitive markers",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['original_filename']),
            models.Index(fields=['file_type']),
            models.Index(fields=['extension']),
            models.Index(fields=['uploaded_at']),
            models.Index(fields=['blob', 'uploaded_at']),
            # Composite indices for common query patterns
            models.Index(fields=['file_type', 'uploaded_at']),
            models.Index(fields=['extension', 'uploaded_at']),
            # Index for size queries (via blob relationship)
            models.Index(fields=['uploaded_at', 'blob']),
        ]
    
    def __str__(self):
        return self.original_filename
    
    def get_size(self):
        """Size in bytes (from referenced blob or legacy field)"""
        if self.blob:
            return self.blob.size
        # Fallback to legacy size field during migration
        return getattr(self, '_size_legacy', 0)
    
    @property
    def size(self):
        """Size property for backward compatibility"""
        return self.get_size()
    
    @property
    def file_url(self):
        """URL to access the file content"""
        if self.blob and self.blob.path:
            from django.conf import settings
            
            # Check if using Cloudinary
            if 'CLOUDINARY_URL' in os.environ or getattr(settings, 'DEFAULT_FILE_STORAGE', '').endswith('MediaCloudinaryStorage'):
                try:
                    import cloudinary
                    from cloudinary.utils import cloudinary_url
                    
                    blob_path = self.blob.path
                    
                    # Check if path is already a Cloudinary public_id (starts with 'secure-vault/')
                    if blob_path.startswith('secure-vault/'):
                        # Already a Cloudinary public_id
                        public_id = blob_path
                    elif blob_path.startswith('blobs/'):
                        # Old format - convert to Cloudinary public_id
                        public_id_part = blob_path.replace('blobs/', '').replace('/', '_')
                        public_id = f'secure-vault/blobs/{public_id_part}'
                    else:
                        # Assume it's already a public_id or use as-is
                        public_id = blob_path
                    
                    # Generate Cloudinary URL with proper format
                    url, options = cloudinary_url(
                        public_id,
                        resource_type='auto',
                        secure=True,
                        format='auto',  # Let Cloudinary optimize
                    )
                    return url
                except (ImportError, Exception):
                    # Fallback to local URL if Cloudinary fails
                    pass
            
            # Local storage (development)
            return f"{settings.MEDIA_URL}{self.blob.path}"
        return None
    
    def save(self, *args, **kwargs):
        # Extract extension from filename if not set
        if not self.extension and self.original_filename:
            ext = os.path.splitext(self.original_filename)[1].lower().lstrip('.')
            self.extension = ext[:10]  # Limit to 10 chars
        super().save(*args, **kwargs)
