# Enhanced Filter Bar - Integration Guide

## Overview

The Enhanced Filter Bar provides a powerful, beautiful, and performant filtering system for the admin panel master sheet. It includes advanced features like multi-criteria filtering, saved filters, quick presets, and smooth animations.

## Features

### 🎨 Beautiful UI
- Smooth animations and transitions
- Collapsible design to save space
- Active filter count badge
- Color-coded status buttons
- Gradient backgrounds and hover effects
- Responsive layout

### ⚡ Performance Optimized
- Memoized filter functions
- Efficient sorting algorithms
- Debounced search inputs
- Optimized re-renders with useCallback
- Smart filtering logic

### 🔍 Advanced Filtering
- **Quick Search**: Search across all columns
- **AWB Search**: Dedicated AWB number search
- **Date Range**: Filter by date with quick presets
- **Status Filter**: Pending, Done, Rejected (multi-select)
- **Agent Filter**: Filter by specific agent
- **Region Filter**: Filter by region
- **Multi-Sort**: Primary and secondary sorting
- **Saved Filters**: Save and reuse filter configurations

## Integration Steps

### 1. Import Components

```jsx
import EnhancedFilterBar from '@/components/EnhancedFilterBar';
import { applyFilters, getUniqueAgents, getUniqueRegions } from '@/utils/filterHelpers';
```

### 2. Set Up State

```jsx
const [currentFilters, setCurrentFilters] = useState(null);
const [savedFilters, setSavedFilters] = useState([]);
const [filteredRows, setFilteredRows] = useState([]);

// Extract unique agents and regions from your data
const uniqueAgents = useMemo(() => getUniqueAgents(csSheet.raw), [csSheet.raw]);
const uniqueRegions = useMemo(() => getUniqueRegions(csSheet.raw), [csSheet.raw]);
```

### 3. Handle Filter Events

```jsx
const handleApplyFilters = useCallback((filters) => {
  setCurrentFilters(filters);
  const filtered = applyFilters(csSheet.raw, filters);
  setFilteredRows(filtered);
}, [csSheet.raw]);

const handleClearFilters = useCallback(() => {
  setCurrentFilters(null);
  setFilteredRows(csSheet.raw);
}, [csSheet.raw]);

const handleSaveFilter = useCallback((filter) => {
  setSavedFilters(prev => [...prev, filter]);
  // Optionally save to localStorage or backend
  localStorage.setItem('admin_saved_filters', JSON.stringify([...savedFilters, filter]));
}, [savedFilters]);

const handleDeleteFilter = useCallback((filter) => {
  setSavedFilters(prev => prev.filter(f => f.name !== filter.name));
  localStorage.setItem('admin_saved_filters', JSON.stringify(savedFilters.filter(f => f.name !== filter.name)));
}, [savedFilters]);

const handleLoadFilter = useCallback((filter) => {
  handleApplyFilters(filter);
}, [handleApplyFilters]);
```

### 4. Load Saved Filters on Mount

```jsx
useEffect(() => {
  const saved = localStorage.getItem('admin_saved_filters');
  if (saved) {
    try {
      setSavedFilters(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load saved filters:', e);
    }
  }
}, []);
```

### 5. Render the Filter Bar

```jsx
<EnhancedFilterBar
  columns={[
    'STATUS', 'LINE', 'TIME', 'LOT', 'REMARKS', 'AGENTS', "AWB'S",
    'REASON', 'REGION', 'CONFIRMATION', 'AGENT2', '2ND REJECTION',
    '2ND CONFIRMATION', '3RD REJECTION', '3RD CONFIRMATION',
    '4TH REJECTION', '4TH CONFIRMATION', '5TH REJECTION',
    '5TH CONFIRMATION', '6th CONFIRMATION', 'PRIORITY'
  ]}
  agents={uniqueAgents}
  regions={uniqueRegions}
  onApply={handleApplyFilters}
  onClear={handleClearFilters}
  savedFilters={savedFilters}
  onSaveFilter={handleSaveFilter}
  onDeleteFilter={handleDeleteFilter}
  onLoadFilter={handleLoadFilter}
  initial={currentFilters}
/>
```

### 6. Use Filtered Data in Your Sheet

```jsx
const displayRows = currentFilters ? filteredRows : csSheet.raw;

// Use displayRows instead of csSheet.raw in your table rendering
```

## Complete Example

```jsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import EnhancedFilterBar from '@/components/EnhancedFilterBar';
import { applyFilters, getUniqueAgents, getUniqueRegions, getFilterStats } from '@/utils/filterHelpers';

function AdminSheet() {
  const [csSheet, setCSSheet] = useState({ raw: [] });
  const [currentFilters, setCurrentFilters] = useState(null);
  const [savedFilters, setSavedFilters] = useState([]);

  // Load saved filters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin_saved_filters');
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved filters:', e);
      }
    }
  }, []);

  // Get unique values for dropdowns
  const uniqueAgents = useMemo(() => getUniqueAgents(csSheet.raw), [csSheet.raw]);
  const uniqueRegions = useMemo(() => getUniqueRegions(csSheet.raw), [csSheet.raw]);

  // Calculate filtered rows
  const filteredRows = useMemo(() => {
    if (!currentFilters) return csSheet.raw;
    return applyFilters(csSheet.raw, currentFilters);
  }, [csSheet.raw, currentFilters]);

  // Get filter statistics
  const filterStats = useMemo(() => {
    if (!currentFilters) return null;
    return getFilterStats(csSheet.raw, currentFilters);
  }, [csSheet.raw, currentFilters]);

  const handleApplyFilters = useCallback((filters) => {
    setCurrentFilters(filters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setCurrentFilters(null);
  }, []);

  const handleSaveFilter = useCallback((filter) => {
    const updated = [...savedFilters, filter];
    setSavedFilters(updated);
    localStorage.setItem('admin_saved_filters', JSON.stringify(updated));
  }, [savedFilters]);

  const handleDeleteFilter = useCallback((filter) => {
    const updated = savedFilters.filter(f => f.name !== filter.name);
    setSavedFilters(updated);
    localStorage.setItem('admin_saved_filters', JSON.stringify(updated));
  }, [savedFilters]);

  const handleLoadFilter = useCallback((filter) => {
    handleApplyFilters(filter);
  }, [handleApplyFilters]);

  return (
    <div className="space-y-4">
      <EnhancedFilterBar
        columns={[
          'STATUS', 'LINE', 'TIME', 'LOT', 'REMARKS', 'AGENTS', "AWB'S",
          'REASON', 'REGION', 'CONFIRMATION', 'AGENT2'
        ]}
        agents={uniqueAgents}
        regions={uniqueRegions}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        savedFilters={savedFilters}
        onSaveFilter={handleSaveFilter}
        onDeleteFilter={handleDeleteFilter}
        onLoadFilter={handleLoadFilter}
        initial={currentFilters}
      />

      {filterStats && (
        <div className="flex gap-4 text-sm">
          <span>Showing {filterStats.filtered} of {filterStats.total} rows</span>
          <span>Pending: {filterStats.pending}</span>
          <span>Done: {filterStats.done}</span>
          <span>Rejected: {filterStats.rejected}</span>
        </div>
      )}

      {/* Your table component using filteredRows */}
      <YourTableComponent rows={filteredRows} />
    </div>
  );
}
```

## Filter Object Structure

The filter object passed to `onApply` has this structure:

```javascript
{
  dateFrom: "2026-01-07",           // ISO date string
  dateTo: "2026-01-07",             // ISO date string
  statuses: {
    pending: true,
    done: false,
    rejected: false
  },
  searchText: "search term",        // Search across all columns
  selectedAgent: "agent_name",      // Empty string or "all" for no filter
  selectedRegion: "region_name",    // Empty string or "all" for no filter
  awbSearch: "1234567890",          // AWB number search
  sortColumns: [
    { column: "TIME", direction: "desc" },
    { column: "LINE", direction: "asc" }
  ]
}
```

## Filter Helper Functions

### `applyFilters(rows, filters)`
Applies all filters to the rows array and returns filtered results.

```javascript
const filtered = applyFilters(csSheet.raw, currentFilters);
```

### `getUniqueAgents(rows)`
Extracts unique agent names from column 5.

```javascript
const agents = getUniqueAgents(csSheet.raw);
// Returns: ["agent1", "agent2", "agent3"]
```

### `getUniqueRegions(rows)`
Extracts unique regions from column 8.

```javascript
const regions = getUniqueRegions(csSheet.raw);
// Returns: ["North", "South", "East", "West"]
```

### `getFilterStats(rows, filters)`
Returns statistics about filtered data.

```javascript
const stats = getFilterStats(csSheet.raw, currentFilters);
// Returns: {
//   total: 1000,
//   filtered: 150,
//   pending: 50,
//   done: 80,
//   rejected: 20,
//   agentCount: 5,
//   regionCount: 3
// }
```

### `createQuickFilter(type, currentDate)`
Creates predefined filter configurations.

```javascript
const todayFilter = createQuickFilter('today');
const pendingFilter = createQuickFilter('pending-only');
```

Available types:
- `'all'` - Show everything
- `'today'` - Today's records only
- `'pending-only'` - Pending status only
- `'done-only'` - Done status only
- `'rejected-only'` - Rejected status only

## Styling Customization

The component uses Tailwind CSS and can be customized by modifying the className props:

```jsx
<EnhancedFilterBar
  className="custom-class"
  // ... other props
/>
```

Key color schemes:
- Primary: Yellow (yellow-400, yellow-500)
- Success: Green (green-500, green-600)
- Error: Red (red-500, red-600)
- Warning: Yellow (yellow-500, yellow-600)
- Info: Blue (blue-500, blue-600)

## Performance Tips

1. **Memoize filter results**: Use `useMemo` to cache filtered rows
2. **Debounce search input**: Add debouncing to search fields for better performance
3. **Virtual scrolling**: Use react-window for large datasets
4. **Lazy loading**: Load filters data only when needed

## Keyboard Shortcuts

- Press `Enter` in search fields to apply filters
- Press `Escape` to close save dialog

## Accessibility

- All interactive elements are keyboard accessible
- Proper ARIA labels on form controls
- Color-blind friendly status colors
- Screen reader compatible

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Filters not applying
- Check console for errors
- Verify filter object structure
- Ensure `onApply` callback is properly connected

### Performance issues with large datasets
- Use memoization for filter results
- Implement virtual scrolling
- Consider server-side filtering for very large datasets (>10,000 rows)

### Saved filters not persisting
- Check localStorage is enabled
- Verify JSON serialization is working
- Consider using a database for production

## Future Enhancements

Potential improvements:
1. Export filtered results to Excel
2. Advanced regex search
3. Custom filter expressions
4. Filter templates
5. Share filters with other users
6. Filter history/undo
7. Real-time filter preview
8. Column-specific advanced filters

## Support

For issues or questions, refer to the component source code in:
- `/src/components/EnhancedFilterBar.jsx`
- `/src/utils/filterHelpers.js`
