# Quick Start Guide

Welcome to Drone Light Designer! This guide will help you get started creating your first drone light show.

## First Steps

When you open the application, you'll see an example setup with:
- A **3D Grid Generator** node connected to a **Cluster Output** node
- The 3D preview showing 48 drones (4×4×3 grid)

## Interface Overview

### Top Toolbar
- **New/Open/Save**: File operations (coming soon)
- **Playback Controls**: Timeline controls (coming soon)
- **Dark Mode Toggle**: Switch between light and dark themes
- **Settings**: Additional options (coming soon)

### Creation List (Left Panel)
Contains all available node types:
- **Generators**: Create drone formations
- **Outputs**: Display results

**Tip**: Drag nodes from here onto the graph canvas

### Graph View (Center Panel)
Your node-based workspace:
- **Add Nodes**: Drag from Creation List
- **Connect Nodes**: Click and drag from output (right) to input (left) handles
- **Select Nodes**: Click to select and edit in Inspector
- **Move Nodes**: Drag nodes to organize your graph
- **Delete**: Select and press Delete key

### Preview (Right Panel)
Real-time 3D visualization:
- **Mouse Controls**:
  - Left drag: Rotate view
  - Scroll: Zoom in/out
  - Right drag: Pan camera
- **Stats Display**: Shows drone count and formation bounds

### Inspector (Bottom Panel)
Edit selected node properties:
- Adjust grid dimensions (width, height, depth)
- Change spacing between drones
- Set drone colors (RGB values)

## Creating Your First Formation

1. **Start Fresh** (optional):
   - Select both existing nodes (Shift+Click)
   - Press Delete
   
2. **Add a Grid Generator**:
   - Drag "3D Grid Generator" from Creation List to canvas
   - Click on it to select
   
3. **Customize in Inspector**:
   - Set Width: 5
   - Set Height: 5
   - Set Depth: 1 (for a flat formation)
   - Adjust Spacing: 2.0
   - Change Color: R: 255, G: 100, B: 150
   
4. **Add Output**:
   - Drag "Cluster Output" to canvas
   - Connect Grid Generator (right handle) to Cluster Output (left handle)
   
5. **View Results**:
   - Check the Preview panel to see your formation in 3D!

## Tips & Tricks

### Organizing Your Workspace
- Arrange nodes left-to-right (generators → processors → outputs)
- Use the minimap (bottom right of graph) for navigation
- Zoom to fit: Use controls in bottom left of graph

### Panel Layout
- Drag panel tabs to rearrange
- Resize panels by dragging the dividers
- Your layout is saved automatically

### Dark Mode
- Toggle with the moon/sun icon in top toolbar
- All panels and the 3D view adapt to your theme

### Performance
- The app handles hundreds of drones smoothly
- Preview updates in real-time as you edit

## Next Steps

Try these ideas:
1. Create multiple grid generators with different colors
2. Experiment with spacing to create tight or loose formations
3. Build larger formations (try 10×10×5 = 500 drones!)
4. Use the 3D view to verify spacing and positioning

## Keyboard Shortcuts

- **Delete**: Remove selected nodes
- **Ctrl/Cmd + Z**: Undo (coming soon)
- **Ctrl/Cmd + S**: Save (coming soon)

## Need Help?

- Check the node descriptions in the Creation List
- Hover over controls for tooltips
- Watch the Preview panel stats for formation info

Happy designing! 🚁✨

