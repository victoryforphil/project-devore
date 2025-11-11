'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GridGeneratorData } from '@/types/nodes';
import { Grid3x3 } from 'lucide-react';

export const GridGeneratorNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as GridGeneratorData;
  const totalDrones = nodeData.width * nodeData.height * nodeData.depth;

  return (
    <Card className={`min-w-[200px] ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Grid3x3 className="h-4 w-4" />
          3D Grid Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-2 space-y-1 text-xs">
        <div className="grid grid-cols-2 gap-1">
          <span className="text-muted-foreground">Width:</span>
          <span className="font-mono">{nodeData.width}</span>
          <span className="text-muted-foreground">Height:</span>
          <span className="font-mono">{nodeData.height}</span>
          <span className="text-muted-foreground">Depth:</span>
          <span className="font-mono">{nodeData.depth}</span>
          <span className="text-muted-foreground">Spacing:</span>
          <span className="font-mono">{nodeData.spacing.toFixed(1)}</span>
        </div>
        <div className="pt-2 border-t">
          <span className="text-muted-foreground">Total: </span>
          <span className="font-semibold">{totalDrones} drones</span>
        </div>
      </CardContent>
      
      <Handle
        type="source"
        position={Position.Right}
        id="cluster"
        className="!bg-primary"
      />
    </Card>
  );
});

GridGeneratorNode.displayName = 'GridGeneratorNode';

