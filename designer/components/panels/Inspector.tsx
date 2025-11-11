'use client';

import { useFlowStore } from '@/store/flowStore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export function Inspector() {
  const { nodes, selectedNodeId, updateNodeData } = useFlowStore();
  
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-muted-foreground text-sm">
          Select a node to view properties
        </p>
      </div>
    );
  }

  if (selectedNode.type === 'gridGenerator') {
    const data = selectedNode.data as any;
    
    return (
      <ScrollArea className="h-full">
        <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Grid Generator Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="width">Width</Label>
              <Input
                id="width"
                type="number"
                value={data.width}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    width: parseInt(e.target.value) || 1,
                  })
                }
                min={1}
                max={20}
              />
            </div>
            
            <div>
              <Label htmlFor="height">Height</Label>
              <Input
                id="height"
                type="number"
                value={data.height}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    height: parseInt(e.target.value) || 1,
                  })
                }
                min={1}
                max={20}
              />
            </div>
            
            <div>
              <Label htmlFor="depth">Depth</Label>
              <Input
                id="depth"
                type="number"
                value={data.depth}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    depth: parseInt(e.target.value) || 1,
                  })
                }
                min={1}
                max={20}
              />
            </div>
            
            <div>
              <Label htmlFor="spacing">Spacing: {data.spacing}</Label>
              <Slider
                id="spacing"
                value={[data.spacing]}
                onValueChange={(value) =>
                  updateNodeData(selectedNode.id, { spacing: value[0] })
                }
                min={0.5}
                max={5}
                step={0.1}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Drone Color</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="color-r" className="text-xs">R</Label>
                  <Input
                    id="color-r"
                    type="number"
                    value={data.color.r}
                    onChange={(e) =>
                      updateNodeData(selectedNode.id, {
                        color: { ...data.color, r: parseInt(e.target.value) || 0 },
                      })
                    }
                    min={0}
                    max={255}
                  />
                </div>
                <div>
                  <Label htmlFor="color-g" className="text-xs">G</Label>
                  <Input
                    id="color-g"
                    type="number"
                    value={data.color.g}
                    onChange={(e) =>
                      updateNodeData(selectedNode.id, {
                        color: { ...data.color, g: parseInt(e.target.value) || 0 },
                      })
                    }
                    min={0}
                    max={255}
                  />
                </div>
                <div>
                  <Label htmlFor="color-b" className="text-xs">B</Label>
                  <Input
                    id="color-b"
                    type="number"
                    value={data.color.b}
                    onChange={(e) =>
                      updateNodeData(selectedNode.id, {
                        color: { ...data.color, b: parseInt(e.target.value) || 0 },
                      })
                    }
                    min={0}
                    max={255}
                  />
                </div>
              </div>
              <div 
                className="w-full h-8 rounded border"
                style={{ 
                  backgroundColor: `rgb(${data.color.r}, ${data.color.g}, ${data.color.b})` 
                }}
              />
            </div>
          </CardContent>
        </Card>
        </div>
      </ScrollArea>
    );
  }

  if (selectedNode.type === 'clusterOutput') {
    const data = selectedNode.data as any;
    const droneCount = data.cluster?.drones?.length || 0;
    
    return (
      <ScrollArea className="h-full">
        <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cluster Output</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>Drone Count: {droneCount}</p>
            </div>
          </CardContent>
        </Card>
        </div>
      </ScrollArea>
    );
  }

  return null;
}

