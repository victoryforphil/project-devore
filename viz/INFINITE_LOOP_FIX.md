# Infinite Loop Fixes

## Problem
The application was experiencing infinite re-render loops when opening folders, causing crashes and performance issues.

## Root Cause
The `useEffect` hooks in components were including unstable dependencies (toast functions) that were being recreated on every render, causing the effect to run infinitely.

## Fixes Applied

### 1. **Sidebar.tsx** - Fixed useEffect Dependencies
**Issue**: Toast functions (`success`, `showError`, `info`) and `loadMetadata` were included in dependencies
```tsx
// Before (WRONG - causes infinite loop)
useEffect(() => {
  // ... code
}, [selectedFiles, loadMetadata, success, showError, info])

// After (FIXED)
useEffect(() => {
  // ... code
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedFiles])
```

**Why**: The toast functions are recreated on every render by the toast library. Including them as dependencies caused the effect to run continuously. Only `selectedFiles` is the actual trigger we want to watch.

### 2. **Toolbar.tsx** - Fixed useEffect Dependencies
**Issue**: `showError` function was included in dependencies
```tsx
// Before (WRONG - causes infinite loop)
useEffect(() => {
  if (error) {
    showError(error, 5000)
  }
}, [error, showError])

// After (FIXED)
useEffect(() => {
  if (error) {
    showError(error, 5000)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [error])
```

**Why**: Similar to above - `showError` is unstable. We only want to react when `error` changes.

## Stable Dependencies Already In Place

### ✅ useParquetSchema Hook
The `loadMetadata` function is properly memoized with `useCallback` and stable dependencies:
```tsx
const loadMetadata = useCallback(
  async (files: any[]) => {
    // ... implementation
  },
  [readSchema, isInitialized] // Stable dependencies
)
```

### ✅ FileSystemContext
All functions are properly wrapped with `useCallback` to maintain referential stability.

## Best Practices Applied

1. **Only include stable dependencies** in useEffect arrays
2. **Use eslint-disable comment** when intentionally excluding unstable functions
3. **Memoize callbacks** with `useCallback` when they need to be dependencies
4. **Keep effects focused** - only watch the data that should trigger the effect

## Testing Checklist

- [ ] Open folder with parquet files - should not cause infinite loop
- [ ] Select multiple files - should load metadata once
- [ ] Clear selection - should not cause re-renders
- [ ] Theme toggle - should work without issues
- [ ] Error states - should display without infinite loops

## Result

The application should now:
- Load files smoothly without crashes
- Only re-render when actual data changes
- Display toast notifications correctly
- Maintain good performance
