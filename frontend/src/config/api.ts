// API Configuration
export const API_CONFIG = {
  // Base URL for API requests
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  
  // Timeout for requests (in milliseconds)
  TIMEOUT: 30000,
  
  // Default pagination settings
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // File upload settings
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    'image/*',
    'application/pdf',
    'text/*',
    'video/*',
    'audio/*',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.*',
  ],
  // Blocked file extensions for security
  BLOCKED_FILE_EXTENSIONS: ['exe', 'com', 'bat', 'cmd', 'scr', 'pif', 'vbs', 'js', 'jar', 'msi', 'app'],
};

// API endpoints
export const API_ENDPOINTS = {
  FILES: '/files/',
  STATS: '/stats/storage/',
} as const;
