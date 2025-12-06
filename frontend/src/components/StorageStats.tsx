import React, { useState, useEffect } from 'react';
import { 
  CloudArrowUpIcon, 
  DocumentIcon, 
  ServerIcon, 
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { StorageStats as StorageStatsType } from '../services/fileService';

interface StorageStatsProps {
  stats: StorageStatsType | null;
  isLoading?: boolean;
  onRemoveDuplicates?: () => Promise<void>;
  isRemovingDuplicates?: boolean;
}

export const StorageStats: React.FC<StorageStatsProps> = ({ 
  stats, 
  isLoading = false, 
  onRemoveDuplicates,
  isRemovingDuplicates = false 
}) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const tooltipElements = document.querySelectorAll('[data-tooltip]');
      let clickedInsideTooltip = false;
      
      tooltipElements.forEach(element => {
        if (element.contains(target)) {
          clickedInsideTooltip = true;
        }
      });
      
      if (!clickedInsideTooltip) {
        setActiveTooltip(null);
      }
    };

    if (activeTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeTooltip]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercentage = (ratio: number): string => {
    return (ratio * 100).toFixed(1) + '%';
  };

  const tooltips = {
    reportedTotal: {
      title: 'Reported Total',
      content: 'The sum of all file sizes as reported by users. This represents the total logical size of all files in the system, including duplicates.'
    },
    physicalTotal: {
      title: 'Physical Total', 
      content: 'The actual disk space used to store unique file content. This is the real storage consumption after deduplication.'
    },
    spaceSaved: {
      title: 'Space Saved',
      content: 'The difference between reported total and physical total. This shows how much storage space is saved through deduplication.'
    },
    dedupRatio: {
      title: 'Deduplication Ratio',
      content: 'The percentage of storage space saved through deduplication. Calculated as: (Reported Total - Physical Total) / Reported Total × 100.'
    },
    efficiency: {
      title: 'Storage Efficiency',
      content: 'A visual representation of the deduplication ratio. Higher percentages indicate better storage efficiency through content-based deduplication.'
    }
  };



  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-32"></div>
            <div className="h-6 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p>No storage data available</p>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: 'Reported Total',
      value: formatBytes(stats.reported_total),
      icon: DocumentIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Total size of all files',
      tooltipType: 'reportedTotal' as const
    },
    {
      label: 'Physical Total',
      value: formatBytes(stats.physical_total),
      icon: ServerIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Actual storage used',
      tooltipType: 'physicalTotal' as const
    },
    {
      label: 'Space Saved',
      value: formatBytes(stats.savings),
      icon: CloudArrowUpIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Deduplication savings',
      tooltipType: 'spaceSaved' as const
    },
    {
      label: 'Deduplication Ratio',
      value: formatPercentage(stats.dedup_ratio),
      icon: ChartBarIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Storage efficiency',
      tooltipType: 'dedupRatio' as const
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">

      
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Storage Statistics</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-500">Live</span>
        </div>
      </div>
      
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {metrics.map((metric, index) => (
             <div key={index} className="text-center relative">
               <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${metric.bgColor} mb-3`}>
                 <metric.icon className={`h-6 w-6 ${metric.color}`} />
               </div>
               <div className="space-y-1">
                 <p className="text-sm font-medium text-gray-900">{metric.value}</p>
                 <div className="flex items-center justify-center space-x-1">
                   <p className="text-xs text-gray-500">{metric.label}</p>
                   <button 
                     onClick={() => {               
                       setActiveTooltip(activeTooltip === metric.tooltipType ? null : metric.tooltipType);
                     }}
                     className="ml-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                   >
                     i
                   </button>
                 </div>
                 {activeTooltip === metric.tooltipType && (
                   <div className="absolute z-50 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg border border-gray-700 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
                     <div className="font-medium mb-1">{tooltips[metric.tooltipType].title}</div>
                     <div className="text-gray-300">{tooltips[metric.tooltipType].content}</div>
                     <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 border-l border-t border-gray-700"></div>
                   </div>
                 )}
                 <p className="text-xs text-gray-400">{metric.description}</p>
               </div>
             </div>
           ))}
        </div>

        {/* Efficiency Bar */}
       <div className="mt-6 pt-6 border-t border-gray-100 relative">
         <div className="flex items-center justify-between mb-2">
           <div className="flex items-center space-x-1">
             <span className="text-sm font-medium text-gray-700">Storage Efficiency</span>
             <button 
               onClick={() => {         
                 setActiveTooltip(activeTooltip === 'efficiency' ? null : 'efficiency');
               }}
               className="ml-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
             >
               i
             </button>
           </div>
           {activeTooltip === 'efficiency' && (
             <div className="absolute z-50 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg border border-gray-700 bottom-full left-1/9 transform -translate-x-1/5 translate-y-1/5 mb-2">
               <div className="font-medium mb-1">{tooltips.efficiency.title}</div>
               <div className="text-gray-300">{tooltips.efficiency.content}</div>
               <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 border-l border-t border-gray-700"></div>
             </div>
           )}
           <span className="text-sm text-gray-500">{formatPercentage(stats.dedup_ratio)}</span>
         </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(stats.dedup_ratio * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Summary */}
      {stats.savings > 0 && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CloudArrowUpIcon className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm text-green-800">
                <strong>{formatBytes(stats.savings)}</strong> saved through deduplication
              </span>
            </div>
            {onRemoveDuplicates && (
              <button
                onClick={onRemoveDuplicates}
                disabled={isRemovingDuplicates}
                className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
                title="Remove duplicate files permanently"
              >
                {isRemovingDuplicates ? (
                  <>
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <span>🗑️</span>
                    <span>Remove Duplicates</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
