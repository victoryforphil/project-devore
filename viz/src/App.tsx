import { AppProvider } from "@/context/AppContext"
import { FileSystemProvider } from "@/contexts/FileSystemContext"
import { Toolbar } from "@/components/Toolbar"
import { Sidebar } from "@/components/Sidebar"
import { Inspector } from "@/components/Inspector"
import { CenterPanels } from "@/components/CenterPanels"
import { Timeline } from "@/components/Timeline"
import { ToastContainer } from "@/components/ToastContainer"
import { useDarkMode } from "@/hooks/useDarkMode"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"

function AppContent() {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Top Toolbar */}
      <Toolbar />

      {/* Main Content Area with Resizable Panels */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* Left Sidebar - Selectors / File Tree */}
        <ResizablePanel defaultSize={15} minSize={10} maxSize={30}>
          <Sidebar />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Center - Main Visualization Panels */}
        <ResizablePanel defaultSize={65} minSize={30}>
          <CenterPanels />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Sidebar - Inspector */}
        <ResizablePanel defaultSize={20} minSize={10} maxSize={30}>
          <Inspector />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Bottom Timeline / Playback Controls */}
      <Timeline />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  )
}

export default function App() {
  // Initialize dark mode
  useDarkMode()

  return (
    <AppProvider>
      <FileSystemProvider>
        <AppContent />
      </FileSystemProvider>
    </AppProvider>
  )
}