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

  // Handle min size change with validation
  const handleMinSizeChange = (value: string) => {
    setMinSize(value);
    // setLastChangedField('minSize');
    
    if (value && maxSize) {
      if (!validateSizeValues(value, maxSize, minSizeUnit, maxSizeUnit)) {
        // Reset the min size (the violating value) and remove from filtering
        setMinSize('');
        showValidationError('Minimum size cannot exceed maximum size');
        return;
      }
    }
  };

  // Handle max size change with validation
  const handleMaxSizeChange = (value: string) => {
    setMaxSize(value);
    // setLastChangedField('maxSize');
    
    if (value && minSize) {
      if (!validateSizeValues(minSize, value, minSizeUnit, maxSizeUnit)) {
        // Reset the max size (the violating value) and remove from filtering
        setMaxSize('');
        showValidationError('Maximum size cannot be less than minimum size');
        return;
      }
    }
  };

  // Handle min size unit change with validation
  const handleMinSizeUnitChange = (unit: string) => {
    setMinSizeUnit(unit);
    // setLastChangedField('minSize');
    
    if (minSize && maxSize) {
      if (!validateSizeValues(minSize, maxSize, unit, maxSizeUnit)) {
        // Reset the min size (the violating value) and remove from filtering
        setMinSize('');
        setMinSizeUnit('bytes');
        showValidationError('Minimum size cannot exceed maximum size');
        return;
      }
    }
  };

  // Handle max size unit change with validation
  const handleMaxSizeUnitChange = (unit: string) => {
    setMaxSizeUnit(unit);
    // setLastChangedField('maxSize');
    
    if (minSize && maxSize) {
      if (!validateSizeValues(minSize, maxSize, minSizeUnit, unit)) {
        // Reset the max size (the violating value) and remove from filtering
        setMaxSize('');
        setMaxSizeUnit('bytes');
        showValidationError('Maximum size cannot be less than minimum size');
        return;
      }
    }
  };

  // Handle date from change with validation
  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    // setLastChangedField('dateFrom');
    
    if (value && dateTo) {
      if (!validateDateRange(value, dateTo)) {
        // Reset the from date (the violating value) and remove from filtering
        setDateFrom('');
        showValidationError('From date cannot be after to date');
        return;
      }
    }
  };

  // Handle date to change with validation
  const handleDateToChange = (value: string) => {
    setDateTo(value);
    // setLastChangedField('dateTo');
    
    if (value && dateFrom) {
      if (!validateDateRange(dateFrom, value)) {
        // Reset the to date (the violating value) and remove from filtering
        setDateTo('');
        showValidationError('To date cannot be before from date');
        return;
      }
    }
  };



  // Update filters when any filter changes (debounced to prevent focus loss)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
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

      // Trigger parent callback
      onFiltersChange(filters);
    }, 300); // Debounce all changes to prevent focus loss

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedFileTypes, minSize, maxSize, minSizeUnit, maxSizeUnit, dateFrom, dateTo, onFiltersChange, setSearchParams]);

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
    setSearchParams(new URLSearchParams());
    
    // Notify parent component that filters were cleared
    if (onClearFilters) {
      onClearFilters();
    }
  };

  // Expose clearAllFilters method to parent component
  useImperativeHandle(ref, () => ({
    clearAllFilters
  }));

  const hasActiveFilters: boolean = !!(searchQuery || selectedFileTypes.length > 0 || minSize || maxSize || dateFrom || dateTo);

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
            {hasActiveFilters && (
              <span className="file-filters-active-badge" aria-label="Filters are active">
                Active
              </span>
            )}
          </div>
          <div className="file-filters-actions">
            {hasActiveFilters && (
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
      

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="file-filters-summary">
          <div className="file-filters-summary-container">
            {searchQuery && (
              <span className="file-filters-summary-item file-filters-summary-search">
                Search: "{searchQuery}"
                <button
                  onClick={() => setSearchQuery('')}
                  className="file-filters-summary-remove"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedFileTypes.map(type => (
              <span key={type} className="file-filters-summary-item file-filters-summary-type">
                {FILE_TYPE_OPTIONS.find(opt => opt.value === type)?.label}
                <button
                  onClick={() => handleFileTypeToggle(type)}
                  className="file-filters-summary-remove"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
            {minSize && (
              <span className="file-filters-summary-item file-filters-summary-size">
                Min: {minSize} {SIZE_OPTIONS.find(opt => opt.value === minSizeUnit)?.label}
                <button
                  onClick={() => setMinSize('')}
                  className="file-filters-summary-remove"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
            {maxSize && (
              <span className="file-filters-summary-item file-filters-summary-size">
                Max: {maxSize} {SIZE_OPTIONS.find(opt => opt.value === maxSizeUnit)?.label}
                <button
                  onClick={() => setMaxSize('')}
                  className="file-filters-summary-remove"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
            {dateFrom && (
              <span className="file-filters-summary-item file-filters-summary-date">
                From: {(() => {
                  const d = new Date(dateFrom);
                  const day = String(d.getDate()).padStart(2, '0');
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const year = d.getFullYear();
                  return `${day}/${month}/${year}`;
                })()}
                <button
                  onClick={() => setDateFrom('')}
                  className="file-filters-summary-remove"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
            {dateTo && (
              <span className="file-filters-summary-item file-filters-summary-date">
                To: {(() => {
                  const d = new Date(dateTo);
                  const day = String(d.getDate()).padStart(2, '0');
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const year = d.getFullYear();
                  return `${day}/${month}/${year}`;
                })()}
                <button
                  onClick={() => setDateTo('')}
                  className="file-filters-summary-remove"
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
