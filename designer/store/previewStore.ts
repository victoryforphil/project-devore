import { create } from 'zustand';
import { ClusterData } from '@/types/drone';

interface PreviewState {
  clusterData: ClusterData | null;
  setClusterData: (data: ClusterData | null) => void;
  cameraPosition: [number, number, number];
  setCameraPosition: (position: [number, number, number]) => void;
}

export const usePreviewStore = create<PreviewState>((set) => ({
  clusterData: null,
  setClusterData: (data) => set({ clusterData: data }),
  cameraPosition: [10, 10, 10],
  setCameraPosition: (position) => set({ cameraPosition: position }),
}));

