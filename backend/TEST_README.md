# Django Tests for File Hub

This document explains how to run the comprehensive test suite for the file deduplication and filtering system.

## Test Overview

The test suite validates three main areas:

1. **Deduplication Tests** (`FileDeduplicationTests`)
   - Upload same content twice → verify one blob with `ref_count=2`
   - Delete duplicate → verify `ref_count` reduces but blob persists
   - Delete last reference → verify blob and physical file are removed
   - Verify storage statistics show correct savings

2. **Filtering Tests** (`FileFilteringTests`)
   - Search by filename (`q` parameter)
   - Filter by file type (`file_type` parameter)
   - Filter by size range (`min_size`, `max_size` parameters)
   - Filter by date range (`date_from`, `date_to` parameters)
   - Combined filters (multiple parameters together)
   - Pagination functionality

3. **Statistics Tests** (`FileStatsTests`)
   - Empty stats when no files exist
   - Stats calculation with deduplication

## Running Tests

### Prerequisites

Ensure you have:
- Docker Compose running
- Backend container accessible
- Database migrations applied

### Run All Tests

```bash
# From the project root directory
docker-compose exec backend python manage.py test files.tests -v 2
```

### Run Specific Test Classes

```bash
# Run only deduplication tests
docker-compose exec backend python manage.py test files.tests.FileDeduplicationTests -v 2

# Run only filtering tests
docker-compose exec backend python manage.py test files.tests.FileFilteringTests -v 2

# Run only stats tests
docker-compose exec backend python manage.py test files.tests.FileStatsTests -v 2
```

### Run Specific Test Methods

```bash
# Run a specific test method
docker-compose exec backend python manage.py test files.tests.FileDeduplicationTests.test_upload_same_bytes_twice_creates_one_blob -v 2
```

### Run Tests with Coverage

```bash
# Install coverage if not already installed
docker-compose exec backend pip install coverage

# Run tests with coverage
docker-compose exec backend coverage run --source='.' manage.py test files.tests

# Generate coverage report
docker-compose exec backend coverage report

# Generate HTML coverage report
docker-compose exec backend coverage html
```

## Test Data

The tests create various types of test files:
- Text files with different sizes
- Image files (fake content)
- PDF files (fake content)
- Video files (fake content)

All test files are automatically cleaned up after each test.

## Expected Test Results

### Deduplication Tests
- ✅ Uploading same content twice creates one blob with `ref_count=2`
- ✅ Storage stats show correct savings (50% for 2 duplicates)
- ✅ Deleting duplicate reduces `ref_count` but keeps blob
- ✅ Deleting last reference removes blob and physical file

### Filtering Tests
- ✅ Filename search works with case-insensitive substring matching
- ✅ File type filtering works for image, pdf, video, audio, doc categories
- ✅ Size range filtering works with min/max parameters
- ✅ Date range filtering works with ISO date format
- ✅ Combined filters work with AND semantics
- ✅ Pagination works with default 20 items per page

### Statistics Tests
- ✅ Empty stats return zeros
- ✅ Stats correctly calculate deduplication savings
- ✅ Deduplication ratio is calculated correctly

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Ensure database is running
   docker-compose ps
   
   # Restart backend if needed
   docker-compose restart backend
   ```

2. **Migration Errors**
   ```bash
   # Apply migrations
   docker-compose exec backend python manage.py migrate
   ```

3. **Permission Errors**
   ```bash
   # Check file permissions in media directory
   docker-compose exec backend ls -la media/
   ```

### Debug Mode

To run tests in debug mode with more verbose output:

```bash
docker-compose exec backend python manage.py test files.tests -v 3 --debug-mode
```

### Test Database

Tests use a separate test database that is automatically created and destroyed. No production data is affected.

## Test Coverage

The test suite covers:
- ✅ File upload with deduplication
- ✅ File deletion with garbage collection
- ✅ Search and filtering functionality
- ✅ Pagination
- ✅ Storage statistics
- ✅ Error handling
- ✅ Edge cases (empty results, missing files)

## Adding New Tests

To add new tests:

1. Add test methods to existing test classes in `files/tests.py`
2. Follow the naming convention: `test_<description>`
3. Use descriptive docstrings
4. Test both success and failure cases
5. Clean up any test data in `tearDown()` if needed

Example:
```python
def test_new_feature(self):
    """Test description of what this test validates"""
    # Arrange
    # Act
    # Assert
    self.assertEqual(expected, actual)
```
