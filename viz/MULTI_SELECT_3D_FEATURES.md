# Multi-Column Selection & 3D Visualization Features

## Summary of New Features

### 1. Multi-Column Selection (Toggle Mode)
- **Click to Toggle**: Click any column in the file tree to add/remove it from selection
- **Visual Feedback**: Selected columns show with:
  - Blue highlight background
  - Animated pulse indicator
  - Bold primary color text
  - Left border accent
- **Multi-Select Counter**: Header shows count when multiple columns selected
- **Organized File Tree**: Files and folders now sorted alphabetically for easier navigation

### 2. 2D Plot - Multiple Columns
- **Multiple Traces**: Display multiple columns simultaneously on the same plot
- **Color Palette**: Each column gets a unique color from the palette:
  - Primary, Chart-2 through Chart-5, Red, Amber, Emerald, Blue, Violet
- **Visibility Toggle**: Show/hide individual columns without removing from selection
- **Legend**: Automatic legend showing all visible columns

### 3. 3D Trajectory Visualization
- **React Three Fiber**: New 3D visualization component using R3F
- **Features**:
  - Animated trajectory path with glowing trail
  - Current position marker (pulsing green sphere)
  - Grid reference plane
  - Orbit controls (click & drag to rotate, scroll to zoom)
  - Interactive playback slider
  - Auto-play animation

### 4. Axis Mapping Controls (Inspector Panel)
When 2+ columns are selected, the Inspector shows:

#### X, Y, Z Axis Assignment
- **Dropdowns**: Assign any selected column to X, Y, or Z axis
- **Auto-Assignment**: 
  - First column → X axis
  - Second column → Y axis
  - Third column → Z axis
- **Color-Coded Labels**:
  - X = Red
  - Y = Green
  - Z = Blue

#### Scale Magnitude Control
- **Range Slider**: 0.1x to 100x scale
- **Number Input**: Fine-tune scale value (0.01 to 1000x)
- **Purpose**: Amplify small movements to make them visible in 3D space
- **Real-time**: Updates shown in 3D view header (e.g., "Scale: 10.0x")

### 5. Inspector Panel - Vertical Layout by Depth
The Inspector adapts based on selection:

#### File Selected
- File metadata (rows, columns, file size)
- Schema information as JSON

#### Single Column Selected
- Column type and properties
- Nullable status
- File row count
- Field details as JSON

#### Multiple Columns Selected (New!)
Top Panel:
- File metadata summary

Scrollable Panel:
- 3D Axis Mapping controls
- List of all selected columns with:
  - Axis indicator (X/Y/Z)
  - Visibility toggle (show/hide in plot)
  - Remove button
  - Color indicator for plot
  - Type and nullable info

## Usage Guide

### Basic Workflow

1. **Open Files**: Click "Open Folder" to load parquet files
2. **Select Columns**: Click columns in the file tree to toggle selection
3. **View 2D Plot**: See all visible columns plotted in the 2D Plots tab
4. **Configure 3D**: In Inspector, assign columns to X, Y, Z axes
5. **Adjust Scale**: Use scale slider to amplify small movements
6. **View 3D**: Switch to 3D Preview tab to see trajectory

### Tips

- **Small Movements**: If you can't see the trajectory, increase the scale (try 10x, 50x, or 100x)
- **2D vs 3D**: Toggle column visibility in Inspector to show different data in each view
- **Navigation**: 
  - In 3D: Left-click drag to rotate, right-click drag to pan, scroll to zoom
  - Timeline: Drag slider to scrub through trajectory

### Keyboard Shortcuts

- **File Tree Search**: Type to filter files and columns
- **Clear Selection**: "Clear All" button in header

## Technical Details

### New Components
- `Trajectory3DPlot.tsx` - React Three Fiber 3D visualization
- Enhanced `Inspector.tsx` - Vertical panel layout with axis mapping
- Enhanced `UnifiedFileTree.tsx` - Toggle selection, sorted tree
- Enhanced `UavTelemetryPlot.tsx` - Multiple column support

### New Context Features
- `AxisMapping` interface - X, Y, Z axis assignments + scale
- `MultiColumnSelection` - Supports multiple columns with visibility flags
- `setAxisMapping()` - Function to update axis assignments and scale
- `addColumnToSelection()` / `removeColumnFromSelection()` - Toggle operations

### Dependencies Added
- `three@0.180.0`
- `@react-three/fiber@9.4.0`
- `@react-three/drei@10.7.6`
- `@types/three@0.180.0`

## Future Enhancements

Possible additions:
- Time-series synchronization between 2D and 3D views
- Export 3D trajectory as animation
- Multiple trajectory comparison
- Custom color selection per column
- Statistics overlay (min/max/avg)
