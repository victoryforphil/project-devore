'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useDarkMode } from '@/hooks/useDarkMode';
import { 
  Moon, 
  Sun, 
  FileText, 
  FolderOpen, 
  Save,
  Play,
  Pause,
  SkipBack,
  Settings
} from 'lucide-react';

export function TopToolbar() {
  const { isDark, toggle } = useDarkMode();

  return (
    <div className="h-12 border-b bg-background flex items-center px-4 gap-2">
      <div className="font-semibold text-lg">Drone Light Designer</div>
      
      <Separator orientation="vertical" className="h-8 mx-2" />
      
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          New
        </Button>
        <Button variant="ghost" size="sm">
          <FolderOpen className="h-4 w-4 mr-2" />
          Open
        </Button>
        <Button variant="ghost" size="sm">
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
      
      <Separator orientation="vertical" className="h-8 mx-2" />
      
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon">
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Play className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Pause className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1" />
      
      <Button variant="ghost" size="icon">
        <Settings className="h-4 w-4" />
      </Button>
      
      <Button variant="ghost" size="icon" onClick={toggle}>
        {isDark ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

