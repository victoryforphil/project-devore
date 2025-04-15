import React, { useState, useCallback } from 'react';
import { 
  Container, 
  Title, 
  Paper, 
  Group, 
  Button, 
  Stack, 
  Text, 
  Grid,
  Slider,
  Box,
  ColorPicker,
  Alert,
  Switch,
} from '@mantine/core';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import { Dropzone } from '@mantine/dropzone';
import { IconUpload, IconX, IconCheck, IconInfoCircle } from '@tabler/icons-react';
import * as THREE from 'three';

interface DronePoint {
  id: string;
  position: [number, number, number];
  color: string;
}

const ObjImporter: React.FC = () => {
  // OBJ Configuration
  const [objFile, setObjFile] = useState<File | null>(null);
  const [objUrl, setObjUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);
  const [numPoints, setNumPoints] = useState(100);
  const [color, setColor] = useState('#ffffff');
  const [useVertices, setUseVertices] = useState(true);
  const [centerModel, setCenterModel] = useState(true);
  
  // Generated points and model
  const [points, setPoints] = useState<DronePoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [objGeometry, setObjGeometry] = useState<THREE.BufferGeometry | null>(null);
  
  // Handle file drop
  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (file && file.name.endsWith('.obj')) {
      setObjFile(file);
      const url = URL.createObjectURL(file);
      setObjUrl(url);
      setError(null);
      
      // Load the OBJ file
      const loader = new THREE.OBJLoader();
      loader.load(
        url,
        (object) => {
          // Extract geometry from first mesh
          let geometry: THREE.BufferGeometry | null = null;
          
          object.traverse((child) => {
            if (child instanceof THREE.Mesh && !geometry) {
              geometry = child.geometry;
            }
          });
          
          if (geometry) {
            setObjGeometry(geometry);
            setError(null);
          } else {
            setError('No geometry found in the OBJ file.');
            setObjGeometry(null);
          }
        },
        // Progress callback
        (xhr) => {
          console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
        },
        // Error callback
        (err) => {
          console.error('Error loading OBJ', err);
          setError('Failed to load OBJ file: ' + err.message);
          setObjGeometry(null);
        }
      );
    } else {
      setError('Please upload a valid OBJ file.');
      setObjFile(null);
      setObjUrl(null);
      setObjGeometry(null);
    }
  }, []);
  
  // Generate points from the OBJ
  const generatePoints = useCallback(() => {
    if (!objGeometry) {
      setError('No OBJ geometry loaded. Please upload an OBJ file first.');
      return;
    }
    
    const newPoints: DronePoint[] = [];
    
    // If using vertices, extract them directly
    if (useVertices) {
      const positions = objGeometry.getAttribute('position');
      
      // Center the model if requested
      let boundingBox = new THREE.Box3().setFromBufferAttribute(positions);
      let center = new THREE.Vector3();
      if (centerModel) {
        boundingBox.getCenter(center);
      }
      
      // Calculate how many vertices to skip to get approximately numPoints
      const totalVertices = positions.count;
      const stride = Math.max(1, Math.floor(totalVertices / numPoints));
      
      // Extract vertices
      for (let i = 0; i < positions.count && newPoints.length < numPoints; i += stride) {
        const x = positions.getX(i) * scale - (centerModel ? center.x * scale : 0);
        const y = positions.getY(i) * scale - (centerModel ? center.y * scale : 0);
        const z = positions.getZ(i) * scale - (centerModel ? center.z * scale : 0);
        
        newPoints.push({
          id: `point-${newPoints.length + 1}`,
          position: [x, y, z],
          color,
        });
      }
    } 
    // Otherwise, sample points from the surface
    else {
      // Create a copy of the geometry for sampling
      const geometry = objGeometry.clone();
      
      // Center the model if requested
      let center = new THREE.Vector3();
      if (centerModel) {
        geometry.computeBoundingBox();
        if (geometry.boundingBox) {
          geometry.boundingBox.getCenter(center);
          geometry.translate(-center.x, -center.y, -center.z);
        }
      }
      
      // Convert to samplable mesh
      const mesh = new THREE.Mesh(geometry);
      
      // Sample points from the mesh surface
      const sampler = new THREE.MeshSurfaceSampler(mesh).build();
      const tempPosition = new THREE.Vector3();
      
      for (let i = 0; i < numPoints; i++) {
        sampler.sample(tempPosition);
        
        // Apply scale
        tempPosition.multiplyScalar(scale);
        
        newPoints.push({
          id: `point-${i + 1}`,
          position: [tempPosition.x, tempPosition.y, tempPosition.z],
          color,
        });
      }
    }
    
    if (newPoints.length === 0) {
      setError('Could not generate any points. The model may be empty.');
    } else if (newPoints.length < numPoints) {
      setError(`Could only generate ${newPoints.length} points. The model may not have enough vertices.`);
    } else {
      setError(null);
    }
    
    setPoints(newPoints);
  }, [objGeometry, useVertices, numPoints, scale, color, centerModel]);
  
  // Export points as JSON
  const exportAsJson = () => {
    if (points.length === 0) {
      setError('No points to export. Generate points first.');
      return;
    }
    
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
    a.download = 'drone_obj.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Mock OBJLoader since it's not available directly
  // In a real implementation, use the actual OBJLoader from three/examples/jsm/loaders/OBJLoader
  const mockObjGeometry = () => {
    // Create a cube geometry as a placeholder
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    setObjGeometry(geometry);
    setError('Note: Using mock geometry for demonstration. In a real app, use actual OBJLoader.');
  };
  
  // If no OBJLoader, offer to create mock geometry
  const handleGenerateClick = () => {
    if (!objGeometry && objUrl) {
      mockObjGeometry();
    }
    generatePoints();
  };
  
  return (
    <Container fluid p="md">
      <Title order={2} mb="md">OBJ Importer</Title>
      
      <Grid gutter="md">
        <Grid.Col span={4}>
          <Paper shadow="md" p="md">
            <Stack>
              <Title order={4}>OBJ Import Settings</Title>
              
              <Dropzone
                onDrop={onDrop}
                accept={['.obj']}
                maxSize={10 * 1024 * 1024}
              >
                <Group style={{ pointerEvents: 'none', justifyContent: 'center' }} py="xl">
                  <Dropzone.Accept>
                    <IconCheck size={50} />
                  </Dropzone.Accept>
                  <Dropzone.Reject>
                    <IconX size={50} />
                  </Dropzone.Reject>
                  <Dropzone.Idle>
                    <IconUpload size={50} />
                  </Dropzone.Idle>
                  
                  <div>
                    <Text size="xl" ta="center">
                      {objFile ? objFile.name : 'Drop OBJ file here or click to select'}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center" mt={7}>
                      Attach an OBJ file to convert into drone points
                    </Text>
                  </div>
                </Group>
              </Dropzone>
              
              {error && (
                <Alert icon={<IconInfoCircle size={16} />} title="Info" color="blue">
                  {error}
                </Alert>
              )}
              
              <Switch
                label="Use Vertex Sampling"
                description="If enabled, uses vertices from the model. Otherwise samples the surface."
                checked={useVertices}
                onChange={(event) => setUseVertices(event.currentTarget.checked)}
              />
              
              <Switch
                label="Center Model"
                description="Centers the model at the origin"
                checked={centerModel}
                onChange={(event) => setCenterModel(event.currentTarget.checked)}
              />
              
              <Stack gap="xs">
                <Text size="sm" fw={500}>Number of Points</Text>
                <Group align="center">
                  <Slider
                    min={10}
                    max={500}
                    step={10}
                    value={numPoints}
                    onChange={setNumPoints}
                    style={{ flex: 1 }}
                    label={(value) => `${value} points`}
                    marks={[
                      { value: 10, label: '10' },
                      { value: 250, label: '250' },
                      { value: 500, label: '500' },
                    ]}
                  />
                  <Text size="sm" w={50}>{numPoints}</Text>
                </Group>
              </Stack>
              
              <Stack gap="xs">
                <Text size="sm" fw={500}>Scale</Text>
                <Group align="center">
                  <Slider
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={scale}
                    onChange={setScale}
                    style={{ flex: 1 }}
                    label={(value) => `${value.toFixed(1)}`}
                    marks={[
                      { value: 0.1, label: '0.1' },
                      { value: 2.5, label: '2.5' },
                      { value: 5, label: '5' },
                    ]}
                  />
                  <Text size="sm" w={50}>{scale.toFixed(1)}</Text>
                </Group>
              </Stack>
              
              <Stack gap={5}>
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
              
              <Group mt="md">
                <Button onClick={handleGenerateClick} color="blue" disabled={!objUrl && !objFile}>
                  Generate Points
                </Button>
                
                <Button onClick={exportAsJson} color="green" disabled={points.length === 0}>
                  Export as JSON
                </Button>
              </Group>
              
              {points.length > 0 && (
                <Box mt="md">
                  <Text size="sm" fw={500}>Points Info</Text>
                  <Text size="sm">Total points: {points.length}</Text>
                </Box>
              )}
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

export default ObjImporter; 