import os
import tempfile
import hashlib
import shutil
import logging
import requests
from datetime import datetime
from urllib.parse import quote
from django.shortcuts import render
from django.conf import settings
from django.db import transaction, models
from django.db.models import Q
from django.http import StreamingHttpResponse
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import api_view
from django.db.models import Sum, Count
from .models import File, FileBlob
from .serializers import FileSerializer
from .validators import (
    validate_file_security, 
    cleanup_temp_file, 
    get_safe_temp_path,
    FileValidationError
)
from .sensitive_scan import analyze_file_for_sensitive_content

logger = logging.getLogger(__name__)

# Create your views here.

class FilePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.select_related('blob').all()
    serializer_class = FileSerializer
    pagination_class = FilePagination

    def get_queryset(self):
        """Optimized queryset with proper select_related for all list operations"""
        return File.objects.select_related('blob').all()

    def list(self, request, *args, **kwargs):
        """List files with advanced filtering and search capabilities"""
        queryset = self.get_queryset()
        
        # Apply filters
        queryset = self._apply_filters(queryset, request.query_params)
        
        # Apply pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check total storage limit before processing
        try:
            current_stats = self._get_storage_stats()
            total_storage_limit = getattr(settings, 'TOTAL_STORAGE_LIMIT', 200 * 1024 * 1024)  # 200MB default
            
            # Check if adding this file would exceed the limit
            # Note: file_obj.size might not be accurate for streamed files, but it's a good first check
            if current_stats['physical_total'] + file_obj.size > total_storage_limit:
                limit_mb = total_storage_limit / (1024 * 1024)
                current_mb = current_stats['physical_total'] / (1024 * 1024)
                file_mb = file_obj.size / (1024 * 1024)
                return Response(
                    {
                        'error': f'Storage limit exceeded. Current usage: {current_mb:.1f}MB / {limit_mb:.1f}MB. This file ({file_mb:.1f}MB) would exceed the limit.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            # If storage check fails, log but continue (don't block upload)
            pass
        
        # Process upload with security validation and deduplication
        try:
            file_record = self._process_upload_with_security(file_obj)
            
            # Double-check storage limit after upload (in case of deduplication edge cases)
            final_stats = self._get_storage_stats()
            total_storage_limit = getattr(settings, 'TOTAL_STORAGE_LIMIT', 200 * 1024 * 1024)
            if final_stats['physical_total'] > total_storage_limit:
                # Rollback: delete the file we just created
                file_record.delete()
                limit_mb = total_storage_limit / (1024 * 1024)
                current_mb = final_stats['physical_total'] / (1024 * 1024)
                return Response(
                    {
                        'error': f'Storage limit exceeded after upload. Current usage: {current_mb:.1f}MB / {limit_mb:.1f}MB. Please delete some files to free up space.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            serializer = self.get_serializer(file_record)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except FileValidationError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Upload failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        """Delete a file and garbage-collect unreferenced blobs"""
        try:
            file_instance = self.get_object()
            blob = file_instance.blob
            
            # Delete the file record first
            file_instance.delete()
            
            # Handle blob garbage collection
            if blob:
                self._garbage_collect_blob(blob)
            
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except Exception as e:
            return Response(
                {'error': f'Delete failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _process_upload_with_security(self, file_obj):
        """Process file upload with comprehensive security validation and deduplication"""
        
        # Step 1: Comprehensive security validation
        validation_result = validate_file_security(file_obj)
        
        # Step 2: Stream file to secure temp location and compute SHA-256
        temp_path, file_hash, file_size = self._stream_and_hash_file_secure(file_obj)
        
        # Step 3: Analyze for sensitive content BEFORE moving/deleting temp file
        sensitive_result = analyze_file_for_sensitive_content(
            temp_path,
            extension=validation_result['extension'],
            mime_type=validation_result['mime_type'],
            original_filename=validation_result['original_filename'],
        )
        
        try:
            # Step 4: Check if blob already exists (with race condition safety)
            with transaction.atomic():
                blob, created = FileBlob.objects.get_or_create(
                    sha256=file_hash,
                    defaults={
                        'size': file_size,
                        'path': self._get_blob_path(file_hash),
                        'ref_count': 0
                    }
                )
                
                if created:
                    # New blob - move temp file to permanent location
                    cloudinary_public_id = self._move_temp_to_blob_storage(temp_path, blob.path)
                    
                    # If using Cloudinary, update blob.path with Cloudinary public_id
                    if cloudinary_public_id:
                        FileBlob.objects.filter(id=blob.id).update(path=cloudinary_public_id)
                        blob.path = cloudinary_public_id
                else:
                    # Existing blob - delete temp file (duplicate content)
                    cleanup_temp_file(temp_path)
                
                # Increment reference count atomically
                FileBlob.objects.filter(id=blob.id).update(
                    ref_count=models.F('ref_count') + 1
                )
                blob.refresh_from_db()

            # Step 5: Create File record with validated data
            file_record = File.objects.create(
                blob=blob,
                original_filename=validation_result['original_filename'],
                file_type=validation_result['mime_type'],
                extension=validation_result['extension'],
                sensitive_detected=sensitive_result.detected,
                sensitive_markers=sensitive_result.markers,
                sensitive_summary=sensitive_result.summary,
            )
            
            return file_record
            
        except Exception as e:
            # Cleanup temp file on any error
            cleanup_temp_file(temp_path)
            raise e

    def _process_upload_with_deduplication(self, file_obj):
        """Legacy method - now calls secure version"""
        return self._process_upload_with_security(file_obj)

    def _stream_and_hash_file_secure(self, file_obj):
        """Stream uploaded file to secure temp location while computing SHA-256 hash"""
        hasher = hashlib.sha256()
        file_size = 0
        
        # Create secure temporary file
        temp_path = get_safe_temp_path(prefix='upload_', suffix='.tmp')
        
        try:
            with open(temp_path, 'wb') as temp_file:
                # Stream file in chunks to avoid OOM
                for chunk in file_obj.chunks():
                    hasher.update(chunk)
                    temp_file.write(chunk)
                    file_size += len(chunk)
            
            return temp_path, hasher.hexdigest(), file_size
            
        except Exception as e:
            # Cleanup on error
            cleanup_temp_file(temp_path)
            raise e

    def _stream_and_hash_file(self, file_obj):
        """Legacy method - now calls secure version"""
        return self._stream_and_hash_file_secure(file_obj)

    def _get_blob_path(self, file_hash):
        """Generate blob storage path: blobs/{hash[:2]}/{hash}"""
        hash_prefix = file_hash[:2]
        return os.path.join('blobs', hash_prefix, file_hash)

    def _move_temp_to_blob_storage(self, temp_path, blob_relative_path):
        """Move temporary file to permanent blob storage location"""
        # Check if using Cloudinary (production) or local storage (development)
        if 'CLOUDINARY_URL' in os.environ or getattr(settings, 'DEFAULT_FILE_STORAGE', '').endswith('MediaCloudinaryStorage'):
            # Production: Upload to Cloudinary
            try:
                import cloudinary.uploader
                
                # Convert blob path to Cloudinary public_id format
                # blob_relative_path format: blobs/{hash_prefix}/{hash}
                # For Cloudinary: we'll use folder='secure-vault/blobs' and public_id={hash_prefix}_{hash}
                public_id_part = blob_relative_path.replace('blobs/', '').replace('/', '_')
                
                # Upload file to Cloudinary
                # Note: When using folder parameter, the public_id should NOT include the folder
                # Cloudinary will automatically combine folder + public_id
                result = cloudinary.uploader.upload(
                    temp_path,
                    folder='secure-vault/blobs',
                    public_id=public_id_part,  # Just the hash part, folder is separate
                    resource_type='auto',
                    overwrite=False,  # Don't overwrite if exists (deduplication)
                )
                
                # Get the actual public_id from Cloudinary response
                # This will be the full path: secure-vault/blobs/{hash_prefix}_{hash}
                cloudinary_public_id = result.get('public_id', f'secure-vault/blobs/{public_id_part}')
                
                # Clean up temp file
                cleanup_temp_file(temp_path)
                
                # Return the Cloudinary public_id so it can be stored in blob.path
                return cloudinary_public_id
            except Exception as e:
                # If Cloudinary upload fails, cleanup and re-raise
                cleanup_temp_file(temp_path)
                raise e
        else:
            # Development: Use local file storage
            blob_full_path = os.path.join(settings.MEDIA_ROOT, blob_relative_path)
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(blob_full_path), exist_ok=True)
            
            # Handle race condition: another process might have created the file
            if os.path.exists(blob_full_path):
                # File already exists (race condition), just remove temp file
                os.unlink(temp_path)
            else:
                # Move temp file to final location
                shutil.move(temp_path, blob_full_path)

    def _garbage_collect_blob(self, blob):
        """Decrement blob ref_count and clean up if no longer referenced"""
        with transaction.atomic():
            # Refresh and decrement ref_count atomically
            FileBlob.objects.filter(id=blob.id).update(
                ref_count=models.F('ref_count') - 1
            )
            blob.refresh_from_db()
            
            # If no more references, delete blob file and record
            if blob.ref_count <= 0:
                self._delete_blob_file(blob)
                blob.delete()

    def _delete_blob_file(self, blob):
        """Safely delete blob file from disk or Cloudinary with security checks"""
        if not blob.path:
            return
        
        # Check if using Cloudinary (production) or local storage (development)
        if 'CLOUDINARY_URL' in os.environ or getattr(settings, 'DEFAULT_FILE_STORAGE', '').endswith('MediaCloudinaryStorage'):
            # Production: Delete from Cloudinary
            try:
                import cloudinary.uploader
                
                # Extract public_id from blob path
                # Path format: blobs/{hash[:2]}/{hash}
                # Cloudinary public_id format: secure-vault/blobs/{hash[:2]}_{hash}
                public_id = blob.path.replace('blobs/', '').replace('/', '_')
                public_id = f'secure-vault/blobs/{public_id}'
                
                # Delete from Cloudinary
                cloudinary.uploader.destroy(public_id, resource_type='auto')
            except Exception as e:
                # Log the error but don't crash the API
                # Cloudinary deletion failures are non-critical
                pass
        else:
            # Development: Delete from local file system
            blob_full_path = os.path.join(settings.MEDIA_ROOT, blob.path)
            
            try:
                # Security check: ensure path is within MEDIA_ROOT
                if settings.MEDIA_ROOT:
                    real_blob_path = os.path.realpath(blob_full_path)
                    real_media_root = os.path.realpath(settings.MEDIA_ROOT)
                    
                    if not real_blob_path.startswith(real_media_root):
                        return
                
                if os.path.exists(blob_full_path):
                    os.unlink(blob_full_path)
                    
                    # Try to remove empty directory (ignore if not empty)
                    blob_dir = os.path.dirname(blob_full_path)
                    try:
                        os.rmdir(blob_dir)
                    except OSError:
                        # Directory not empty or other issues - that's fine
                        pass
            except OSError as e:
                # Log the error but don't crash the API
                # In production, you might want to use proper logging
                pass

    def _apply_filters(self, queryset, params):
        """Apply search and filtering parameters to queryset with optimized query patterns"""
        
        # Filename search (q parameter) - optimized for index usage
        q = params.get('q')
        if q:
            # Use case-insensitive search with index
            queryset = queryset.filter(original_filename__icontains=q)
        
        # File type filtering - optimized with composite indices
        file_type = params.get('file_type')
        if file_type:
            type_filters = self._build_file_type_filter(file_type)
            if type_filters:
                queryset = queryset.filter(type_filters)
        
        # Size range filtering - optimized with blob relationship
        min_size = params.get('min_size')
        max_size = params.get('max_size')
        if min_size or max_size:
            size_filters = self._build_size_filter(min_size, max_size)
            if size_filters:
                queryset = queryset.filter(size_filters)
        
        # Date range filtering - optimized with index
        date_from = params.get('date_from')
        date_to = params.get('date_to')
        if date_from or date_to:
            date_filters = self._build_date_filter(date_from, date_to)
            if date_filters:
                queryset = queryset.filter(date_filters)
        
        return queryset

    def _build_file_type_filter(self, file_type_param):
        """Build Q filter for file types with MIME mapping - optimized for index usage"""
        type_mapping = {
            'image': {
                'mime_prefixes': ['image/'],
                'extensions': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff', 'ico']
            },
            'pdf': {
                'mime_prefixes': ['application/pdf'],
                'extensions': ['pdf']
            },
            'video': {
                'mime_prefixes': ['video/'],
                'extensions': ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v']
            },
            'audio': {
                'mime_prefixes': ['audio/'],
                'extensions': ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a']
            },
            'doc': {
                'mime_prefixes': ['application/msword', 'application/vnd.openxmlformats-officedocument',
                                'application/vnd.ms-', 'text/', 'application/pdf'],
                'extensions': ['doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf']
            }
        }
        
        # Parse comma-separated file types
        requested_types = [t.strip().lower() for t in file_type_param.split(',')]
        
        # Build OR filters for each requested type - optimized for index usage
        type_filters = Q()
        for file_type in requested_types:
            if file_type in type_mapping:
                mapping = type_mapping[file_type]
                
                # MIME type prefix filters - use istartswith for index efficiency
                mime_filter = Q()
                for prefix in mapping['mime_prefixes']:
                    mime_filter |= Q(file_type__istartswith=prefix)
                
                # Extension filters - use iexact for exact match with index
                ext_filter = Q()
                for ext in mapping['extensions']:
                    ext_filter |= Q(extension__iexact=ext)
                
                # Combine MIME and extension filters with OR
                type_filters |= (mime_filter | ext_filter)
        
        return type_filters

    def _build_size_filter(self, min_size, max_size):
        """Build Q filter for size range"""
        size_filter = Q()
        
        try:
            if min_size:
                min_val = int(min_size)
                size_filter &= Q(blob__size__gte=min_val)
            
            if max_size:
                max_val = int(max_size)
                size_filter &= Q(blob__size__lte=max_val)
                
        except (ValueError, TypeError):
            # Invalid size parameters - ignore
            pass
        
        return size_filter

    def _get_storage_stats(self):
        """Helper method to get current storage statistics"""
        reported_total = File.objects.select_related('blob').aggregate(
            total=Sum('blob__size')
        )['total'] or 0
        
        physical_total = FileBlob.objects.aggregate(
            total=Sum('size')
        )['total'] or 0
        
        return {
            'reported_total': reported_total,
            'physical_total': physical_total,
            'savings': reported_total - physical_total,
        }

    def _build_date_filter(self, date_from, date_to):
        """Build Q filter for date range with proper timezone handling"""
        from django.utils import timezone
        from datetime import datetime, time
        
        date_filter = Q()
        
        try:
            if date_from:
                # Parse date and set to start of day in current timezone
                if 'T' in date_from:
                    # ISO datetime string - parse as is
                    from_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                    from_date = timezone.make_aware(from_date, timezone.get_current_timezone())
                else:
                    # Date only - set to start of day in current timezone
                    from_date = datetime.strptime(date_from, '%Y-%m-%d')
                    from_date = timezone.make_aware(from_date, timezone.get_current_timezone())
                
                date_filter &= Q(uploaded_at__gte=from_date)
            
            if date_to:
                # Parse date and set to end of day in current timezone
                if 'T' in date_to:
                    # ISO datetime string - parse as is
                    to_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                    to_date = timezone.make_aware(to_date, timezone.get_current_timezone())
                else:
                    # Date only - set to end of day in current timezone
                    to_date = datetime.combine(
                        datetime.strptime(date_to, '%Y-%m-%d').date(),
                        time(23, 59, 59, 999999)
                    )
                    to_date = timezone.make_aware(to_date, timezone.get_current_timezone())
                
                date_filter &= Q(uploaded_at__lte=to_date)
                
        except (ValueError, TypeError):
            # Invalid date parameters - ignore
            pass
        
        return date_filter


@api_view(['GET'])
def storage_stats(request):
    """
    Get storage statistics showing deduplication savings - optimized for performance
    
    Returns:
        - reported_total: Sum of sizes from all File records
        - physical_total: Sum of sizes from all FileBlob records  
        - savings: reported_total - physical_total
        - dedup_ratio: 1 - (physical_total / reported_total) with division by zero protection
    """
    # Optimized: Use single query with proper aggregation
    # Calculate reported total (sum of all File record sizes via their blobs)
    # This represents what users think they've stored
    reported_total = File.objects.select_related('blob').aggregate(
        total=Sum('blob__size')
    )['total'] or 0
    
    # Optimized: Use direct aggregation on FileBlob with index
    # Calculate physical total (sum of unique FileBlob sizes)
    # This represents actual disk usage
    physical_total = FileBlob.objects.aggregate(
        total=Sum('size')
    )['total'] or 0
    
    # Calculate savings
    savings = reported_total - physical_total
    
    # Calculate deduplication ratio with numeric stability
    if reported_total > 0:
        dedup_ratio = 1.0 - (physical_total / reported_total)
    else:
        dedup_ratio = 0.0
    
    return Response({
        'reported_total': reported_total,
        'physical_total': physical_total,
        'savings': savings,
        'dedup_ratio': round(dedup_ratio, 6)  # Round to 6 decimal places for precision
    })


@api_view(['GET'])
def download_file(request, file_id):
    """
    Download file endpoint - proxies Cloudinary downloads or serves local files
    This ensures proper CORS handling and URL resolution
    """
    try:
        # Get the file record
        try:
            file_record = File.objects.select_related('blob').get(id=file_id)
        except File.DoesNotExist:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if not file_record.blob or not file_record.blob.path:
            return Response({'error': 'File content not available'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if using Cloudinary
        if 'CLOUDINARY_URL' in os.environ or getattr(settings, 'DEFAULT_FILE_STORAGE', '').endswith('MediaCloudinaryStorage'):
            blob_path = file_record.blob.path
            public_id = None
            
            try:
                import cloudinary
                from cloudinary.utils import cloudinary_url
                
                # Determine Cloudinary public_id
                if blob_path.startswith('secure-vault/'):
                    public_id = blob_path
                elif blob_path.startswith('blobs/'):
                    public_id_part = blob_path.replace('blobs/', '').replace('/', '_')
                    public_id = f'secure-vault/blobs/{public_id_part}'
                else:
                    public_id = blob_path
                
                logger.info(f"Downloading file: public_id={public_id}, blob_path={blob_path}, file_type={file_record.file_type}, extension={file_record.extension}")
                
                # Determine resource type based on file MIME type or extension
                file_mime = file_record.file_type.lower() if file_record.file_type else ''
                file_ext = file_record.extension.lower() if file_record.extension else ''
                
                is_pdf = file_mime == 'application/pdf' or file_ext == 'pdf'
                is_image = file_mime.startswith('image/') or file_ext in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff', 'ico']
                
                # Build the list of resource types to try
                if is_pdf:
                    # PDFs uploaded with resource_type='auto' are stored as 'image' in Cloudinary
                    resource_types_to_try = ['image', 'raw']
                elif is_image:
                    resource_types_to_try = ['image', 'auto', 'raw']
                else:
                    resource_types_to_try = ['raw', 'auto', 'image']
                    
                # Images should use 'image', documents should use 'raw', PDFs can be either
                # resource_type = 'auto'  # Default fallback
                # Determine resource type
                # if file_mime.startswith('image/') or file_ext in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff', 'ico']:
                #     resource_type = 'image'
                # elif file_mime == 'application/pdf' or file_ext == 'pdf':
                #     # PDFs can be stored as 'image' or 'raw' in Cloudinary, try both
                #     resource_type = 'image'  # Try image first for PDFs
                # else:
                #     # Documents, text files, etc. use 'raw'
                #     resource_type = 'raw'
                
                # Try resource types in order: determined type -> auto -> image -> raw
                # resource_types_to_try = [resource_type]
                # if resource_type != 'auto':
                #     resource_types_to_try.append('auto')
                # if resource_type not in ['image', 'auto']:
                #     resource_types_to_try.append('image')
                # if resource_type != 'raw':
                #     resource_types_to_try.append('raw')
                
                last_error = None
                for rt in resource_types_to_try:
                    try:
                        logger.info(f"Trying resource_type={rt} for file {file_record.original_filename}")
                        
                        # Generate signed URL for upload type assets
                        url, options = cloudinary_url(
                            public_id,
                            resource_type=rt,
                            secure=True,
                            sign_url=True,  # Sign the URL for access
                            # Don't specify type - defaults to 'upload' which matches how files were uploaded
                        )
                        logger.info(f"Generated Cloudinary URL: {url}")
                        
                        # Fetch the file from Cloudinary
                        cloudinary_response = requests.get(url, stream=True, timeout=30)
                        cloudinary_response.raise_for_status()
                        
                        # Create a streaming response with correct content type
                        content_type = file_record.file_type or cloudinary_response.headers.get('Content-Type', 'application/octet-stream')
                        
                        response = StreamingHttpResponse(
                            cloudinary_response.iter_content(chunk_size=8192),
                            content_type=content_type
                        )
                        
                        # Set headers for file download
                        filename_encoded = quote(file_record.original_filename.encode('utf-8'))
                        response['Content-Disposition'] = f'attachment; filename*=UTF-8\'\'{filename_encoded}'
                        content_length = cloudinary_response.headers.get('Content-Length')
                        if content_length:
                            response['Content-Length'] = content_length
                        else:
                            response['Content-Length'] = str(file_record.size)
                        
                        logger.info(f"Successfully downloaded file using resource_type={rt}")
                        return response
                    except requests.RequestException as e:
                        last_error = e
                        logger.warning(f"Resource type '{rt}' failed for {file_record.original_filename}: {e}")
                        continue
                
                # If all resource types failed, raise the last error
                if last_error:
                    raise last_error
                else:
                    raise Exception("Failed to determine correct resource type")
                    
            except requests.RequestException as e:
                logger.error(f"Cloudinary download failed: {e}, public_id: {public_id}, blob_path: {blob_path}", exc_info=True)
                return Response(
                    {'error': f'Failed to download file from Cloudinary: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            except Exception as e:
                logger.error(f"Cloudinary download error: {e}, blob_path: {blob_path}, public_id: {public_id}", exc_info=True)
                return Response(
                    {'error': f'Failed to process download: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            # Local storage - serve the file directly
            file_path = os.path.join(settings.MEDIA_ROOT, file_record.blob.path)
            if not os.path.exists(file_path):
                return Response({'error': 'File not found on server'}, status=status.HTTP_404_NOT_FOUND)
            
            # Open and serve the file
            file_handle = open(file_path, 'rb')
            response = StreamingHttpResponse(
                file_handle,
                content_type='application/octet-stream'
            )
            response['Content-Disposition'] = f'attachment; filename="{file_record.original_filename}"'
            response['Content-Length'] = file_record.size
            return response
            
    except Exception as e:
        logger.error(f"Download endpoint error: {e}", exc_info=True)
        return Response(
            {'error': f'Download failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def remove_duplicates(request):
    """
    Remove duplicate files permanently from the database
    
    This endpoint:
    1. Identifies files that share the same blob (duplicates)
    2. Keeps the oldest file for each blob
    3. Deletes all other duplicate files
    4. Updates blob reference counts
    5. Returns statistics about the operation
    
    Returns:
        - removed_count: Number of duplicate files removed
        - blobs_affected: Number of blobs that had duplicates
        - updated_stats: Current storage statistics after removal
    """
    try:
        # Use transaction to ensure data consistency
        with transaction.atomic():
            # Find all blobs that have multiple files (duplicates)
            duplicate_blobs = FileBlob.objects.annotate(
                file_count=Count('files')
            ).filter(file_count__gt=1)
            
            removed_count = 0
            blobs_affected = 0
            
            for blob in duplicate_blobs:
                # Get all files for this blob, ordered by upload date
                files = blob.files.order_by('uploaded_at')
                
                # Keep the oldest file (first in the list)
                files_to_keep = files.first()
                
                # Delete all other files (duplicates)
                files_to_delete = files.exclude(id=files_to_keep.id)
                deleted_count = files_to_delete.count()
                
                if deleted_count > 0:
                    # Delete the duplicate files
                    files_to_delete.delete()
                    removed_count += deleted_count
                    blobs_affected += 1
                    
                    # Update blob reference count
                    blob.ref_count = 1  # Should be 1 after removing duplicates
                    blob.save()
            
            # Get updated storage statistics
            reported_total = File.objects.select_related('blob').aggregate(
                total=Sum('blob__size')
            )['total'] or 0
            
            physical_total = FileBlob.objects.aggregate(
                total=Sum('size')
            )['total'] or 0
            
            savings = reported_total - physical_total
            
            if reported_total > 0:
                dedup_ratio = 1.0 - (physical_total / reported_total)
            else:
                dedup_ratio = 0.0
            
            updated_stats = {
                'reported_total': reported_total,
                'physical_total': physical_total,
                'savings': savings,
                'dedup_ratio': round(dedup_ratio, 6)
            }
            
            return Response({
                'removed_count': removed_count,
                'blobs_affected': blobs_affected,
                'updated_stats': updated_stats,
                'message': f'Successfully removed {removed_count} duplicate files from {blobs_affected} blobs'
            })
            
    except Exception as e:
        return Response(
            {'error': f'Failed to remove duplicates: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
