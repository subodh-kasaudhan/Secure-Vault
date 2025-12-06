# Database Performance Optimization Guide

This document outlines the performance optimizations implemented for the file management system to ensure fast searches and efficient query execution.

## 🎯 Performance Goals

- **Fast searches** on large file lists (1000+ files)
- **Efficient filtering** by type, size, and date
- **No N+1 query issues** in list operations
- **Optimized storage statistics** calculations
- **Index-optimized queries** for all common operations

## 📊 Database Indices

### FileBlob Model Indices

```python
class FileBlob(models.Model):
    # Primary indices
    sha256 = models.CharField(max_length=64, unique=True, db_index=True)
    size = models.BigIntegerField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    ref_count = models.PositiveIntegerField(default=0, db_index=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['sha256']),      # Content lookup
            models.Index(fields=['size']),        # Size filtering
            models.Index(fields=['created_at']),  # Date sorting
            models.Index(fields=['ref_count']),   # Garbage collection
        ]
```

### File Model Indices

```python
class File(models.Model):
    # Primary indices
    original_filename = models.CharField(max_length=255, db_index=True)
    file_type = models.CharField(max_length=100, db_index=True)
    extension = models.CharField(max_length=10, db_index=True)
    uploaded_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        indexes = [
            # Single field indices
            models.Index(fields=['original_filename']),  # Search
            models.Index(fields=['file_type']),         # Type filtering
            models.Index(fields=['extension']),         # Extension filtering
            models.Index(fields=['uploaded_at']),       # Date filtering/sorting
            
            # Composite indices for common query patterns
            models.Index(fields=['file_type', 'uploaded_at']),    # Type + Date
            models.Index(fields=['extension', 'uploaded_at']),    # Extension + Date
            models.Index(fields=['uploaded_at', 'blob']),         # Date + Blob relationship
            models.Index(fields=['blob', 'uploaded_at']),         # Blob + Date (existing)
        ]
```

## 🔍 Query Optimization Strategies

### 1. Efficient Filename Search

**Optimized Query:**
```python
# Uses index on original_filename
queryset = File.objects.filter(original_filename__icontains=q)
```

**Performance Characteristics:**
- ✅ Uses `original_filename` index
- ✅ Case-insensitive search with `icontains`
- ✅ Acceptable for filename searches (not huge text fields)

### 2. File Type Filtering

**Optimized Query:**
```python
# Uses indices on file_type and extension
queryset = queryset.filter(
    Q(file_type__istartswith='image/') | Q(extension__iexact='pdf')
)
```

**Performance Characteristics:**
- ✅ Uses `file_type` index with `istartswith`
- ✅ Uses `extension` index with `iexact`
- ✅ Composite indices for type + date combinations

### 3. Size Range Filtering

**Optimized Query:**
```python
# Uses blob size index via select_related
queryset = queryset.filter(blob__size__gte=min_size, blob__size__lte=max_size)
```

**Performance Characteristics:**
- ✅ Uses `FileBlob.size` index
- ✅ Avoids N+1 with `select_related('blob')`
- ✅ Efficient range queries

### 4. Date Range Filtering

**Optimized Query:**
```python
# Uses uploaded_at index
queryset = queryset.filter(uploaded_at__gte=date_from, uploaded_at__lte=date_to)
```

**Performance Characteristics:**
- ✅ Uses `uploaded_at` index
- ✅ Efficient date range queries
- ✅ Composite indices for date + other fields

### 5. Composite Filtering

**Optimized Query:**
```python
# Uses multiple indices efficiently
queryset = queryset.filter(
    Q(file_type__istartswith='image/') &
    Q(uploaded_at__gte=yesterday) &
    Q(blob__size__gte=1024)
)
```

**Performance Characteristics:**
- ✅ Uses composite indices where available
- ✅ Combines multiple single-field indices
- ✅ Optimized query plan generation

## 🚀 Query Optimization Techniques

### 1. Select Related for Foreign Keys

```python
# Optimized queryset with select_related
queryset = File.objects.select_related('blob').all()
```

**Benefits:**
- ✅ Eliminates N+1 queries for blob data
- ✅ Single query for file + blob information
- ✅ Essential for size filtering operations

### 2. Efficient Aggregation

```python
# Optimized storage stats calculation
reported_total = File.objects.select_related('blob').aggregate(
    total=Sum('blob__size')
)['total'] or 0

physical_total = FileBlob.objects.aggregate(
    total=Sum('size')
)['total'] or 0
```

