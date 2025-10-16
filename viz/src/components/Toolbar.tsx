import { File, Settings, Moon, Sun, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
    console.log('[Toolbar] Opening file/folder picker...')
    info("Opening file picker...")
    await selectFilesOrFolder()
    console.log('[Toolbar] File picker closed')
  }

  useEffect(() => {
    if (error) {
      console.error('[Toolbar] File system error:', error)
      showError(error, 5000)
    }
  }, [error, showError])

  return (
    <div className="border-b border-border bg-background px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {/* File Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              File
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={handleSelectFiles} disabled={isLoading}>
              <File className="mr-2 h-4 w-4" />
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening...
                </>
              ) : (
                "Open File/Folder"
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              View
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem>Layout Options</DropdownMenuItem>
            <DropdownMenuItem>Reset Layout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Tools Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              Tools
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem>Analysis Tools</DropdownMenuItem>
            <DropdownMenuItem>Export Data</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => {
            toggleTheme()
            setThemeState(!themeState)
          }}
        >
          {themeState ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* Settings Button */}
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
