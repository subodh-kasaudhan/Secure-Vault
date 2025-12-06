# Frontend - React Application

This is the React frontend for the Secure Vault, providing a modern, responsive interface for file management with advanced features like deduplication analytics, search, and filtering.

## 🏗️ Architecture

### Technology Stack

- **React 18** with TypeScript for type safety
- **TanStack Query** (React Query) for server state management
- **Axios** for HTTP client
- **Tailwind CSS** for styling
- **Heroicons** for UI elements
- **React Router** for navigation

### Key Features

- **📊 Real-time Storage Analytics**: Live deduplication statistics
- **🔍 Advanced Search & Filtering**: Multi-criteria file filtering
- **📱 Responsive Design**: Works on desktop and mobile
- **♿ Accessibility**: Full keyboard navigation and screen reader support
- **⚡ Fast Downloads**: Optimized file download with progress tracking
- **🔄 Hot Reload**: Development server with live updates

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Local Development

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   Create `.env.local`:
   ```env
   REACT_APP_API_URL=http://localhost:8000/api
   ```

4. **Start development server**
   ```bash
   npm start
   ```

5. **Open in browser**
   Navigate to http://localhost:3000

### Docker Development

```bash
# Start frontend only
docker-compose up frontend

# Or start all services
docker-compose up -d
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/           # React components
│   │   ├── FileList.tsx     # File listing with actions
│   │   ├── FileFilters.tsx  # Search and filtering UI
│   │   ├── FileUpload.tsx   # File upload component
│   │   └── StorageStats.tsx # Storage analytics display
│   ├── services/            # API services
│   │   └── fileService.ts   # File operations and download
│   ├── hooks/               # Custom React hooks
│   │   └── useFiles.ts      # File management hook
│   ├── types/               # TypeScript definitions
│   │   ├── file.ts          # File-related types
│   │   └── index.ts         # Common types
│   ├── config/              # Configuration
│   │   └── api.ts           # API configuration
│   ├── utils/               # Utility functions
│   │   └── downloadTest.ts  # Download testing utilities
│   ├── App.tsx              # Main application component
│   └── index.tsx            # Application entry point
├── public/                  # Static assets
├── package.json             # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

## 🔧 Configuration

### Environment Variables

```env
# API Configuration
REACT_APP_API_URL=http://localhost:8000/api

# Development Settings (Docker)
CHOKIDAR_USEPOLLING=true
WATCHPACK_POLLING=true
```

### API Configuration

The API configuration is centralized in `src/config/api.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  TIMEOUT: 30000,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
};
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- FileList.test.tsx
```

### Test Structure

Tests are organized to match the component structure:

- `__tests__/components/` - Component tests
- `__tests__/services/` - Service tests
- `__tests__/hooks/` - Hook tests

### Testing Examples

```typescript
// Component test example
import { render, screen } from '@testing-library/react';
import { FileList } from '../FileList';

test('renders file list', () => {
  render(<FileList files={[]} />);
  expect(screen.getByText('No files found')).toBeInTheDocument();
});

// Hook test example
import { renderHook } from '@testing-library/react';
import { useFiles } from '../useFiles';

test('useFiles hook', () => {
  const { result } = renderHook(() => useFiles());
  expect(result.current.files).toBeDefined();
});
```

## 🎨 UI Components

### FileList Component

Main component for displaying files with actions:

**Features:**
- Paginated file listing
- Download and delete actions
- Loading and error states
- Empty state handling
- Accessibility support

**Props:**
```typescript
interface FileListProps {
  files: File[];
  pagination?: PaginationInfo;
  isLoading?: boolean;
  error?: string;
  onDownload: (fileUrl: string, filename: string, fileId: number) => Promise<void>;
  onDelete: (fileId: number) => Promise<void>;
  onPageChange?: (page: number) => void;
}
```

### FileFilters Component

Advanced filtering interface:

**Features:**
- Text search with debouncing
- File type multi-select
- Size range filters
- Date range filters
- URL persistence
- Clear all filters

**Props:**
```typescript
interface FileFiltersProps {
  onFiltersChange: (filters: FileFilters) => void;
  isLoading?: boolean;
}
```

### StorageStats Component

Real-time storage analytics:

**Features:**
- Live storage statistics
- Deduplication ratio display
- Interactive tooltips
- Auto-refresh on file operations

**Props:**
```typescript
interface StorageStatsProps {
  stats?: StorageStats;
  isLoading?: boolean;
  error?: string;
}
```

### FileUpload Component

File upload interface:

**Features:**
- Drag and drop support
- Progress indication
- Error handling
- File validation
- Accessibility support

**Props:**
```typescript
interface FileUploadProps {
  onUploadSuccess?: () => void;
}
```

## 🔌 API Integration

### File Service

The `fileService.ts` provides all API communication:

```typescript
// File operations
export const getFiles = (filters?: FileFilters): Promise<FileListResponse>
export const uploadFile = (file: File): Promise<File>
export const deleteFile = (fileId: number): Promise<void>
export const downloadFile = (fileUrl: string, filename: string): Promise<void>

// Statistics
export const getStorageStats = (): Promise<StorageStats>
```

### React Query Integration

The `useFiles` hook provides React Query integration:

```typescript
const {
  files,
  stats,
  isLoading,
  error,
  uploadFile,
  deleteFile,
  downloadFile
} = useFiles();
```

## ♿ Accessibility

### Features Implemented

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Screen Reader Support**: Proper ARIA labels and roles
- **Focus Management**: Visible focus indicators
- **Live Regions**: Dynamic content announcements
- **Semantic HTML**: Proper heading structure and landmarks

### Accessibility Checklist

- [ ] All buttons have accessible names
- [ ] Form inputs have proper labels
- [ ] Images have alt text or are decorative
- [ ] Color contrast meets WCAG guidelines
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announcements for dynamic content

## 🔍 Development Tools

### React Query DevTools

In development mode, React Query DevTools are available for debugging:

```typescript
// Automatically included in development
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
```

### Browser Extensions

Recommended extensions for development:
- React Developer Tools
- Redux DevTools (if using Redux)
- Network tab for API debugging

## 🚀 Build and Deployment

### Development Build
```bash
npm run build
```

### Production Build
```bash
# Set production environment
NODE_ENV=production npm run build

# Serve production build
npm install -g serve
serve -s build -l 3000
```

### Docker Build
```bash
# Build frontend image
docker build -t secure-vault-frontend .

# Run container
docker run -p 3000:3000 secure-vault-frontend
```

## 🐛 Troubleshooting

### Common Issues

1. **API Connection Errors**
   ```bash
   # Check environment variables
   echo $REACT_APP_API_URL
   
   # Verify backend is running
   curl http://localhost:8000/api/files/
   ```

2. **Build Errors**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   
   # Check TypeScript errors
   npm run type-check
   ```

3. **Hot Reload Issues**
   ```bash
   # Check file watching
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

4. **CORS Errors**
   ```bash
   # Verify backend CORS configuration
   # Check browser console for detailed errors
   ```

### Debug Commands

```bash
# Check dependencies
npm ls

# Run linter
npm run lint

# Type checking
npm run type-check

# Start in development mode
npm start

# Build for production
npm run build
```

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
