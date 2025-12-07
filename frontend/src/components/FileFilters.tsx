import React, { useState, useEffect, useRef, useImperativeHandle } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { FileFilters as FileFiltersType } from '../services/fileService';

interface FileFiltersProps {
  onFiltersChange: (filters: FileFiltersType) => void;
  isLoading?: boolean;
  onClearFilters?: () => void; // Add callback for external clear requests
}

interface FileTypeOption {
  value: string;
  label: string;
  color: string;
}

interface SizeOption {
  value: string;
  label: string;
  multiplier: number;
}

const FILE_TYPE_OPTIONS: FileTypeOption[] = [
  { value: 'image', label: 'Images', color: 'bg-blue-100 text-blue-800' },
  { value: 'pdf', label: 'PDFs', color: 'bg-red-100 text-red-800' },
  { value: 'video', label: 'Videos', color: 'bg-purple-100 text-purple-800' },
  { value: 'audio', label: 'Audio', color: 'bg-green-100 text-green-800' },
  { value: 'doc', label: 'Documents', color: 'bg-yellow-100 text-yellow-800' },
];

const SIZE_OPTIONS: SizeOption[] = [
  { value: 'bytes', label: 'Bytes', multiplier: 1 },
  { value: 'kb', label: 'KB', multiplier: 1024 },
  { value: 'mb', label: 'MB', multiplier: 1024 * 1024 },
  { value: 'gb', label: 'GB', multiplier: 1024 * 1024 * 1024 },
];

