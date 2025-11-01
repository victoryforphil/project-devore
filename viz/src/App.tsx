import { FileSystemProvider } from "@/contexts/FileSystemContext"
import { ParquetWasmProvider } from "@/contexts/ParquetWasmContext"
import { DataSelectionProvider } from "@/contexts/DataSelectionContext"
import { PlaybackProvider } from "@/contexts/PlaybackContext"
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
      <Toolbar />

      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        <ResizablePanel defaultSize={15} minSize={10} maxSize={30}>
          <Sidebar />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={65} minSize={30}>
          <CenterPanels />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={20} minSize={10} maxSize={30}>
          <Inspector />
        </ResizablePanel>
      </ResizablePanelGroup>

      <Timeline />
      <ToastContainer />
    </div>
  )
}

export default function App() {
  useDarkMode()

  return (
    <ParquetWasmProvider>
      <FileSystemProvider>
        <DataSelectionProvider>
          <PlaybackProvider>
            <AppContent />
          </PlaybackProvider>
        </DataSelectionProvider>
      </FileSystemProvider>
    </ParquetWasmProvider>
  )
}