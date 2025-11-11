'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClusterOutputData } from '@/types/nodes';
import { Eye } from 'lucide-react';

export const ClusterOutputNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as ClusterOutputData;
  const droneCount = nodeData.cluster?.drones.length || 0;
  const hasData = droneCount > 0;

  return (
    <Card className={`min-w-[200px] ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Cluster Output
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-2 space-y-1 text-xs">
        <div className={`font-semibold ${hasData ? 'text-primary' : 'text-muted-foreground'}`}>
          {hasData ? `${droneCount} drones` : 'No input'}
        </div>
        {hasData && (
          <div className="text-muted-foreground">
            Preview active
          </div>
        )}
      </CardContent>
      
      <Handle
        type="target"
        position={Position.Left}
        id="cluster"
        className="!bg-primary"
      />
    </Card>
  );
});

ClusterOutputNode.displayName = 'ClusterOutputNode';

