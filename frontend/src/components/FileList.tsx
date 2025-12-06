import React, { useState } from 'react';
import { 
  DocumentIcon, 
  TrashIcon, 
  ArrowDownTrayIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  FunnelIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import { File as FileType, PaginationInfo, FileListError } from '../types/file';
import { FileFilters } from '../services/fileService';

interface FileListProps {
  files?: FileType[];
  pagination?: PaginationInfo | null;
  isLoading?: boolean;
  error?: FileListError | null;
  onDelete?: (id: string) => Promise<void>;
  onDownload?: (fileUrl: string, filename: string) => Promise<void>;
  onPageChange?: (page: number) => void;
  isDeleting?: boolean;
  isDownloading?: boolean;
  currentFilters?: FileFilters;
  onClearFilters?: () => void;
}

export const FileList: React.FC<FileListProps> = ({ 
  files = [], 
  pagination,
  isLoading = false, 
  error,
  onDelete,
  onDownload,
  onPageChange,
  isDeleting = false,
  isDownloading = false,
  currentFilters = {},
  onClearFilters
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const handleDelete = async (id: string): Promise<void> => {
    if (onDelete) {
      try {
        setDeleteError(null);
        await onDelete(id);
        setDeleteConfirmId(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete file. Please try again.';
        setDeleteError(errorMessage);
      }
    }
  };

  const handleDownload = async (fileUrl: string, filename: string, fileId: string): Promise<void> => {
    if (onDownload) {
      try {
        setDownloadError(null);
        setDownloadingFile(fileId);
        await onDownload(fileUrl, filename);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to download file. Please try again.';
        setDownloadError(errorMessage);
      } finally {
        setDownloadingFile(null);
      }
    }
  };

  const confirmDelete = (id: string): void => {
    setDeleteConfirmId(id);
  };

  const cancelDelete = (): void => {
    setDeleteConfirmId(null);
    setDeleteError(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getFileIcon = (fileType: string): string => {
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('video')) return '🎥';
    if (fileType.includes('audio')) return '🎵';
    if (fileType.includes('text')) return '📝';
    return '📁';
  };

  const parsePageFromUrl = (url: string | null): number => {
    if (!url) return 1;
    const pageMatch = url.match(/[?&]page=(\d+)/);
    return pageMatch ? parseInt(pageMatch[1], 10) : 1;
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-gray-200 rounded"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-48"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="flex space-x-2">
                      <div className="h-8 w-20 bg-gray-200 rounded"></div>
                      <div className="h-8 w-16 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading files</h3>
            <p className="mt-1 text-sm text-red-600">
              {error?.message || 'Unknown error occurred'}
            </p>
            <div className="mt-4">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (files.length === 0) {
    // Improved filter detection logic
    const hasFilters = Object.keys(currentFilters || {}).some(key => {
      if (key === 'page') return false;
      const value = (currentFilters || {})[key as keyof FileFilters];
      // Check for various falsy values that indicate no filter
      if (value === undefined || value === null || value === '') return false;
      // For arrays, check if they have any items
      if (Array.isArray(value) && value.length === 0) return false;
      // For numbers, check if they're 0 (which might be a valid filter)
      if (typeof value === 'number' && value === 0) return false;
      return true;
    });
    // If pagination count is 0, it means no files exist in the database at all
    // If pagination count > 0 but files.length is 0, it means filters are hiding all files
    const hasNoFilesAtAll = pagination?.count === 0 && !hasFilters;

    return (
      <div className="file-list-empty-container">
        <div className="file-list-empty-content">
          <div className="file-list-empty-icon">
            {hasNoFilesAtAll ? (
              <DocumentIcon className="file-list-empty-document-icon" aria-hidden="true" />
            ) : (
              <FunnelIcon className="file-list-empty-filter-icon" aria-hidden="true" />
            )}
          </div>
          <h3 className="file-list-empty-title">
            {hasNoFilesAtAll ? 'No files uploaded yet' : 'No files found matching filters'}
          </h3>
          <p className="file-list-empty-description">
            {hasNoFilesAtAll 
              ? 'Get started by uploading your first file using the upload area above.' 
              : 'Try adjusting your search criteria or filters to find the files you\'re looking for.'
            }
          </p>
          <div className="file-list-empty-actions">
            {hasNoFilesAtAll ? (
              <button
                onClick={() => {
                  const uploadTrigger = document.querySelector('[data-upload-trigger]') as HTMLButtonElement;
                  uploadTrigger?.click();
                }}
                className="file-list-empty-upload-button"
                aria-label="Upload your first file"
              >
                Upload Your First File
              </button>
            ) : (
              <button
                onClick={onClearFilters}
                className="file-list-empty-clear-button"
                aria-label="Clear all filters"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="file-list-container">
      <div className="file-list-content">
        {/* Header */}
        <div className="file-list-header">
          <h2 className="file-list-title">
            Files ({pagination?.count || files.length})
          </h2>
          {deleteError && (
            <div className="file-list-error">
              <ExclamationTriangleIcon className="file-list-error-icon" />
              {deleteError}
            </div>
          )}
        </div>

        {/* Download Error Display */}
        {downloadError && (
          <div className="file-list-download-error">
            <div className="file-list-download-error-content">
              <div className="file-list-download-error-info">
                <ExclamationTriangleIcon className="file-list-download-error-icon" />
                <div>
                  <h3 className="file-list-download-error-title">Download Error</h3>
                  <p className="file-list-download-error-message">{downloadError}</p>
                </div>
              </div>
              <button
                onClick={() => setDownloadError(null)}
                className="file-list-download-error-close"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Files List */}
        <div className="file-list-items">
          {files.map((file) => (
            <div key={file.id} className="file-list-item">
              <div className="file-list-item-info">
                <div className="file-list-item-icon">{getFileIcon(file.file_type)}</div>
                <div className="file-list-item-details">
                  <h3 className="file-list-item-filename">
                    {file.original_filename}
                  </h3>
                  <p className="file-list-item-type">{file.file_type}</p>
                  {file.sensitive_detected && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                      <ShieldExclamationIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      {file.sensitive_summary || 'Sensitive info detected'}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="file-list-item-meta">
                <span className="file-list-item-size">{formatFileSize(file.size)}</span>
                <span className="file-list-item-date">{formatDate(file.uploaded_at)}</span>
              </div>
              
              <div className="file-list-item-actions">
                <button
                  onClick={() => handleDownload(file.file_url, file.original_filename, file.id)}
                  disabled={isDownloading || downloadingFile === file.id}
                  className="file-list-button file-list-download-button"
                  aria-label={`Download ${file.original_filename}`}
                  title={`Download ${file.original_filename} (${formatFileSize(file.size)})`}
                >
                  {downloadingFile === file.id ? (
                    <>
                      <div className="file-list-loading-spinner" aria-hidden="true"></div>
                      <span aria-live="polite">Downloading...</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="file-list-button-icon" aria-hidden="true" />
                      Download
                    </>
                  )}
                </button>
                
                {deleteConfirmId === file.id ? (
                  <div className="file-list-confirm-group" role="group" aria-label={`Confirm deletion of ${file.original_filename}`}>
                    <button
                      onClick={() => handleDelete(file.id)}
                      disabled={isDeleting}
                      className="file-list-button file-list-confirm-button"
                      aria-label={`Confirm delete ${file.original_filename}`}
                    >
                      <CheckCircleIcon className="file-list-button-icon" aria-hidden="true" />
                      Confirm
                    </button>
                    <button
                      onClick={cancelDelete}
                      className="file-list-button file-list-cancel-button"
                      aria-label="Cancel deletion"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => confirmDelete(file.id)}
                    disabled={isDeleting}
                    className="file-list-button file-list-delete-button"
                    aria-label={`Delete ${file.original_filename}`}
                    title={`Delete ${file.original_filename} (${formatFileSize(file.size)})`}
                  >
                    <TrashIcon className="file-list-button-icon" aria-hidden="true" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {pagination && (pagination.next || pagination.previous) && (
          <div className="file-list-pagination">
            <div className="file-list-pagination-info">
              <span className="file-list-pagination-text">
                Showing {files.length} of {pagination.count} files
              </span>
            </div>
            
            <div className="file-list-pagination-controls" role="group" aria-label="Pagination">
              <button
                onClick={() => onPageChange && onPageChange(parsePageFromUrl(pagination.previous) - 1)}
                disabled={!pagination.previous}
                className="file-list-pagination-button"
                aria-label="Go to previous page"
              >
                <ChevronLeftIcon className="file-list-pagination-icon file-list-pagination-icon-left" aria-hidden="true" />
                Previous
              </button>
              
              <button
                onClick={() => onPageChange && onPageChange(parsePageFromUrl(pagination.next))}
                disabled={!pagination.next}
                className="file-list-pagination-button"
                aria-label="Go to next page"
              >
                Next
                <ChevronRightIcon className="file-list-pagination-icon file-list-pagination-icon-right" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 