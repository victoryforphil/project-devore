import { FolderOpen, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFileSystem } from "@/contexts/FileSystemContext"
import { useTheme } from "@/hooks/useDarkMode"
import { useToast } from "@/lib/toast"
import { useState, useEffect } from "react"

export function Toolbar() {
  const { selectFilesOrFolder, isLoading, error } = useFileSystem()
  const { isDark, toggleTheme } = useTheme()
  const { error: showError, info } = useToast()
  const [themeState, setThemeState] = useState(isDark)

  useEffect(() => {
    const handleThemeChange = () => {
      setThemeState(document.documentElement.classList.contains('dark'))
    }
    window.addEventListener('theme-changed', handleThemeChange)
    return () => window.removeEventListener('theme-changed', handleThemeChange)
  }, [])

  const handleSelectFiles = async () => {
    info("Opening file picker...")
    await selectFilesOrFolder()
  }

  useEffect(() => {
    if (error) {
      showError(error, 5000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="font-semibold text-base">UAV Telemetry Viewer</h1>
        <div className="h-4 w-px bg-border" />
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleSelectFiles}
          disabled={isLoading}
          className="h-8"
        >
          <FolderOpen className="h-4 w-4 mr-2" />
          {isLoading ? "Opening..." : "Open Files"}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => {
            toggleTheme()
            setThemeState(!themeState)
          }}
          className="h-8 w-8 p-0"
          title={themeState ? "Switch to light mode" : "Switch to dark mode"}
        >
          {themeState ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
