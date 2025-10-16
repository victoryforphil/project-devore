# Visualization Tool - App Layout

A modern, professional visualization tool built with React, Shadcn UI, and Tailwind CSS using Bun.

## Layout Structure

The application follows a professional editor/visualization tool layout with the following sections:

### 1. **Top Toolbar** (`Toolbar.tsx`)
- File operations menu (Open File, Recent Files)
- View menu for layout options
- Tools menu for analysis and export
- Settings button
- Sticky at the top with dropdown menus

### 2. **Timeline/Playback Controls** (`Timeline.tsx`)
- Play/Pause buttons
- Skip forward/backward buttons
- Interactive timeline slider
- Current time display
- Sticky below toolbar

### 3. **Main Content Area** (Three-column layout)

#### Left Sidebar - **Selectors** (`Sidebar.tsx`)
- Scrollable list of data sources/channels
- Examples: Overview, Telemetry, GPS, IMU, Barometer, Magnetometer, Events, Errors
- Click to select which data to focus on
- Fixed width: 192px (w-48)

#### Center - **Visualization Panels** (`CenterPanels.tsx`)
- Tabbed interface with 4 main views:
  - **2D Plots**: Time-series data visualization
  - **3D Preview**: 3D model/state visualization
  - **Data Table**: JSON/structured data view
  - **Logs**: System logs and messages
- Full height and width, takes remaining space
- Tab-based switching for different views

#### Right Sidebar - **Inspector** (`Inspector.tsx`)
- Properties panel showing current selection details
- Displays metadata like:
  - File name
  - Duration
  - Frame count
  - GPS satellites
  - Altitude, speed, etc.
- Scrollable
- Fixed width: 224px (w-56)

## Component Structure

```
App.tsx
├── Toolbar
│   ├── File Menu
│   ├── View Menu
│   ├── Tools Menu
│   └── Settings Button
├── Timeline
│   ├── Playback Controls
│   └── Timeline Slider
└── Main Content Area (flex)
    ├── Sidebar
    │   └── ScrollArea
    │       └── Selector Items (Buttons)
    ├── CenterPanels
    │   └── Tabs
    │       ├── 2D Plots Tab
    │       ├── 3D Preview Tab
    │       ├── Data Table Tab
    │       └── Logs Tab
    └── Inspector
        └── ScrollArea
            └── Property List
```

## UI Components Used

### Shadcn Components
- **Button**: Primary UI control
- **Dropdown Menu**: File/View/Tools menus
- **Tabs**: Tab switching in center panels
- **Slider**: Timeline scrubbing
- **Separator**: Visual dividers
- **ScrollArea**: Scrollable regions
- **Input**: Text inputs (extensible)

### Icons (Lucide React)
- `File`, `Settings`: Toolbar
- `Play`, `Pause`, `SkipBack`, `SkipForward`: Playback controls
- `ChevronRight`: Sidebar items
- `BarChart3`: 2D plots icon
- `Box`: 3D preview icon
- `FileJson`: Data table icon
- `MessageSquare`: Logs icon

## Styling

### Tailwind CSS Classes
- **Layout**: `flex`, `flex-col`, `flex-1`, `overflow-hidden`
- **Spacing**: `px-4`, `py-3`, `gap-2`, `space-y-2`
- **Colors**: Theme tokens (`bg-background`, `text-foreground`, `border-border`)
- **Sizing**: `h-screen`, `h-full`, `w-full`, `w-48`, `w-56`
- **Borders**: `border`, `border-b`, `border-r`, `border-l`

### Theme Variables
Uses CSS custom properties defined in `index.css`:
- `--background`, `--foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--border`, `--input`
- `--ring`, `--ring-offset`

## Responsive Considerations

Currently built for desktop/wide screens. To add responsiveness:
1. Hide sidebars on small screens
2. Stack panels vertically on mobile
3. Collapse toolbar menu into hamburger
4. Use drawer components for sidebars

## Next Steps / Extensibility

1. **Add real data visualization libraries**: Plotly.js, Three.js, Apache ECharts
2. **Implement data fetching**: Connect to log files, APIs, or real-time streams
3. **Add state management**: Context API or Zustand for shared state
4. **Enhance inspector**: Add editing capabilities, search/filter
5. **Settings panel**: Create full settings view with theme switching
6. **Export functionality**: PNG/PDF export of visualizations
7. **Keyboard shortcuts**: Global shortcuts for playback, tabs, etc.

## Installation & Running

```bash
# Install dependencies
bun install

# Run dev server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

## File Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── tabs.tsx
│   │   ├── slider.tsx
│   │   ├── separator.tsx
│   │   ├── scroll-area.tsx
│   │   └── input.tsx
│   ├── Toolbar.tsx
│   ├── Timeline.tsx
│   ├── Sidebar.tsx
│   ├── Inspector.tsx
│   └── CenterPanels.tsx
├── lib/
│   └── utils.ts
├── App.tsx
├── main.tsx
└── index.css
```
