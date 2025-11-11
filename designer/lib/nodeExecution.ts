import { Edge } from '@xyflow/react';
import { AppNode, GridGeneratorData, ClusterOutputData } from '@/types/nodes';
import { ClusterData, Drone } from '@/types/drone';

export function executeGraph(nodes: AppNode[], edges: Edge[]): ClusterData | null {
  // Build adjacency list for the graph
  const adjacencyList = new Map<string, string[]>();
  const incomingEdges = new Map<string, Edge[]>();
  
  nodes.forEach(node => {
    adjacencyList.set(node.id, []);
    incomingEdges.set(node.id, []);
  });
  
  edges.forEach(edge => {
    const sourceConnections = adjacencyList.get(edge.source) || [];
    sourceConnections.push(edge.target);
    adjacencyList.set(edge.source, sourceConnections);
    
    const targetIncoming = incomingEdges.get(edge.target) || [];
    targetIncoming.push(edge);
    incomingEdges.set(edge.target, targetIncoming);
  });
  
  // Topological sort to determine execution order
  const executionOrder = topologicalSort(nodes, adjacencyList);
  if (!executionOrder) {
    console.error('Circular dependency detected in graph');
    return null;
  }
  
  // Execute nodes in order and store results
  const nodeOutputs = new Map<string, ClusterData>();
  let finalOutput: ClusterData | null = null;
  
  for (const nodeId of executionOrder) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) continue;
    
    if (node.type === 'gridGenerator') {
      const output = executeGridGenerator(node.data as GridGeneratorData);
      nodeOutputs.set(nodeId, output);
    } else if (node.type === 'clusterOutput') {
      const incoming = incomingEdges.get(nodeId) || [];
      if (incoming.length > 0) {
        const sourceNodeId = incoming[0].source;
        const inputData = nodeOutputs.get(sourceNodeId);
        if (inputData) {
          finalOutput = inputData;
        }
      }
    }
  }
  
  return finalOutput;
}

function topologicalSort(nodes: AppNode[], adjacencyList: Map<string, string[]>): string[] | null {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const result: string[] = [];
  
  function visit(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) {
      return false; // Cycle detected
    }
    if (visited.has(nodeId)) {
      return true;
    }
    
    recursionStack.add(nodeId);
    
    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visit(neighbor)) {
        return false;
      }
    }
    
    recursionStack.delete(nodeId);
    visited.add(nodeId);
    result.push(nodeId);
    
    return true;
  }
  
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (!visit(node.id)) {
        return null; // Cycle detected
      }
    }
  }
  
  return result.reverse();
}

function executeGridGenerator(data: GridGeneratorData): ClusterData {
  const drones: Drone[] = [];
  let id = 0;
  
  const offsetX = -(data.width - 1) * data.spacing / 2;
  const offsetY = -(data.height - 1) * data.spacing / 2;
  const offsetZ = -(data.depth - 1) * data.spacing / 2;
  
  for (let x = 0; x < data.width; x++) {
    for (let y = 0; y < data.height; y++) {
      for (let z = 0; z < data.depth; z++) {
        drones.push({
          id: id++,
          position: {
            x: offsetX + x * data.spacing,
            y: offsetY + y * data.spacing,
            z: offsetZ + z * data.spacing,
          },
          color: {
            r: data.color.r,
            g: data.color.g,
            b: data.color.b,
          },
        });
      }
    }
  }
  
  return { drones };
}