**Benefits:**
- ✅ Single query per aggregation
- ✅ Uses database-level aggregation
- ✅ Avoids Python-level calculations

### 3. Pagination for Large Results

```python
class FilePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
```

**Benefits:**
- ✅ Limits result set size
- ✅ Reduces memory usage
- ✅ Improves response time

## 📈 Performance Testing

### Running Performance Tests

```bash
# Run performance tests
cd backend
python performance_test.py
```

### Test Coverage

The performance test script covers:

1. **Filename Search Performance**
   - Tests `icontains` queries on indexed field
   - Measures query execution time

2. **File Type Filtering Performance**
   - Tests `istartswith` and `iexact` queries
   - Verifies index usage

3. **Size Filtering Performance**
   - Tests blob relationship queries
   - Ensures select_related optimization

4. **Date Filtering Performance**
   - Tests date range queries
   - Verifies index efficiency

5. **Composite Filtering Performance**
   - Tests multi-field filtering
   - Ensures optimal query plans

6. **Storage Stats Performance**
   - Tests aggregation queries
   - Verifies efficient calculations

### Query Plan Analysis

The test script includes query plan analysis to verify:

- ✅ Index usage for each query type
- ✅ Query plan optimization
- ✅ No table scans on large datasets
- ✅ Efficient join operations

## 🔧 Monitoring and Maintenance

### Index Usage Monitoring

```sql
-- Check index usage (SQLite)
SELECT name, sql FROM sqlite_master WHERE type='index';

-- Analyze query plans
EXPLAIN QUERY PLAN SELECT * FROM files_file WHERE original_filename LIKE '%test%';
```

### Performance Metrics

Key metrics to monitor:

1. **Query Execution Time**
   - Filename search: < 100ms for 10K files
   - Type filtering: < 50ms for 10K files
   - Date filtering: < 50ms for 10K files
   - Composite filtering: < 200ms for 10K files

2. **Memory Usage**
   - Pagination limits memory consumption
   - select_related reduces query count
   - Efficient aggregation avoids large result sets

3. **Database Size**
   - Indices add ~20-30% to database size
   - Trade-off for query performance
   - Regular maintenance recommended

## 🚨 Performance Anti-Patterns to Avoid

### ❌ Don't Use These Patterns

1. **Avoid unindexed searches:**
   ```python
   # Bad: No index on content field
   queryset = File.objects.filter(content__icontains='search')
   ```

2. **Avoid N+1 queries:**
   ```python
   # Bad: Causes N+1 queries
   for file in File.objects.all():
       print(file.blob.size)  # Separate query per file
   ```

3. **Avoid large result sets:**
   ```python
   # Bad: No pagination
   files = File.objects.all()  # Could be thousands of records
   ```

4. **Avoid inefficient text searches:**
   ```python
   # Bad: Full text search on large fields
   queryset = File.objects.filter(description__icontains='search')
   ```

### ✅ Use These Patterns Instead

1. **Use indexed searches:**
   ```python
   # Good: Uses index
   queryset = File.objects.filter(original_filename__icontains='search')
   ```

2. **Use select_related:**
   ```python
   # Good: Single query
   files = File.objects.select_related('blob').all()
   for file in files:
       print(file.blob.size)  # No additional queries
   ```

3. **Use pagination:**
   ```python
   # Good: Limited result set
   files = File.objects.all()[:20]  # Or use pagination class
   ```

4. **Use exact matches where possible:**
   ```python
   # Good: Uses index efficiently
   queryset = File.objects.filter(extension__iexact='pdf')
   ```

## 📊 Expected Performance

### Small Dataset (< 1K files)
- All queries: < 10ms
- Storage stats: < 5ms
- Full text search: < 20ms

### Medium Dataset (1K - 10K files)
- Indexed queries: < 50ms
- Storage stats: < 20ms
- Full text search: < 100ms

### Large Dataset (10K+ files)
- Indexed queries: < 200ms
- Storage stats: < 100ms
- Full text search: < 500ms
- Pagination essential

## 🔄 Maintenance Recommendations

1. **Regular Index Analysis**
   - Monitor index usage
   - Remove unused indices
   - Add indices for new query patterns

2. **Database Optimization**
   - Regular VACUUM (SQLite)
   - ANALYZE for query optimization
   - Monitor database size growth

3. **Query Monitoring**
   - Log slow queries
   - Monitor query patterns
   - Optimize based on usage

4. **Performance Testing**
   - Run performance tests regularly
   - Test with realistic data volumes
   - Monitor performance regressions
