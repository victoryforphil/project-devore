import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Sphere, Html } from '@react-three/drei';
import { 
  Container, 
  Title, 
  Paper, 
  Group, 
  ActionIcon, 
  Text, 
  Stack,
  Tooltip,
  Slider,
  ColorPicker,
  TextInput,
  NumberInput,
} from '@mantine/core';
import { 
  IconPlus, 
  IconTrash, 
} from '@tabler/icons-react';

// Define the drone type
interface Drone {
  id: string;
  position: [number, number, number];
  color: string;
  name: string;
}

const Designer: React.FC = () => {
  // State for drones
  const [drones, setDrones] = useState<Drone[]>([
    { id: '1', position: [0, 0, 0], color: '#ff5733', name: 'Drone 1' },
    { id: '2', position: [2, 0, 0], color: '#33ff57', name: 'Drone 2' },
    { id: '3', position: [0, 0, 2], color: '#3357ff', name: 'Drone 3' },
  ]);
  
  // State for selected drone
  const [selectedDrone, setSelectedDrone] = useState<string | null>(null);
  
  // Get the selected drone object
  const getSelectedDrone = () => drones.find(d => d.id === selectedDrone);
  
  // Add a new drone
  const addDrone = () => {
    const newId = (drones.length + 1).toString();
    const newDrone: Drone = {
      id: newId,
      position: [0, 0, 0],
      color: '#ffffff',
      name: `Drone ${newId}`,
    };
    
    setDrones([...drones, newDrone]);
    setSelectedDrone(newId);
  };
  
  // Remove the selected drone
  const removeDrone = () => {
    if (selectedDrone) {
      setDrones(drones.filter(drone => drone.id !== selectedDrone));
      setSelectedDrone(null);
    }
  };
  
  // Update drone position
  const updateDronePosition = (axis: 'x' | 'y' | 'z', value: number) => {
    if (selectedDrone) {
      const updatedDrones = drones.map(drone => {
        if (drone.id === selectedDrone) {
          const position = [...drone.position] as [number, number, number];
          const index = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
          position[index] = value;
          return { ...drone, position };
        }
        return drone;
      });
      
      setDrones(updatedDrones);
    }
  };
  
  // Update drone color
  const updateDroneColor = (color: string) => {
    if (selectedDrone) {
      const updatedDrones = drones.map(drone => {
        if (drone.id === selectedDrone) {
          return { ...drone, color };
        }
        return drone;
      });
      
      setDrones(updatedDrones);
    }
  };
  
  // Update drone name
  const updateDroneName = (name: string) => {
    if (selectedDrone) {
      const updatedDrones = drones.map(drone => {
        if (drone.id === selectedDrone) {
          return { ...drone, name };
        }
        return drone;
      });
      
      setDrones(updatedDrones);
    }
  };
  
  // Handle drone selection
  const handleDroneClick = (id: string) => {
    setSelectedDrone(id);
  };
  
  return (
    <Container fluid p="md">
      <Title order={2} mb="md">Drone Light Show Designer</Title>
      
      <Group grow align="flex-start">
        {/* 3D Viewer */}
        <Paper p={0} shadow="md" style={{ height: 'calc(100vh - 180px)' }}>
          <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            
            <Grid
              infiniteGrid
              cellSize={1}
              cellThickness={0.5}
              cellColor="#6f6f6f"
              sectionSize={5}
              sectionThickness={1}
              sectionColor="#9d4b4b"
              fadeDistance={50}
              fadeStrength={1}
            />
            
            {/* Render drones */}
            {drones.map((drone) => (
              <group key={drone.id} position={drone.position} onClick={(e) => {
                e.stopPropagation();
                handleDroneClick(drone.id);
              }}>
                <Sphere args={[0.3]} castShadow>
                  <meshStandardMaterial
                    color={drone.color}
                    emissive={drone.color}
                    emissiveIntensity={0.5}
                  />
                </Sphere>
                
                <Html distanceFactor={10}>
                  <div style={{ 
                    color: 'white', 
                    background: 'rgba(0,0,0,0.5)', 
                    padding: '2px 5px', 
                    borderRadius: '3px',
                    transform: 'translateY(-30px)',
                    opacity: selectedDrone === drone.id ? 1 : 0.5
                  }}>
                    {drone.name}
                  </div>
                </Html>
              </group>
            ))}
            
            <OrbitControls />
          </Canvas>
        </Paper>
        
        {/* Drone Editor */}
        <Stack style={{ height: 'calc(100vh - 180px)', overflow: 'auto' }}>
          <Paper shadow="md" p="md">
            <Group position="apart" mb="md">
              <Title order={3}>Drones</Title>
              <Group>
                <Tooltip label="Add Drone">
                  <ActionIcon color="blue" onClick={addDrone}>
                    <IconPlus size="1.2rem" />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Remove Selected Drone">
                  <ActionIcon 
                    color="red" 
                    onClick={removeDrone}
                    disabled={!selectedDrone}
                  >
                    <IconTrash size="1.2rem" />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
            
            {/* Drone list */}
            <Stack spacing="xs">
              {drones.map((drone) => (
                <Paper 
                  key={drone.id}
                  p="xs"
                  withBorder
                  style={{ 
                    borderColor: selectedDrone === drone.id ? 'blue' : 'transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleDroneClick(drone.id)}
                >
                  <Group>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundColor: drone.color,
                      }}
                    />
                    <Text>{drone.name}</Text>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Paper>
          
          {/* Drone Editor */}
          {selectedDrone && getSelectedDrone() && (
            <Paper shadow="md" p="md">
              <Title order={3} mb="md">Edit Drone</Title>
              
              <Stack spacing="md">
                <TextInput
                  label="Name"
                  value={getSelectedDrone()?.name || ''}
                  onChange={(e) => updateDroneName(e.target.value)}
                />
                
                <Stack spacing="xs">
                  <Text size="sm" weight={500}>Position</Text>
                  
                  <Group position="apart" align="center">
                    <Text size="sm" style={{ width: 15 }}>X:</Text>
                    <Slider
                      value={getSelectedDrone()?.position[0] || 0}
                      onChange={(value) => updateDronePosition('x', value)}
                      min={-10}
                      max={10}
                      step={0.1}
                      style={{ flex: 1 }}
                      thumbLabel="X position"
                      label={(value) => value.toFixed(1)}
                      marks={[
                        { value: -10, label: '-10' },
                        { value: 0, label: '0' },
                        { value: 10, label: '10' },
                      ]}
                    />
                    <NumberInput
                      value={getSelectedDrone()?.position[0] || 0}
                      onChange={(value) => updateDronePosition('x', Number(value))}
                      min={-10}
                      max={10}
                      step={0.1}
                      style={{ width: 70 }}
                      precision={1}
                    />
                  </Group>
                  
                  <Group position="apart" align="center">
                    <Text size="sm" style={{ width: 15 }}>Y:</Text>
                    <Slider
                      value={getSelectedDrone()?.position[1] || 0}
                      onChange={(value) => updateDronePosition('y', value)}
                      min={-10}
                      max={10}
                      step={0.1}
                      style={{ flex: 1 }}
                      thumbLabel="Y position"
                      label={(value) => value.toFixed(1)}
                      marks={[
                        { value: -10, label: '-10' },
                        { value: 0, label: '0' },
                        { value: 10, label: '10' },
                      ]}
                    />
                    <NumberInput
                      value={getSelectedDrone()?.position[1] || 0}
                      onChange={(value) => updateDronePosition('y', Number(value))}
                      min={-10}
                      max={10}
                      step={0.1}
                      style={{ width: 70 }}
                      precision={1}
                    />
                  </Group>
                  
                  <Group position="apart" align="center">
                    <Text size="sm" style={{ width: 15 }}>Z:</Text>
                    <Slider
                      value={getSelectedDrone()?.position[2] || 0}
                      onChange={(value) => updateDronePosition('z', value)}
                      min={-10}
                      max={10}
                      step={0.1}
                      style={{ flex: 1 }}
                      thumbLabel="Z position"
                      label={(value) => value.toFixed(1)}
                      marks={[
                        { value: -10, label: '-10' },
                        { value: 0, label: '0' },
                        { value: 10, label: '10' },
                      ]}
                    />
                    <NumberInput
                      value={getSelectedDrone()?.position[2] || 0}
                      onChange={(value) => updateDronePosition('z', Number(value))}
                      min={-10}
                      max={10}
                      step={0.1}
                      style={{ width: 70 }}
                      precision={1}
                    />
                  </Group>
                </Stack>
                
                <Stack spacing="xs">
                  <Text size="sm" weight={500}>Color</Text>
                  <ColorPicker
                    format="hex"
                    value={getSelectedDrone()?.color || '#ffffff'}
                    onChange={updateDroneColor}
                    swatches={[
                      '#ff5733', '#33ff57', '#3357ff', '#ff33f5', 
                      '#f5ff33', '#33f5ff', '#ffffff', '#ff0000',
                      '#00ff00', '#0000ff', '#ffff00', '#00ffff'
                    ]}
                  />
                </Stack>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Group>
    </Container>
  );
};

export default Designer; 