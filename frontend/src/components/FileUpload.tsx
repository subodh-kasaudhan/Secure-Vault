import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CloudArrowUpIcon, XMarkIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { useFiles } from '../hooks/useFiles';
import { API_CONFIG } from '../config/api';

interface FileUploadProps {
  onUploadSuccess?: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<number>(0);
  const [sensitiveNotice, setSensitiveNotice] = useState<string | null>(null);
  const [noticeKey, setNoticeKey] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sensitiveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { uploadFile, isUploading, uploadError } = useFiles();

  useEffect(() => {
    return () => {
      if (sensitiveTimeoutRef.current) {
        clearTimeout(sensitiveTimeoutRef.current);
      }
    };
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    if (!file) return;

    // Clear any previous errors and timeouts
    setLocalError(null);
    setErrorKey((prev: number) => prev + 1);
    if (sensitiveTimeoutRef.current) {
      clearTimeout(sensitiveTimeoutRef.current);
      sensitiveTimeoutRef.current = null;
    }
    setSensitiveNotice(null);

    // Client-side validation for better UX
    const maxSizeMB = API_CONFIG.MAX_FILE_SIZE / (1024 * 1024);
    
    if (file.size > API_CONFIG.MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const errorMessage = `❌ File too large: ${fileSizeMB}MB (max: ${maxSizeMB}MB)`;
      setLocalError(errorMessage);
      // Clear error after 5 seconds
      setTimeout(() => setLocalError(null), 5000);
      return;
    }

    // Check for blocked extensions
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension && API_CONFIG.BLOCKED_FILE_EXTENSIONS.includes(fileExtension)) {
      const errorMessage = `🚫 File type "${fileExtension.toUpperCase()}" is blocked for security`;
      setLocalError(errorMessage);
      // Clear error after 5 seconds
      setTimeout(() => setLocalError(null), 5000);
      return;
    }

    setUploadProgress(0);

    let progressInterval: ReturnType<typeof setInterval> | undefined;

    try {
      // Simulate progress (since we don't have actual upload progress from the API)
      progressInterval = setInterval(() => {
        setUploadProgress((prev: number) => {
          if (prev >= 90) {
            if (progressInterval) clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const uploadedFile = await uploadFile(file);
      
      if (progressInterval) clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadedFile?.sensitive_detected) {
        const markers = uploadedFile.sensitive_markers || [];
        const markerText = markers.length ? markers.join(', ') : 'sensitive fields';
        const summary = uploadedFile.sensitive_summary || `Contains sensitive info (${markerText})`;
        setSensitiveNotice(`Heads up: ${summary}. Please review before sharing.`);
        setNoticeKey((prev: number) => prev + 1);
        if (sensitiveTimeoutRef.current) {
          clearTimeout(sensitiveTimeoutRef.current);
        }
        sensitiveTimeoutRef.current = setTimeout(() => {
          setSensitiveNotice(null);
        }, 5000);
      }
      
      // Reset form
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Notify parent component
      onUploadSuccess?.();
      
      // Reset state after a brief delay to show completion
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);

    } catch (err) {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setUploadProgress(0);
      
      // Handle API errors
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
      setLocalError(errorMessage);
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setLocalError(null);
      }, 5000);
    }
  }, [uploadFile, onUploadSuccess]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  }, [handleUpload]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  }, [handleUpload]);

  const handleClick = useCallback(() => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  }, [isUploading]);

  return (
    <div className="p-4">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Files</h3>
        <p className="text-sm text-gray-500 mb-4">
          Drag and drop files here, or click to browse
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : isUploading
            ? 'border-gray-300 bg-gray-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        } ${isUploading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label="Upload file area. Drag and drop files here or click to browse."
        aria-describedby="upload-instructions"
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          disabled={isUploading}
          accept="*/*"
          aria-label="File input"
          data-upload-trigger
        />
        
        <CloudArrowUpIcon className="mx-auto h-10 w-10 text-gray-400 mb-3" aria-hidden="true" />
        
        {isUploading ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900" aria-live="polite">Uploading...</p>
            <div className="w-full bg-gray-200 rounded-full h-2" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500" aria-live="polite">{uploadProgress}%</p>
          </div>
        ) : (
          <div id="upload-instructions">
            <p className="text-sm font-medium text-gray-900 mb-1">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-gray-500">
              Supports any file type
            </p>
          </div>
        )}
      </div>

      {/* Error Display */}
      {(localError || uploadError) && (
        <div 
          key={errorKey}
          className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md" 
          role="alert" 
          aria-live="assertive"
        >
          <div className="flex items-center">
            <XMarkIcon className="h-4 w-4 text-red-400 mr-2" aria-hidden="true" />
            <p className="text-xs text-red-800">
              {localError || uploadError?.message || 'An error occurred during upload'}
            </p>
          </div>
        </div>
      )}

      {/* Sensitive Info Notice */}
      {sensitiveNotice && (
        <div
          key={noticeKey}
          className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md"
          role="status"
          aria-live="assertive"
        >
          <div className="flex items-start">
            <ShieldExclamationIcon className="h-5 w-5 text-amber-500 mr-2 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-amber-900">{sensitiveNotice}</p>
          </div>
        </div>
      )}

      {/* Upload Tips */}
      {!isUploading && !localError && !uploadError && (
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            Files are automatically deduplicated • Max size: {API_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB
          </p>
        </div>
      )}
    </div>
  );
}; 