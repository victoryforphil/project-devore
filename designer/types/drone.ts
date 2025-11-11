export interface DronePosition {
  x: number;
  y: number;
  z: number;
}

export interface DroneColor {
  r: number;
  g: number;
  b: number;
}

export interface Drone {
  id: number;
  position: DronePosition;
  color: DroneColor;
}

export interface ClusterData {
  drones: Drone[];
}

