import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fileService, FileFilters, PaginatedResponse, StorageStats, RemoveDuplicatesResponse, ApiError } from '../services/fileService';
import { File as FileType, PaginationInfo } from '../types/file';

export const useFiles = (filters?: FileFilters) => {
  const queryClient = useQueryClient();

  // Query for fetching files with filters
  const {
    data: filesResponse,
    isLoading,
    error,
    refetch,
  } = useQuery<PaginatedResponse<FileType>, ApiError>({
    queryKey: ['files', filters],
    queryFn: () => fileService.getFiles(filters),
    staleTime: 30000, // 30 seconds
  });

  // Query for storage stats
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery<StorageStats, ApiError>({
    queryKey: ['storage-stats'],
    queryFn: fileService.getStorageStats,
    staleTime: 60000, // 1 minute
  });

  // Mutation for uploading files
  const uploadMutation = useMutation<FileType, ApiError, File>({
    mutationFn: fileService.uploadFile,
    onSuccess: () => {
      // Invalidate and refetch files and stats
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage-stats'] });
    },
  });

  // Mutation for deleting files
  const deleteMutation = useMutation<void, ApiError, string>({
    mutationFn: fileService.deleteFile,
    onSuccess: () => {
      // Invalidate and refetch files and stats
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage-stats'] });
    },
  });

  // Mutation for downloading files
  const downloadMutation = useMutation<void, ApiError, { fileUrl: string; filename: string }>({
    mutationFn: ({ fileUrl, filename }) => fileService.downloadFile(fileUrl, filename),
  });

  // Mutation for removing duplicates
  const removeDuplicatesMutation = useMutation<RemoveDuplicatesResponse, ApiError, void>({
    mutationFn: fileService.removeDuplicates,
    onSuccess: () => {
      // Invalidate and refetch files and stats
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage-stats'] });
    },
  });

  // Convenience methods
  const files: FileType[] = filesResponse?.results || [];
  const pagination: PaginationInfo | null = filesResponse ? {
    count: filesResponse.count,
    next: filesResponse.next,
    previous: filesResponse.previous,
  } : null;

  return {
    // Data
    files,
    stats,
    pagination,
    
    // Loading states
    isLoading,
    statsLoading,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isDownloading: downloadMutation.isPending,
    isRemovingDuplicates: removeDuplicatesMutation.isPending,
    
    // Error states
    error,
    statsError,
    uploadError: uploadMutation.error,
    deleteError: deleteMutation.error,
    downloadError: downloadMutation.error,
    removeDuplicatesError: removeDuplicatesMutation.error,
    
    // Actions
    uploadFile: uploadMutation.mutateAsync,
    deleteFile: deleteMutation.mutateAsync,
    downloadFile: downloadMutation.mutateAsync,
    removeDuplicates: removeDuplicatesMutation.mutateAsync,
    refetch,
    refetchStats,
    
  };
};
