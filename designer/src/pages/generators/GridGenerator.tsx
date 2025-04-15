import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Title, 
  Paper, 
  Group, 
  NumberInput, 
  Slider,
  Stack,
  Button,
  Grid,
  Text,
  Switch,
  ColorPicker,
  Box,
} from '@mantine/core';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';

interface DronePoint {
  id: string;
  position: [number, number, number];
  color: string;
}

const GridGenerator: React.FC = () => {
  // Grid configuration
  const [rows, setRows] = useState(3);
  const [columns, setColumns] = useState(3);
  const [spacing, setSpacing] = useState(2);
  const [height, setHeight] = useState(0);
  const [is3D, setIs3D] = useState(false); // For 3D grid (cube)
  const [layers, setLayers] = useState(1); // For 3D grid
  const [color, setColor] = useState('#ffffff');
  
  // Generated points
  const [points, setPoints] = useState<DronePoint[]>([]);
  
  // Generate the grid of points
  const generateGrid = () => {
    const newPoints: DronePoint[] = [];
    let id = 1;
    
    // Calculate the offset to center the grid
    const offsetX = ((columns - 1) * spacing) / 2;
    const offsetY = ((rows - 1) * spacing) / 2;
    const offsetZ = is3D ? ((layers - 1) * spacing) / 2 : 0;
    
    // Generate the grid
    for (let layer = 0; layer < (is3D ? layers : 1); layer++) {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const x = col * spacing - offsetX;
          const y = height;
          const z = row * spacing - offsetY;
          
          // For 3D grid, adjust the y position by layer
          const position: [number, number, number] = is3D 
            ? [x, layer * spacing - offsetZ, z]
            : [x, y, z];
          
          newPoints.push({
            id: `point-${id++}`,
            position,
            color,
          });
        }
      }
    }
    
    setPoints(newPoints);
  };
  
  // Update the grid when parameters change
  useEffect(() => {
    generateGrid();
  }, [rows, columns, spacing, height, is3D, layers, color]);
  
  // Export grid as JSON
  const exportAsJson = () => {
    const jsonStr = JSON.stringify(
      points.map(p => ({
        position: p.position,
        color: p.color,
      })), 
      null, 
      2
    );
    
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drone_grid.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <Container fluid p="md">
      <Title order={2} mb="md">Grid Generator</Title>
      
      <Grid gutter="md">
        <Grid.Col span={4}>
          <Paper shadow="md" p="md">
            <Stack>
              <Title order={4}>Grid Settings</Title>
              
              <Switch
                label="3D Grid (Cube)"
                checked={is3D}
                onChange={(event) => setIs3D(event.currentTarget.checked)}
              />
              
              <Text size="sm" fw={500}>Dimensions</Text>
              
              <Group>
                <NumberInput
                  label="Rows"
                  value={rows}
                  onChange={(value) => setRows(Number(value))}
                  min={1}
                  max={20}
                  style={{ flex: 1 }}
                />
                
                <NumberInput
                  label="Columns"
                  value={columns}
                  onChange={(value) => setColumns(Number(value))}
                  min={1}
                  max={20}
                  style={{ flex: 1 }}
                />
              </Group>
              
              {is3D && (
                <NumberInput
                  label="Layers"
                  value={layers}
                  onChange={(value) => setLayers(Number(value))}
                  min={1}
                  max={20}
                />
              )}
              
              <Stack spacing={0}>
                <Text size="sm" fw={500}>Spacing</Text>
                <Text size="xs" c="dimmed">Distance between points</Text>
                
                <Group align="center">
                  <Slider
                    min={0.5}
                    max={10}
                    step={0.1}
                    value={spacing}
                    onChange={setSpacing}
                    style={{ flex: 1 }}
                    label={(value) => `${value.toFixed(1)}m`}
                    marks={[
                      { value: 0.5, label: '0.5m' },
                      { value: 5, label: '5m' },
                      { value: 10, label: '10m' },
                    ]}
                  />
                  <Text size="sm" w={50}>{spacing.toFixed(1)}m</Text>
                </Group>
              </Stack>
              
              {!is3D && (
                <Stack spacing={0}>
                  <Text size="sm" fw={500}>Height</Text>
                  <Text size="xs" c="dimmed">Y-position of the grid</Text>
                  
                  <Group align="center">
                    <Slider
                      min={0}
                      max={20}
                      step={0.5}
                      value={height}
                      onChange={setHeight}
                      style={{ flex: 1 }}
                      label={(value) => `${value.toFixed(1)}m`}
                      marks={[
                        { value: 0, label: '0m' },
                        { value: 10, label: '10m' },
                        { value: 20, label: '20m' },
                      ]}
                    />
                    <Text size="sm" w={50}>{height.toFixed(1)}m</Text>
                  </Group>
                </Stack>
              )}
              
              <Stack spacing={5}>
                <Text size="sm" fw={500}>Color</Text>
                <ColorPicker
                  format="hex"
                  value={color}
                  onChange={setColor}
                  swatches={[
                    '#ff5733', '#33ff57', '#3357ff', '#ff33f5', 
                    '#f5ff33', '#33f5ff', '#ffffff', '#ff0000',
                    '#00ff00', '#0000ff', '#ffff00', '#00ffff'
                  ]}
                />
              </Stack>
              
              <Button onClick={exportAsJson} color="blue" mt="md">
                Export as JSON
              </Button>
              
              <Box mt="md">
                <Text size="sm" fw={500}>Grid Info</Text>
                <Text size="sm">Total points: {points.length}</Text>
              </Box>
            </Stack>
          </Paper>
        </Grid.Col>
        
        <Grid.Col span={8}>
          <Paper p={0} shadow="md" style={{ height: 'calc(100vh - 180px)' }}>
            <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} />
              
              {/* Grid helpers */}
              <gridHelper args={[50, 50, '#444444', '#222222']} />
              <axesHelper args={[10]} />
              
              {/* Render points */}
              {points.map((point) => (
                <Sphere key={point.id} args={[0.2]} position={point.position}>
                  <meshStandardMaterial
                    color={point.color}
                    emissive={point.color}
                    emissiveIntensity={0.5}
                  />
                </Sphere>
              ))}
              
              <OrbitControls />
            </Canvas>
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
};

export default GridGenerator; 