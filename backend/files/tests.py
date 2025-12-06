"""
Tests for the files app.
"""

from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.conf import settings
from rest_framework.test import APITestCase
from rest_framework import status
from .models import File, FileBlob
import tempfile
import os


class FileModelTests(TestCase):
    """Test cases for File model."""
    
    def setUp(self):
        """Set up test data."""
        self.test_file = SimpleUploadedFile(
            "test.txt",
            b"test content",
            content_type="text/plain"
        )
    
    def test_file_creation(self):
        """Test creating a file."""
        file_obj = File.objects.create(
            original_filename="test.txt",
            file_type="text/plain",
            size=12
        )
        self.assertEqual(file_obj.original_filename, "test.txt")
        self.assertEqual(file_obj.file_type, "text/plain")
        self.assertEqual(file_obj.size, 12)


class FileBlobModelTests(TestCase):
    """Test cases for FileBlob model."""
    
    def test_blob_creation(self):
        """Test creating a file blob."""
        blob = FileBlob.objects.create(
            sha256="a" * 64,
            size=100,
            path="/test/path"
        )
        self.assertEqual(blob.sha256, "a" * 64)
        self.assertEqual(blob.size, 100)
        self.assertEqual(blob.path, "/test/path")


class FileUploadAPITests(APITestCase):
    """Test cases for file upload API."""
    
    def test_upload_file_success(self):
        """Test successful file upload."""
        with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
            tmp_file.write(b"test content")
            tmp_file.flush()
            
            with open(tmp_file.name, 'rb') as file:
                response = self.client.post('/api/files/', {
                    'file': file
                }, format='multipart')
        
        # Clean up
        os.unlink(tmp_file.name)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
    
    def test_upload_file_too_large(self):
        """Test file upload with file exceeding size limit."""
        # Create a file larger than the limit
        large_content = b"x" * (settings.MAX_UPLOAD_SIZE + 1024)
        
        with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
            tmp_file.write(large_content)
            tmp_file.flush()
            
            with open(tmp_file.name, 'rb') as file:
                response = self.client.post('/api/files/', {
                    'file': file
                }, format='multipart')
        
        # Clean up
        os.unlink(tmp_file.name)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_upload_blocked_extension(self):
        """Test file upload with blocked extension."""
        with tempfile.NamedTemporaryFile(suffix='.exe', delete=False) as tmp_file:
            tmp_file.write(b"test content")
            tmp_file.flush()
            
            with open(tmp_file.name, 'rb') as file:
                response = self.client.post('/api/files/', {
                    'file': file
                }, format='multipart')
        
        # Clean up
        os.unlink(tmp_file.name)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class FileListAPITests(APITestCase):
    """Test cases for file list API."""
    
    def test_get_files_list(self):
        """Test getting list of files."""
        response = self.client.get('/api/files/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)


class StorageStatsAPITests(APITestCase):
    """Test cases for storage stats API."""
    
    def test_get_storage_stats(self):
        """Test getting storage statistics."""
        response = self.client.get('/api/stats/storage/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('reported_total', response.data)
        self.assertIn('physical_total', response.data)
        self.assertIn('savings', response.data)
        self.assertIn('dedup_ratio', response.data)
