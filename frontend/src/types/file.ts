export interface File {
  id: string;
  original_filename: string;
  file_type: string;
  size: number;
  uploaded_at: string;
  file_url: string;
  sensitive_detected?: boolean;
  sensitive_markers?: string[];
  sensitive_summary?: string;
}

export interface PaginationInfo {
  count: number;
  next: string | null;
  previous: string | null;
}

export interface ApiError {
  message: string;
  status?: number;
  details?: string;
}

export interface FileListError {
  message: string;
  status?: number;
  details?: string;
} 