import { Node } from '@xyflow/react';
import { ClusterData } from './drone';

export interface GridGeneratorData extends Record<string, unknown> {
  width: number;
  height: number;
  depth: number;
  spacing: number;
  color: { r: number; g: number; b: number };
}

export interface ClusterOutputData extends Record<string, unknown> {
  cluster: ClusterData | null;
}

export type GridGeneratorNode = Node<GridGeneratorData, 'gridGenerator'>;
export type ClusterOutputNode = Node<ClusterOutputData, 'clusterOutput'>;

export type AppNode = GridGeneratorNode | ClusterOutputNode;

