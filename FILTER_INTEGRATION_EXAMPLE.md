# Quick Integration Example for DHLSheet Component

## Step-by-Step Integration

### 1. Add imports to DHLSheet.jsx

```jsx
import EnhancedFilterBar from '../components/EnhancedFilterBar';
import { applyFilters, getUniqueAgents, getUniqueRegions, getFilterStats } from '@/utils/filterHelpers';
```

### 2. Add state variables (around line 500+)

```jsx
// Add these state variables after existing state declarations
const [currentFilters, setCurrentFilters] = useState(null);
const [adminSavedFilters, setAdminSavedFilters] = useState([]);
```

### 3. Load saved filters on mount (add to existing useEffect)

```jsx
useEffect(() => {
  // ... existing code ...

  // Load saved filters for admin
  if (session.role === 'admin') {
    const savedFilters = localStorage.getItem('dhl_admin_saved_filters');
    if (savedFilters) {
      try {
        setAdminSavedFilters(JSON.parse(savedFilters));
      } catch (e) {
        console.error('Failed to load saved filters:', e);
      }
    }
  }
}, []);
```

### 4. Calculate unique agents and regions (add after state)

```jsx
const uniqueAgents = useMemo(() => {
  if (session.role !== 'admin') return [];
  return getUniqueAgents(csSheet.raw);
}, [csSheet.raw, session.role]);

const uniqueRegions = useMemo(() => {
  if (session.role !== 'admin') return [];
  return getUniqueRegions(csSheet.raw);
}, [csSheet.raw, session.role]);
```

### 5. Calculate filtered rows

```jsx
const displayRows = useMemo(() => {
  if (session.role !== 'admin' || !currentFilters) {
    return csSheet.raw;
  }
  return applyFilters(csSheet.raw, currentFilters);
}, [csSheet.raw, currentFilters, session.role]);

const filterStats = useMemo(() => {
  if (session.role !== 'admin' || !currentFilters) return null;
  return getFilterStats(csSheet.raw, currentFilters);
}, [csSheet.raw, currentFilters, session.role]);
```

### 6. Add filter handlers

```jsx
const handleApplyFilters = useCallback((filters) => {
  setCurrentFilters(filters);
}, []);

const handleClearFilters = useCallback(() => {
  setCurrentFilters(null);
}, []);

const handleSaveFilter = useCallback((filter) => {
  const updated = [...adminSavedFilters, filter];
  setAdminSavedFilters(updated);
  localStorage.setItem('dhl_admin_saved_filters', JSON.stringify(updated));
  toast.success(`Filter "${filter.name}" saved`);
}, [adminSavedFilters]);

const handleDeleteFilter = useCallback((filter) => {
  const updated = adminSavedFilters.filter(f => f.name !== filter.name);
  setAdminSavedFilters(updated);
  localStorage.setItem('dhl_admin_saved_filters', JSON.stringify(updated));
  toast.success(`Filter "${filter.name}" deleted`);
}, [adminSavedFilters]);

const handleLoadFilter = useCallback((filter) => {
  setCurrentFilters(filter);
}, []);
```

### 7. Add filter bar to Admin View (in the JSX return)

Find the admin view section (around line 6000+) and add this before the table:

```jsx
{session.role === "admin" && (
  <>
    {/* Existing admin controls */}

    {/* ADD THIS: Enhanced Filter Bar */}
    <div className="mb-4">
      <EnhancedFilterBar
        columns={CS_COLUMNS}
        agents={uniqueAgents}
        regions={uniqueRegions}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        savedFilters={adminSavedFilters}
        onSaveFilter={handleSaveFilter}
        onDeleteFilter={handleDeleteFilter}
        onLoadFilter={handleLoadFilter}
        initial={currentFilters}
      />
    </div>

    {/* ADD THIS: Filter Stats */}
    {filterStats && (
      <div className="mb-4 flex gap-4 text-sm bg-white p-3 rounded-lg border">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Showing:</span>
          <Badge variant="secondary">
            {filterStats.filtered} of {filterStats.total} rows
          </Badge>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex gap-3">
          <span className="text-green-600">Done: {filterStats.done}</span>
          <span className="text-yellow-600">Pending: {filterStats.pending}</span>
          <span className="text-red-600">Rejected: {filterStats.rejected}</span>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex gap-3 text-gray-600">
          <span>Agents: {filterStats.agentCount}</span>
          <span>Regions: {filterStats.regionCount}</span>
        </div>
      </div>
    )}

    {/* Existing table code, but replace csSheet.raw with displayRows */}
    <div className="virtualized-table">
      {visibleRows.map((rowIdx) => {
        const row = displayRows[rowIdx]; // Changed from csSheet.raw[rowIdx]
        // ... rest of table rendering
      })}
    </div>
  </>
)}
```

