'use client';

import { useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useFlowStore } from '@/store/flowStore';
import { usePreviewStore } from '@/store/previewStore';
import { useDarkMode } from '@/hooks/useDarkMode';
import { AppNode } from '@/types/nodes';
import { GridGeneratorNode } from '@/components/nodes/GridGeneratorNode';
import { ClusterOutputNode } from '@/components/nodes/ClusterOutputNode';
import { executeGraph } from '@/lib/nodeExecution';

const nodeTypes = {
  gridGenerator: GridGeneratorNode,
  clusterOutput: ClusterOutputNode,
};

function GraphViewInner() {
  const { isDark } = useDarkMode();
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setSelectedNodeId,
  } = useFlowStore();

  const { setClusterData } = usePreviewStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Execute graph whenever nodes or edges change
  useEffect(() => {
    const output = executeGraph(nodes, edges);
    setClusterData(output);
  }, [nodes, edges, setClusterData]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNode: AppNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data:
          type === 'gridGenerator'
            ? { width: 3, height: 3, depth: 3, spacing: 1, color: { r: 255, g: 255, b: 255 } }
            : { cluster: null },
      } as AppNode;

      addNode(newNode);
    },
    [addNode]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: AppNode) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  return (
    <div className="w-full h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        colorMode={isDark ? 'dark' : 'light'}
      >
        <Background variant={BackgroundVariant.Dots} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

export function GraphView() {
  return (
    <ReactFlowProvider>
      <GraphViewInner />
    </ReactFlowProvider>
  );
}

