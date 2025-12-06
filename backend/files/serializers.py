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
                    
                    # The blob.path format: blobs/{hash_prefix}/{hash}
                    # Convert to Cloudinary public_id: secure-vault/blobs/{hash_prefix}_{hash}
                    blob_path = obj.blob.path
                    if blob_path.startswith('blobs/'):
                        # Remove 'blobs/' prefix and replace / with _
                        public_id = blob_path.replace('blobs/', '').replace('/', '_')
                        # Add folder prefix
                        public_id = f'secure-vault/blobs/{public_id}'
                        
                        # Generate Cloudinary URL
                        url, options = cloudinary_url(
                            public_id,
                            resource_type='auto',
                            secure=True,
                        )
                        return url
                except (ImportError, Exception) as e:
                    # Fallback to local URL if Cloudinary fails
                    pass
            
            # Local storage (development)
            return f"{settings.MEDIA_URL}{obj.blob.path}"
        elif hasattr(obj, 'file') and obj.file:
            return obj.file.url
        return None 