export const FileFilters = React.forwardRef<{ clearAllFilters: () => void }, FileFiltersProps>(
  ({ onFiltersChange, isLoading = false, onClearFilters }, ref) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Refs to preserve focus
  const minSizeInputRef = useRef<HTMLInputElement>(null);
  const maxSizeInputRef = useRef<HTMLInputElement>(null);
  
  // Local state for form inputs
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || '');
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>(
    searchParams.get('file_type')?.split(',').filter(Boolean) || []
  );
  const [minSize, setMinSize] = useState<string>(searchParams.get('min_size') || '');
  const [maxSize, setMaxSize] = useState<string>(searchParams.get('max_size') || '');
  const [minSizeUnit, setMinSizeUnit] = useState<string>('bytes');
  const [maxSizeUnit, setMaxSizeUnit] = useState<string>('bytes');
  const [dateFrom, setDateFrom] = useState<string>(searchParams.get('date_from') || '');
  const [dateTo, setDateTo] = useState<string>(searchParams.get('date_to') || '');

  // Track applied filters (for legend display)
  const [appliedFilters, setAppliedFilters] = useState<FileFiltersType>(() => {
    // Initialize from URL params if they exist
    const params: FileFiltersType = {};
    if (searchParams.get('q')) params.q = searchParams.get('q') || '';
    if (searchParams.get('file_type')) params.file_type = searchParams.get('file_type') || '';
    if (searchParams.get('min_size')) params.min_size = parseInt(searchParams.get('min_size') || '0');
    if (searchParams.get('max_size')) params.max_size = parseInt(searchParams.get('max_size') || '0');
    if (searchParams.get('date_from')) params.date_from = searchParams.get('date_from') || '';
    if (searchParams.get('date_to')) params.date_to = searchParams.get('date_to') || '';
    return params;
  });

  // Track last changed field for validation
  const [validationError, setValidationError] = useState<string | null>(null);

  // Convert size to bytes for API
  const convertSizeToBytes = (size: string, unit: string): number | undefined => {
    if (!size) return undefined;
    const sizeNum = parseFloat(size);
    if (isNaN(sizeNum)) return undefined;
    const option = SIZE_OPTIONS.find(opt => opt.value === unit);
    return option ? Math.round(sizeNum * option.multiplier) : sizeNum;
  };

  // Validate min/max size values
  const validateSizeValues = (newMinSize: string, newMaxSize: string, newMinUnit: string, newMaxUnit: string): boolean => {
    if (!newMinSize || !newMaxSize) return true; // Allow empty values
    
    const minBytes = convertSizeToBytes(newMinSize, newMinUnit);
    const maxBytes = convertSizeToBytes(newMaxSize, newMaxUnit);
    
    if (minBytes !== undefined && maxBytes !== undefined && minBytes > maxBytes) {
      return false;
    }
    
    return true;
  };

  // Validate date range values
  const validateDateRange = (newDateFrom: string, newDateTo: string): boolean => {
    if (!newDateFrom || !newDateTo) return true; // Allow empty values
    
    const fromDate = new Date(newDateFrom);
    const toDate = new Date(newDateTo);
    
    if (fromDate > toDate) {
      return false;
    }
    
    return true;
  };

  // Show validation error toast
  const showValidationError = (message: string) => {
    setValidationError(message);
    // Auto-hide after 3 seconds
    setTimeout(() => setValidationError(null), 3000);
  };

  // Simple handlers without validation (validation happens on Apply button click)
  const handleMinSizeChange = (value: string) => {
    setMinSize(value);
  };

  const handleMaxSizeChange = (value: string) => {
    setMaxSize(value);
  };

  const handleMinSizeUnitChange = (unit: string) => {
    setMinSizeUnit(unit);
  };

  const handleMaxSizeUnitChange = (unit: string) => {
    setMaxSizeUnit(unit);
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
  };



  // Apply filters manually when button is clicked
  const handleApplyFilters = (): void => {
    // Validate size range
    if (minSize && maxSize) {
      if (!validateSizeValues(minSize, maxSize, minSizeUnit, maxSizeUnit)) {
        // Reset both size filters if validation fails
        setMinSize('');
        setMaxSize('');
        setMinSizeUnit('bytes');
        setMaxSizeUnit('bytes');
        showValidationError('Minimum size cannot exceed maximum size. Both size filters have been reset.');
        return;
      }
    }

    // Validate date range
    if (dateFrom && dateTo) {
      if (!validateDateRange(dateFrom, dateTo)) {
        // Reset both date filters if validation fails
        setDateFrom('');
        setDateTo('');
        showValidationError('From date cannot be after to date. Both date filters have been reset.');
        return;
      }
    }

    // Build filters object
    const filters: FileFiltersType = {};
    
    if (searchQuery.trim()) filters.q = searchQuery.trim();
    if (selectedFileTypes.length > 0) filters.file_type = selectedFileTypes.join(',');
    
    // Convert sizes to bytes for API
    const minSizeBytes = convertSizeToBytes(minSize, minSizeUnit);
    const maxSizeBytes = convertSizeToBytes(maxSize, maxSizeUnit);
    
    if (minSizeBytes !== undefined) filters.min_size = minSizeBytes;
    if (maxSizeBytes !== undefined) filters.max_size = maxSizeBytes;
    if (dateFrom) filters.date_from = dateFrom;
    if (dateTo) filters.date_to = dateTo;

    // Update URL
    const newSearchParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        newSearchParams.set(key, value.toString());
      }
    });
    setSearchParams(newSearchParams);

    // Store applied filters for legend display
    setAppliedFilters(filters);

    // Trigger parent callback
    onFiltersChange(filters);
  };

  // Better focus preservation using a more robust approach
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Preserve focus after re-renders
  useEffect(() => {
    if (focusedInput === 'minSize' && minSizeInputRef.current) {
      minSizeInputRef.current.focus();
      // Note: setSelectionRange doesn't work on number inputs, so we skip it
    } else if (focusedInput === 'maxSize' && maxSizeInputRef.current) {
      maxSizeInputRef.current.focus();
      // Note: setSelectionRange doesn't work on number inputs, so we skip it
    }
  }, [focusedInput, minSize, maxSize, minSizeUnit, maxSizeUnit]);

  const handleFileTypeToggle = (fileType: string): void => {
    setSelectedFileTypes(prev => 
      prev.includes(fileType) 
        ? prev.filter(type => type !== fileType)
        : [...prev, fileType]
    );
  };

  const clearAllFilters = (): void => {
    setSearchQuery('');
    setSelectedFileTypes([]);
    setMinSize('');
    setMaxSize('');
    setMinSizeUnit('bytes');
    setMaxSizeUnit('bytes');
    setDateFrom('');
    setDateTo('');
    setAppliedFilters({});
    setSearchParams(new URLSearchParams());
    
    // Notify parent component that filters were cleared
    if (onClearFilters) {
      onClearFilters();
    }
  };

  // Remove a specific filter and re-apply remaining filters
  const removeFilter = (filterType: string): void => {
    let updatedFilters: FileFiltersType = { ...appliedFilters };
    
    switch (filterType) {
      case 'search':
        delete updatedFilters.q;
        setSearchQuery('');
        break;
      case 'file_type':
        delete updatedFilters.file_type;
        setSelectedFileTypes([]);
        break;
      case 'min_size':
        delete updatedFilters.min_size;
        setMinSize('');
        break;
      case 'max_size':
        delete updatedFilters.max_size;
        setMaxSize('');
        break;
      case 'date_from':
        delete updatedFilters.date_from;
        setDateFrom('');
        break;
      case 'date_to':
        delete updatedFilters.date_to;
        setDateTo('');
        break;
    }
    
    // Update applied filters
    setAppliedFilters(updatedFilters);
    
    // Update URL
    const newSearchParams = new URLSearchParams();
    Object.entries(updatedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        newSearchParams.set(key, value.toString());
      }
    });
    setSearchParams(newSearchParams);
    
    // Trigger parent callback with updated filters
    onFiltersChange(updatedFilters);
  };

  // Expose clearAllFilters method to parent component
  useImperativeHandle(ref, () => ({
    clearAllFilters
  }));

  // Check if there are applied filters (for legend display and header badge)
  const hasAppliedFilters: boolean = !!(appliedFilters.q || appliedFilters.file_type || 
    appliedFilters.min_size || appliedFilters.max_size || 
    appliedFilters.date_from || appliedFilters.date_to);

  return (
    <div className="file-filters-container">
      {/* Validation Error Toast */}
      {validationError && (
        <div className="file-filters-validation-toast">
          <div className="file-filters-validation-content">
            <div className="file-filters-validation-icon">⚠️</div>
            <span className="file-filters-validation-message">{validationError}</span>
            <button
              onClick={() => setValidationError(null)}
              className="file-filters-validation-close"
              aria-label="Close validation message"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="file-filters-header">
        <div className="file-filters-header-content">
          <div className="file-filters-title-section">
            <FunnelIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
            <h3 className="file-filters-title">Filters</h3>
            {hasAppliedFilters && (
              <span className="file-filters-active-badge" aria-label="Filters are active">
                Active
              </span>
            )}
          </div>
          <div className="file-filters-actions">
            <button
              onClick={handleApplyFilters}
              className="file-filters-apply-button"
              disabled={isLoading}
              aria-label="Apply filters"
            >
              <FunnelIcon className="h-4 w-4" aria-hidden="true" />
              <span>Apply Filter</span>
            </button>
            {hasAppliedFilters && (
              <button
                onClick={clearAllFilters}
                className="file-filters-clear-button"
                aria-label="Clear all filters"
              >
                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                <span>Clear all</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="file-filters-search-section">
        <div className="file-filters-search-container">
          <MagnifyingGlassIcon className="file-filters-search-icon" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search files by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="file-filters-search-input"
            disabled={isLoading}
            aria-label="Search files by name"
          />
        </div>
      </div>

      {/* File Type Filters */}
      <div className="file-filters-type-section">
        <h4 className="file-filters-type-title">File Types</h4>
        <div className="file-filters-type-container" role="group" aria-label="File type filters">
          {FILE_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleFileTypeToggle(option.value)}
              className={`file-filters-type-button ${
                selectedFileTypes.includes(option.value)
                  ? `${option.color} file-filters-type-button-active`
                  : 'file-filters-type-button-inactive'
              }`}
              disabled={isLoading}
              aria-pressed={selectedFileTypes.includes(option.value)}
              aria-label={`Filter by ${option.label.toLowerCase()}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      
        <div className="file-filters-advanced-section">
          {/* Size Range */}
          <div className="file-filters-size-section">
            <h4 className="file-filters-size-title">File Size</h4>
            <div className="file-filters-size-grid">
              <div className="file-filters-size-input-group">
                <label className="file-filters-size-label">Min Size</label>
                <div className="file-filters-size-input-container">
                  <div className="file-filters-size-input-wrapper">
                    <input
                      type="number"
                      placeholder="0"
                      value={minSize}
                      onChange={(e) => handleMinSizeChange(e.target.value)}
                      onFocus={() => setFocusedInput('minSize')}
                      onBlur={() => setFocusedInput(null)}
                      className="file-filters-size-input"
                      disabled={isLoading}
                      min="0"
                      step="0.01"
                      ref={minSizeInputRef}
                    />
                  </div>
                  <select
                    value={minSizeUnit}
                    onChange={(e) => handleMinSizeUnitChange(e.target.value)}
                    className="file-filters-size-select"
                    disabled={isLoading}
                  >
                    {SIZE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="file-filters-size-input-group">
                <label className="file-filters-size-label">Max Size</label>
                <div className="file-filters-size-input-container">
                  <div className="file-filters-size-input-wrapper">
                    <input
                      type="number"
                      placeholder="∞"
                      value={maxSize}
                      onChange={(e) => handleMaxSizeChange(e.target.value)}
                      onFocus={() => setFocusedInput('maxSize')}
                      onBlur={() => setFocusedInput(null)}
                      className="file-filters-size-input"
                      disabled={isLoading}
                      min="0"
                      step="0.01"
                      ref={maxSizeInputRef}
                    />
                  </div>
                  <select
                    value={maxSizeUnit}
                    onChange={(e) => handleMaxSizeUnitChange(e.target.value)}
                    className="file-filters-size-select"
                    disabled={isLoading}
                  >
                    {SIZE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="file-filters-date-section">
            <h4 className="file-filters-date-title">Upload Date</h4>
            <div className="file-filters-date-grid">
              <div>
                <label className="file-filters-date-label">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  onFocus={() => setFocusedInput('dateFrom')}
                  onBlur={() => setFocusedInput(null)}
                  className="file-filters-date-input"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="file-filters-date-label">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  onFocus={() => setFocusedInput('dateTo')}
                  onBlur={() => setFocusedInput(null)}
                  className="file-filters-date-input"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        </div>
      

      {/* Active Filters Summary - Only show applied filters */}
      {hasAppliedFilters && (
        <div className="file-filters-summary">
          <div className="file-filters-summary-container">
            {appliedFilters.q && (
              <span className="file-filters-summary-item file-filters-summary-search">
                Search: "{appliedFilters.q}"
                <button
                  onClick={() => removeFilter('search')}
                  className="file-filters-summary-remove"
                  aria-label="Remove search filter"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
            {appliedFilters.file_type && appliedFilters.file_type.split(',').map(type => (
              <span key={type} className="file-filters-summary-item file-filters-summary-type">
                {FILE_TYPE_OPTIONS.find(opt => opt.value === type)?.label}
                <button
                  onClick={() => {
                    // Remove this file type from applied filters
                    const currentTypes = appliedFilters.file_type?.split(',').filter(Boolean) || [];
                    const updatedTypes = currentTypes.filter(t => t !== type);
                    if (updatedTypes.length === 0) {
                      removeFilter('file_type');
                    } else {
                      const updatedFilters = { ...appliedFilters };
                      updatedFilters.file_type = updatedTypes.join(',');
                      setAppliedFilters(updatedFilters);
                      setSelectedFileTypes(updatedTypes);
                      
                      // Update URL and trigger callback
                      const newSearchParams = new URLSearchParams();
                      Object.entries(updatedFilters).forEach(([key, value]) => {
                        if (value !== undefined && value !== null && value !== '') {
                          newSearchParams.set(key, value.toString());
                        }
                      });
                      setSearchParams(newSearchParams);
                      onFiltersChange(updatedFilters);
                    }
                  }}
                  className="file-filters-summary-remove"
                  aria-label={`Remove ${type} filter`}
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
            {appliedFilters.min_size !== undefined && (
              <span className="file-filters-summary-item file-filters-summary-size">
                Min: {(() => {
                  const bytes = appliedFilters.min_size || 0;
                  if (bytes >= 1024 * 1024 * 1024) {
                    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
                  } else if (bytes >= 1024 * 1024) {
                    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
                  } else if (bytes >= 1024) {
                    return `${(bytes / 1024).toFixed(2)} KB`;
                  }
                  return `${bytes} Bytes`;
                })()}
                <button
                  onClick={() => removeFilter('min_size')}
                  className="file-filters-summary-remove"
                  aria-label="Remove minimum size filter"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
            {appliedFilters.max_size !== undefined && (
              <span className="file-filters-summary-item file-filters-summary-size">
                Max: {(() => {
                  const bytes = appliedFilters.max_size || 0;
                  if (bytes >= 1024 * 1024 * 1024) {
                    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
                  } else if (bytes >= 1024 * 1024) {
                    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
                  } else if (bytes >= 1024) {
                    return `${(bytes / 1024).toFixed(2)} KB`;
                  }
                  return `${bytes} Bytes`;
                })()}
                <button
                  onClick={() => removeFilter('max_size')}
                  className="file-filters-summary-remove"
                  aria-label="Remove maximum size filter"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
            {appliedFilters.date_from && (
              <span className="file-filters-summary-item file-filters-summary-date">
                From: {(() => {
                  const d = new Date(appliedFilters.date_from);
                  const day = String(d.getDate()).padStart(2, '0');
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const year = d.getFullYear();
                  return `${day}/${month}/${year}`;
                })()}
                <button
                  onClick={() => removeFilter('date_from')}
                  className="file-filters-summary-remove"
                  aria-label="Remove from date filter"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
            {appliedFilters.date_to && (
              <span className="file-filters-summary-item file-filters-summary-date">
                To: {(() => {
                  const d = new Date(appliedFilters.date_to);
                  const day = String(d.getDate()).padStart(2, '0');
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const year = d.getFullYear();
                  return `${day}/${month}/${year}`;
                })()}
                <button
                  onClick={() => removeFilter('date_to')}
                  className="file-filters-summary-remove"
                  aria-label="Remove to date filter"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
