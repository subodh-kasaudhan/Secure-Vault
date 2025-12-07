from rest_framework import serializers
from .models import File, FileBlob
import os

class FileSerializer(serializers.ModelSerializer):
    size = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = File
        fields = [
            'id',
            'file_url',
            'original_filename',
            'file_type',
            'extension',
            'size',
            'uploaded_at',
            'sensitive_detected',
            'sensitive_markers',
            'sensitive_summary',
        ]
        read_only_fields = [
            'id',
            'uploaded_at',
            'extension',
            'size',
            'file_url',
            'sensitive_detected',
            'sensitive_markers',
            'sensitive_summary',
        ]
    
    def get_size(self, obj):
        """Get file size from blob or legacy field"""
        return obj.get_size()
    
    def get_file_url(self, obj):
        """Get file URL for download"""
        if obj.blob and obj.blob.path:
            from django.conf import settings
            
            # Check if using Cloudinary
            if 'CLOUDINARY_URL' in os.environ or getattr(settings, 'DEFAULT_FILE_STORAGE', '').endswith('MediaCloudinaryStorage'):
                try:
                    import cloudinary
                    from cloudinary.utils import cloudinary_url
                    
                    blob_path = obj.blob.path
                    
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
                except (ImportError, Exception) as e:
                    # Fallback to local URL if Cloudinary fails
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"Failed to generate Cloudinary URL: {e}")
                    pass
            
            # Local storage (development)
            return f"{settings.MEDIA_URL}{obj.blob.path}"
        elif hasattr(obj, 'file') and obj.file:
            return obj.file.url
        return None 