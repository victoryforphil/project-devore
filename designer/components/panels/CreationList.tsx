'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export function CreationList() {
  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-2">Node Library</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Drag nodes onto the canvas to build your drone show
        </p>
      </div>
      
      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase">Generators</div>
        <Card 
          className="cursor-move hover:border-primary hover:shadow-md transition-all active:scale-95"
          draggable
          onDragStart={(e) => handleDragStart(e, 'gridGenerator')}
        >
          <CardHeader className="p-4">
            <CardTitle className="text-sm">3D Grid Generator</CardTitle>
            <CardDescription className="text-xs">
              Creates a 3D grid of drones with configurable dimensions
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
      
      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase">Outputs</div>
        <Card 
          className="cursor-move hover:border-primary hover:shadow-md transition-all active:scale-95"
          draggable
          onDragStart={(e) => handleDragStart(e, 'clusterOutput')}
        >
          <CardHeader className="p-4">
            <CardTitle className="text-sm">Cluster Output</CardTitle>
            <CardDescription className="text-xs">
              Displays drone cluster in 3D preview panel
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
      </div>
    </ScrollArea>
  );
}

