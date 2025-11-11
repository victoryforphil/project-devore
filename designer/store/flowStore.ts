import { create } from 'zustand';
import {
  Edge,
  EdgeChange,
  NodeChange,
  applyEdgeChanges,
  applyNodeChanges,
  addEdge,
  Connection,
} from '@xyflow/react';
import { AppNode } from '@/types/nodes';

interface FlowState {
  nodes: AppNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setSelectedNodeId: (id: string | null) => void;
  updateNodeData: (nodeId: string, data: Partial<AppNode['data']>) => void;
  addNode: (node: AppNode) => void;
}

// Initial example nodes
const initialExampleNodes: AppNode[] = [
  {
    id: 'grid-1',
    type: 'gridGenerator',
    position: { x: 100, y: 100 },
    data: {
      width: 4,
      height: 4,
      depth: 3,
      spacing: 1.5,
      color: { r: 100, g: 200, b: 255 },
    },
  } as AppNode,
  {
    id: 'output-1',
    type: 'clusterOutput',
    position: { x: 450, y: 100 },
    data: {
      cluster: null,
    },
  } as AppNode,
];

const initialExampleEdges: Edge[] = [
  {
    id: 'edge-1',
    source: 'grid-1',
    target: 'output-1',
    sourceHandle: 'cluster',
    targetHandle: 'cluster',
  },
];

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initialExampleNodes,
  edges: initialExampleEdges,
  selectedNodeId: null,
  
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as AppNode[],
    });
  },
  
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  
  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },
  
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  
  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ) as AppNode[],
    });
  },
  
  addNode: (node) => {
    set({
      nodes: [...get().nodes, node],
    });
  },
}));

