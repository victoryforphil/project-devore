'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { usePreviewStore } from '@/store/previewStore';
import { useDarkMode } from '@/hooks/useDarkMode';

function DroneVisualization() {
  const { clusterData } = usePreviewStore();

  if (!clusterData || !clusterData.drones.length) {
    return null;
  }

  return (
    <group>
      {clusterData.drones.map((drone) => (
        <mesh
          key={drone.id}
          position={[drone.position.x, drone.position.y, drone.position.z]}
        >
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial
            color={`rgb(${drone.color.r}, ${drone.color.g}, ${drone.color.b})`}
            emissive={`rgb(${drone.color.r}, ${drone.color.g}, ${drone.color.b})`}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

export function Preview() {
  const { isDark } = useDarkMode();
  const { clusterData } = usePreviewStore();

  const bounds = clusterData?.drones.length
    ? getBounds(clusterData.drones)
    : null;

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
        <color attach="background" args={[isDark ? '#0a0a0a' : '#f5f5f5']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        <DroneVisualization />
        <Grid infiniteGrid cellSize={1} cellThickness={0.5} sectionSize={5} />
        <OrbitControls makeDefault />
      </Canvas>
      
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-sm border shadow-lg">
        <p className="font-semibold mb-2">Preview Stats</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Drones:</span>
            <span className="font-mono font-semibold">
              {clusterData?.drones.length || 0}
            </span>
          </div>
          {bounds && (
            <>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Bounds X:</span>
                <span className="font-mono">
                  {bounds.minX.toFixed(1)} to {bounds.maxX.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Bounds Y:</span>
                <span className="font-mono">
                  {bounds.minY.toFixed(1)} to {bounds.maxY.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Bounds Z:</span>
                <span className="font-mono">
                  {bounds.minZ.toFixed(1)} to {bounds.maxZ.toFixed(1)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-2 text-xs border">
        <p className="text-muted-foreground">
          🖱️ Drag to rotate • Scroll to zoom • Right-drag to pan
        </p>
      </div>
    </div>
  );
}

function getBounds(drones: any[]) {
  const positions = drones.map(d => d.position);
  return {
    minX: Math.min(...positions.map(p => p.x)),
    maxX: Math.max(...positions.map(p => p.x)),
    minY: Math.min(...positions.map(p => p.y)),
    maxY: Math.max(...positions.map(p => p.y)),
    minZ: Math.min(...positions.map(p => p.z)),
    maxZ: Math.max(...positions.map(p => p.z)),
  };
}

