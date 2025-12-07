import axios, { AxiosError } from 'axios';
import { File as FileType } from '../types/file';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';

const API_URL = API_CONFIG.BASE_URL;

// Types for API parameters
export interface FileFilters {
  q?: string; // Search query
  file_type?: string; // Comma-separated file types
  min_size?: number;
  max_size?: number;
  date_from?: string; // ISO date string
  date_to?: string; // ISO date string
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface StorageStats {
  reported_total: number;
  physical_total: number;
  savings: number;
  dedup_ratio: number;
}

export interface RemoveDuplicatesResponse {
  removed_count: number;
  blobs_affected: number;
  updated_stats: StorageStats;
  message: string;
}

export interface ApiError {
  message: string;
  status?: number;
  details?: string;
}

export const fileService = {
  async uploadFile(file: File): Promise<FileType> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_URL}${API_ENDPOINTS.FILES}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: API_CONFIG.TIMEOUT,
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      throw new Error(axiosError.response?.data?.message || 'Failed to upload file');
    }
  },

  async getFiles(filters?: FileFilters): Promise<PaginatedResponse<FileType>> {
    try {
      const params = new URLSearchParams();
      
      // Add filter parameters
      if (filters?.q) params.append('q', filters.q);
      if (filters?.file_type) params.append('file_type', filters.file_type);
      if (filters?.min_size) params.append('min_size', filters.min_size.toString());
      if (filters?.max_size) params.append('max_size', filters.max_size.toString());
      if (filters?.date_from) params.append('date_from', filters.date_from);
      if (filters?.date_to) params.append('date_to', filters.date_to);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.page_size) params.append('page_size', filters.page_size.toString());

      const response = await axios.get(`${API_URL}${API_ENDPOINTS.FILES}?${params.toString()}`, {
        timeout: API_CONFIG.TIMEOUT,
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      throw new Error(axiosError.response?.data?.message || 'Failed to fetch files');
    }
  },

  async deleteFile(id: string): Promise<void> {
    try {
      await axios.delete(`${API_URL}${API_ENDPOINTS.FILES}${id}/`, {
        timeout: API_CONFIG.TIMEOUT,
      });
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      throw new Error(axiosError.response?.data?.message || 'Failed to delete file');
    }
  },

  async downloadFile(fileUrl: string, filename: string, fileId?: string): Promise<void> {
    let objectUrl: string | null = null;
    
    try {
      // If we have a fileId, use the download endpoint (more reliable for Cloudinary)
      if (fileId) {
        try {
          const response = await axios.get(`${API_URL}${API_ENDPOINTS.FILES}${fileId}/download/`, {
            timeout: API_CONFIG.TIMEOUT,
          });
          
          if (response.data?.download_url) {
            // Use the download URL from the endpoint
            fileUrl = response.data.download_url;
            filename = response.data.filename || filename;
          }
        } catch (endpointError) {
          // If download endpoint fails, fall back to direct URL
          console.warn('Download endpoint failed, using direct URL:', endpointError);
        }
      }
      
      // Construct full URL if it's a relative path
      let fullUrl: string;
      if (fileUrl.startsWith('http')) {
        fullUrl = fileUrl;
      } else {
        // For relative paths, construct the proper URL
        // The fileUrl should be something like "/media/blobs/..."
        // We need to use the base URL without the /api suffix
        const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
        fullUrl = `${baseUrl}${fileUrl}`;
      }
      
      const response = await axios.get(fullUrl, {
        responseType: 'blob',
        timeout: 30000, // 30 second timeout for downloads
        
      });
      
      // Validate response
      if (!response.data || response.data.size === 0) {
        throw new Error('File is empty or invalid');
      }
      
      // Create blob with proper MIME type if available
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      
      // Create object URL
      objectUrl = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      link.style.display = 'none';
      
      // Add to DOM, trigger download, and cleanup
      document.body.appendChild(link);
      link.click();
      
      // Small delay to ensure download starts before cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        if (objectUrl) {
          window.URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
      }, 100);
      
  
      
    } catch (error) {
      // Clean up object URL on error
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
      
      const axiosError = error as AxiosError<{ message?: string }>;
      
      if (axiosError.code === 'ECONNABORTED') {
        throw new Error('Download timed out. Please try again.');
      } else if (axiosError.response?.status === 404) {
        throw new Error('File not found. It may have been deleted.');
      } else if (axiosError.response?.status === 403) {
        throw new Error('Access denied. You may not have permission to download this file.');
      } else if (axiosError.response?.status && axiosError.response.status >= 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error(axiosError.response?.data?.message || 'Failed to download file');
      }
    }
  },

  async getStorageStats(): Promise<StorageStats> {
    try {
      const response = await axios.get(`${API_URL}${API_ENDPOINTS.STATS}`, {
        timeout: API_CONFIG.TIMEOUT,
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      throw new Error(axiosError.response?.data?.message || 'Failed to fetch storage stats');
    }
  },

  async removeDuplicates(): Promise<RemoveDuplicatesResponse> {
    try {
      const response = await axios.post(`${API_URL}/remove-duplicates/`, {}, {
        timeout: API_CONFIG.TIMEOUT,
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      throw new Error(axiosError.response?.data?.message || 'Failed to remove duplicates');
    }
  },


};

// Standalone download utility that can be used independently
export const downloadFileHelper = {
  /**
   * Downloads a file from a URL as a blob and triggers browser download
   * @param url - The URL to download from
   * @param filename - The filename to save as
   * @param options - Optional configuration
   */
  async downloadFile(
    url: string, 
    filename: string, 
    options: {
      timeout?: number;
      onProgress?: (percent: number) => void;
      headers?: Record<string, string>;
    } = {}
  ): Promise<void> {
    const { timeout = 30000, onProgress, headers = {} } = options;
    let objectUrl: string | null = null;
    
    try {
      // Construct full URL if it's a relative path
      let fullUrl: string;
      if (url.startsWith('http')) {
        fullUrl = url;
      } else {
        // For relative paths, construct the proper URL
        const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
        fullUrl = `${baseUrl}${url}`;
      }
      

      
      const response = await axios.get(fullUrl, {
        responseType: 'blob',
        timeout,
        headers,
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        },
      });
      
      // Validate response
      if (!response.data || response.data.size === 0) {
        throw new Error('File is empty or invalid');
      }
      
      // Create blob with proper MIME type
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      
      // Create object URL
      objectUrl = window.URL.createObjectURL(blob);
      
      // Trigger download
      await this.triggerDownload(objectUrl, filename);
      

      
    } catch (error) {
      // Clean up object URL on error
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
      
      const axiosError = error as AxiosError<{ message?: string }>;
      
      if (axiosError.code === 'ECONNABORTED') {
        throw new Error('Download timed out. Please try again.');
      } else if (axiosError.response?.status === 404) {
        throw new Error('File not found. It may have been deleted.');
      } else if (axiosError.response?.status === 403) {
        throw new Error('Access denied. You may not have permission to download this file.');
      } else if (axiosError.response?.status && axiosError.response.status >= 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error(axiosError.response?.data?.message || 'Failed to download file');
      }
    }
  },

  /**
   * Triggers a download using a blob URL
   * @param blobUrl - The blob URL to download
   * @param filename - The filename to save as
   */
  async triggerDownload(blobUrl: string, filename: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.style.display = 'none';
        
        // Add to DOM, trigger download, and cleanup
        document.body.appendChild(link);
        link.click();
        
        // Cleanup after a short delay
        setTimeout(() => {
          try {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            resolve();
          } catch (cleanupError) {
            resolve(); // Resolve anyway as download was triggered
          }
        }, 100);
        
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Validates if the browser supports blob downloads
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 
           typeof window.URL !== 'undefined' && 
           typeof window.URL.createObjectURL === 'function' && 
           typeof window.URL.revokeObjectURL === 'function';
  },

  /**
   * Gets the file extension from a filename or URL
   */
  getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
  },

  /**
   * Sanitizes a filename for safe download
   */
  sanitizeFilename(filename: string): string {
    // Remove or replace invalid characters
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 255); // Limit length
  }
}; 