import React, { useState, useRef } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { FileUpload } from './components/FileUpload';
import { FileList } from './components/FileList';
import { FileFilters } from './components/FileFilters';
import { StorageStats } from './components/StorageStats';
import { useFiles } from './hooks/useFiles';
import { FileFilters as FileFiltersType } from './services/fileService';
import { FileListError } from './types/file';

function AppContent(): React.JSX.Element {
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [currentFilters, setCurrentFilters] = useState<FileFiltersType>({});
  const fileFiltersRef = useRef<{ clearAllFilters: () => void } | null>(null);
  
  const { 
    files, 
    pagination,
    isLoading, 
    stats, 
    statsLoading,
    deleteFile, 
    downloadFile, 
    removeDuplicates,
    isDeleting, 
    isDownloading,
    isRemovingDuplicates,
    error,
  } = useFiles(currentFilters);

  const handleUploadSuccess = (): void => {
    setRefreshKey(prev => prev + 1);
  };

  const handleFiltersChange = (filters: FileFiltersType): void => {
    setCurrentFilters(filters);
  };

  const handlePageChange = (page: number): void => {
    const newFilters = { ...currentFilters, page };
    setCurrentFilters(newFilters);
  };

  const handleDownload = (fileUrl: string, filename: string): Promise<void> => {
    return downloadFile({ fileUrl, filename });
  };

  const handleRemoveDuplicates = async (): Promise<void> => {
    try {
      await removeDuplicates();
    } catch (error) {
      // Error handling is managed by the useFiles hook
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Secure Vault - File Hub</h1>
          <p className="mt-1 text-sm text-gray-500">
            File management system
          </p>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="space-y-4 lg:space-y-6">
            {/* Storage Stats Section */}
            <StorageStats 
              stats={stats || null} 
              isLoading={statsLoading}
              onRemoveDuplicates={handleRemoveDuplicates}
              isRemovingDuplicates={isRemovingDuplicates}
            />
            
            {/* Filters and Upload Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 lg:gap-6">
              {/* Filters Section - Wide */}
              <div className="md:col-span-3">
                <FileFilters 
                  ref={fileFiltersRef}
                  onFiltersChange={handleFiltersChange} 
                  isLoading={isLoading}
                  onClearFilters={() => {
                    setCurrentFilters({});
                  }}
                />
              </div>
              
              {/* Upload Section - Narrow */}
              <div className="md:col-span-1">
                <div className="bg-white shadow sm:rounded-lg h-full">
                  <FileUpload onUploadSuccess={handleUploadSuccess} />
                </div>
              </div>
            </div>
            
            {/* Files List Section */}
            <div className="bg-white shadow sm:rounded-lg">
              <FileList 
                key={refreshKey}
                files={files}
                pagination={pagination}
                isLoading={isLoading}
                error={error as FileListError | null}
                onDelete={deleteFile}
                onDownload={handleDownload}
                onPageChange={handlePageChange}
                isDeleting={isDeleting}
                isDownloading={isDownloading}
                currentFilters={currentFilters}
                onClearFilters={() => {
                  if (fileFiltersRef.current) {
                    fileFiltersRef.current.clearAllFilters();
                  }
                }}
              />
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-white shadow mt-8">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © 2024 File Hub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function App(): React.JSX.Element {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
