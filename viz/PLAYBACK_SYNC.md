# Playback Synchronization Updates

## Overview
Updated the visualization system to provide synchronized playback controls across 2D and 3D views with improved layout and file name display.

## Changes Implemented

### 1. Shared Playback State (`PlaybackContext.tsx`)
Created a new context to manage global playback state:
- **State Management**: Single source of truth for playback position
- **Properties**:
  - `isPlaying`: Boolean for play/pause state
  - `currentIndex`: Current frame/row index
  - `maxIndex`: Total number of frames
  - `currentTime`: Calculated time in seconds (20 FPS)
- **Auto-play**: Automatically advances frames at 20 FPS when playing
- **Functions**:
  - `setIsPlaying()`: Toggle play/pause
  - `setCurrentIndex()`: Jump to specific frame
  - `setMaxIndex()`: Update total frames (called by data loaders)
  - `reset()`: Return to start

### 2. Timeline Component Updates
Enhanced bottom timeline to control global playback:
- **Play/Pause**: Global control for all visualizations
- **Skip Controls**: Jump forward/backward by ~5 seconds (100 frames)
- **Reset Button**: Return to start of data
- **Time Display**: Shows current time and frame number (e.g., "5:23 / 10:00 (6400 / 12000)")
- **Slider**: Scrub through entire dataset
- **Disabled States**: Buttons disabled when no data loaded

### 3. 3D Plot Synchronization
Updated `Trajectory3DPlot.tsx` to use shared playback:
- **Removed Local Playback**: No more duplicate slider at bottom of 3D plot
- **Sync with Timeline**: Uses `currentIndex` from global state
- **Updates Max Index**: Sets `maxIndex` when data loads
- **Cleaner UI**: More space for 3D visualization

### 4. 2D Plot Enhancements
Updated `UavTelemetryPlot.tsx` with multiple improvements:

#### File Name Display
- **Title Shows File**: Changed from "UAV Telemetry" to actual file name
- **Logic**: Extracts filename from selection (e.g., "flight_log.parquet")
- **Fallback**: Shows "No File Selected" when appropriate

#### Playback Indicator
- **Vertical Line**: Shows current playback position on plot
- **Style**: Dotted white line at 50% opacity
- **Synced**: Updates in real-time as Timeline scrubs

#### Max Index Update
- Sets global `maxIndex` when data loads
- Ensures Timeline knows total frame count

### 5. Layout Improvements
Updated `CenterPanels.tsx` for better space utilization:
- **Removed Max Width**: Changed from `max-w-6xl` to full width
- **Better Fill**: Plots now use entire available space
- **Responsive**: Adapts to panel resizing

## Technical Details

### Data Flow
```
Timeline (controls) 
    ↓
PlaybackContext (state)
    ↓
├─ Trajectory3DPlot (currentIndex → 3D visualization)
└─ UavTelemetryPlot (currentIndex → vertical line)
```

### Frame Rate
- **Target**: 20 FPS (50ms per frame)
- **Auto-play**: Advances automatically when playing
- **Manual Control**: Slider allows precise scrubbing

### Provider Hierarchy
```tsx
<DataSelectionProvider>
  <PlaybackProvider>
    <Timeline /> {/* Controls */}
    <Trajectory3DPlot /> {/* Consumer */}
    <UavTelemetryPlot /> {/* Consumer */}
  </PlaybackProvider>
</DataSelectionProvider>
```

## Usage

### For Users
1. **Load Data**: Select columns from file tree
2. **View in 3D or 2D**: Switch between tabs
3. **Control Playback**: Use bottom Timeline controls
4. **Scrub**: Drag slider to jump to specific time
5. **Play/Pause**: Watch animation or pause for inspection

### For Developers
To add new visualizations that sync with playback:

```tsx
import { usePlayback } from "@/contexts/PlaybackContext"

function MyVisualization() {
  const { currentIndex, setMaxIndex } = usePlayback()
  
  // When data loads:
  useEffect(() => {
    setMaxIndex(dataLength)
  }, [dataLength, setMaxIndex])
  
  // Use currentIndex to render:
  return <div>Frame: {currentIndex}</div>
}
```

## Benefits

### User Experience
- **Single Control Point**: One Timeline controls everything
- **Visual Feedback**: See playback position in all views simultaneously
- **Better Space**: More room for visualizations
- **Clear Context**: File name always visible

### Developer Experience
- **Shared State**: No prop drilling
- **Easy Integration**: Hook into `usePlayback()`
- **Consistent Behavior**: All views advance together
- **Maintainable**: Centralized playback logic

## Files Modified

1. `src/contexts/PlaybackContext.tsx` (new)
2. `src/App.tsx` (added PlaybackProvider)
3. `src/components/Timeline.tsx` (connected to context)
4. `src/components/plots/Trajectory3DPlot.tsx` (removed local controls)
5. `src/components/plots/UavTelemetryPlot.tsx` (added sync + file name)
6. `src/components/CenterPanels.tsx` (removed max-width)

## Future Enhancements

Potential additions:
- **Playback Speed Control**: 0.5x, 1x, 2x, 4x speeds
- **Loop Mode**: Restart when reaching end
- **Bookmarks**: Save interesting time positions
- **Export**: Save specific time ranges
- **Keyboard Shortcuts**: Space for play/pause, arrows for frame advance