### 8. Update table rendering to use displayRows

Find all occurrences of `csSheet.raw` in the admin view and replace with `displayRows`:

**Before:**
```jsx
const visibleRows = [];
for (let i = scrollTop; i < Math.min(scrollTop + bufferSize, csSheet.raw.length); i++) {
  visibleRows.push(i);
}
```

**After:**
```jsx
const visibleRows = [];
for (let i = scrollTop; i < Math.min(scrollTop + bufferSize, displayRows.length); i++) {
  visibleRows.push(i);
}
```

**Before:**
```jsx
style={{ height: `${csSheet.raw.length * ROW_HEIGHT}px` }}
```

**After:**
```jsx
style={{ height: `${displayRows.length * ROW_HEIGHT}px` }}
```

### 9. Update any row count displays

**Before:**
```jsx
<span>Total: {csSheet.raw.length} rows</span>
```

**After:**
```jsx
<span>
  {currentFilters ? (
    <>Showing: {displayRows.length} of {csSheet.raw.length}</>
  ) : (
    <>Total: {csSheet.raw.length} rows</>
  )}
</span>
```

## Complete Example (Minimal)

Here's a minimal working example you can copy:

```jsx
// At the top of DHLSheet.jsx with other imports
import EnhancedFilterBar from '../components/EnhancedFilterBar';
import { applyFilters, getUniqueAgents, getUniqueRegions } from '@/utils/filterHelpers';

// Inside the component, with other state
const [currentFilters, setCurrentFilters] = useState(null);
const [savedFilters, setSavedFilters] = useState([]);

// Memoized calculations
const displayRows = useMemo(() =>
  currentFilters ? applyFilters(csSheet.raw, currentFilters) : csSheet.raw,
  [csSheet.raw, currentFilters]
);

const uniqueAgents = useMemo(() => getUniqueAgents(csSheet.raw), [csSheet.raw]);
const uniqueRegions = useMemo(() => getUniqueRegions(csSheet.raw), [csSheet.raw]);

// Handlers
const handleApplyFilters = useCallback((filters) => setCurrentFilters(filters), []);
const handleClearFilters = useCallback(() => setCurrentFilters(null), []);

// In JSX (admin view)
<EnhancedFilterBar
  columns={CS_COLUMNS}
  agents={uniqueAgents}
  regions={uniqueRegions}
  onApply={handleApplyFilters}
  onClear={handleClearFilters}
  savedFilters={savedFilters}
  onSaveFilter={setSavedFilters}
  onDeleteFilter={(f) => setSavedFilters(prev => prev.filter(x => x.name !== f.name))}
  onLoadFilter={handleApplyFilters}
/>

{/* Use displayRows instead of csSheet.raw in table rendering */}
```

## Testing the Integration

After integration, test these scenarios:

1. ✅ **Basic Search**: Type in quick search, verify results
2. ✅ **Date Filter**: Select today, verify only today's rows show
3. ✅ **Status Toggle**: Click status buttons, verify filtering works
4. ✅ **Agent Filter**: Select an agent, verify only their rows show
5. ✅ **Region Filter**: Select a region, verify filtering
6. ✅ **Sorting**: Apply primary and secondary sort
7. ✅ **Save Filter**: Create and save a filter configuration
8. ✅ **Load Filter**: Click saved filter, verify it loads
9. ✅ **Clear All**: Click clear, verify all filters reset
10. ✅ **Collapse**: Collapse filter bar, verify summary shows

## Performance Check

With the filter integrated:
- 1,000 rows should filter in < 10ms
- 10,000 rows should filter in < 50ms
- UI should remain responsive during filtering
- No lag when typing in search fields

## Common Issues & Solutions

### Issue: Filters not applying
**Solution**: Verify `displayRows` is being used in table rendering, not `csSheet.raw`

### Issue: Stats not updating
**Solution**: Check that `filterStats` is calculated with proper dependencies

### Issue: Saved filters not persisting
**Solution**: Ensure localStorage is enabled and not blocked

### Issue: Performance issues
**Solution**: Check that `useMemo` is used for expensive calculations

### Issue: AWB search not working
**Solution**: Verify AWB column index is correct (column 6)

## Next Steps

After successful integration:

1. Test with real data
2. Adjust column indices if needed
3. Customize color scheme if desired
4. Add additional quick filter presets
5. Consider adding export functionality
6. Set up filter analytics (optional)

## Support

If you encounter issues:
1. Check console for errors
2. Verify all imports are correct
3. Ensure filter helper functions are accessible
4. Test with demo data first
5. Review the complete guide in `ENHANCED_FILTER_GUIDE.md`
