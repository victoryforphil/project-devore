# Drone Light Designer

A node-based drone light show designer built with Next.js, React Flow, Three.js, and DockView.

## Features

- **Node-Based Editor**: Visual programming interface using React Flow
- **3D Preview**: Real-time Three.js visualization of drone formations
- **Panel-Based Layout**: Flexible workspace using DockView
- **Dark Mode**: Full dark mode support
- **Grid Generator**: Create 3D grids of drones with configurable dimensions
- **Cluster Output**: Preview drone formations in 3D space

## Getting Started

### Prerequisites

- Bun (latest version)
- Node.js 18+ (for Next.js)

### Installation

```bash
bun install
```

### Development

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
bun run build
bun run start
```

## Usage

1. **Creating Nodes**: Drag nodes from the Creation List panel onto the Graph View
2. **Connecting Nodes**: Connect output handles (right side) to input handles (left side)
3. **Editing Properties**: Select a node to edit its properties in the Inspector panel
4. **Viewing Results**: The Preview panel shows the 3D visualization of your drone cluster

### Node Types

#### 3D Grid Generator
Creates a 3D grid of drones with configurable:
- Width (number of drones in X axis)
- Height (number of drones in Y axis)
- Depth (number of drones in Z axis)
- Spacing (distance between drones)

#### Cluster Output
Terminal node that sends the cluster data to the 3D preview.

## Technology Stack

- **Next.js 16**: React framework with App Router
- **React Flow**: Node-based editor
- **Three.js + React Three Fiber**: 3D visualization
- **DockView**: Panel-based layout system
- **Zustand**: State management
- **Tailwind CSS**: Styling
- **Shadcn UI**: Component library
- **TypeScript**: Type safety

## Project Structure

```
designer/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main page
│   └── globals.css        # Global styles
├── components/
│   ├── layout/            # Layout components
│   │   ├── TopToolbar.tsx
│   │   └── DockviewLayout.tsx
│   ├── nodes/             # Custom React Flow nodes
│   │   ├── GridGeneratorNode.tsx
│   │   └── ClusterOutputNode.tsx
│   ├── panels/            # DockView panels
│   │   ├── CreationList.tsx
│   │   ├── GraphView.tsx
│   │   ├── Inspector.tsx
│   │   └── Preview.tsx
│   └── ui/                # Shadcn UI components
├── lib/
│   ├── utils.ts           # Utility functions
│   └── nodeExecution.ts   # Graph execution engine
├── store/
│   ├── flowStore.ts       # React Flow state
│   └── previewStore.ts    # Preview state
├── types/
│   ├── drone.ts           # Drone type definitions
│   └── nodes.ts           # Node type definitions
└── hooks/
    └── useDarkMode.ts     # Dark mode hook
```

## License

MIT
