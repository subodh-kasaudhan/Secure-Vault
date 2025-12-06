from rest_framework import serializers
from .models import File, FileBlob

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
            return f"{settings.MEDIA_URL}{obj.blob.path}"
        elif hasattr(obj, 'file') and obj.file:
            return obj.file.url
        return None 