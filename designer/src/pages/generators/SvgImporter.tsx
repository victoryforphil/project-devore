import React, { useState, useCallback, useRef } from 'react';
import { 
  Container, 
  Title, 
  Paper, 
  Group, 
  Button, 
  Stack, 
  Text, 
  NumberInput,
  Grid,
  Slider,
  Box,
  ColorPicker,
  Alert,
} from '@mantine/core';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import { Dropzone } from '@mantine/dropzone';
import { IconUpload, IconX, IconCheck, IconInfoCircle } from '@tabler/icons-react';

interface DronePoint {
  id: string;
  position: [number, number, number];
  color: string;
}

const SvgImporter: React.FC = () => {
  // SVG Configuration
  const [svgFile, setSvgFile] = useState<File | null>(null);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(0.1);
  const [height, setHeight] = useState(0);
  const [numPoints, setNumPoints] = useState(100);
  const [color, setColor] = useState('#ffffff');
  
  // Generated points
  const [points, setPoints] = useState<DronePoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Canvas ref for extracting SVG paths
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Handle file drop
  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (file && file.type === 'image/svg+xml') {
      setSvgFile(file);
      setSvgUrl(URL.createObjectURL(file));
      setError(null);
    } else {
      setError('Please upload a valid SVG file.');
      setSvgFile(null);
      setSvgUrl(null);
    }
  }, []);
  
  // Sample points from the SVG
  const generatePoints = useCallback(() => {
    if (!svgUrl) {
      setError('Please upload an SVG file first.');
      return;
    }
    
    // Create SVG image
    const img = new Image();
    img.src = svgUrl;
    
    img.onload = () => {
      if (!canvasRef.current) {
        setError('Canvas reference not available.');
        return;
      }
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        setError('Canvas context not available.');
        return;
      }
      
      // Set canvas size to match SVG
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw SVG to canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Sample points from the canvas
      const newPoints: DronePoint[] = [];
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Determine sampling strategy
      const samplingAttempts = numPoints * 10; // Try more points than we need
      let foundPoints = 0;
      
      for (let i = 0; i < samplingAttempts && foundPoints < numPoints; i++) {
        // Pick a random pixel
        const x = Math.floor(Math.random() * canvas.width);
        const y = Math.floor(Math.random() * canvas.height);
        
        // Check if pixel has content (not transparent)
        const pixelIndex = (y * canvas.width + x) * 4;
        const alpha = data[pixelIndex + 3];
        
        if (alpha > 0) {
          // Calculate 3D position with scaling
          // Center the SVG in the 3D space
          const posX = (x - canvas.width / 2) * scale;
          const posY = height;
          const posZ = (y - canvas.height / 2) * scale;
          
          newPoints.push({
            id: `point-${foundPoints + 1}`,
            position: [posX, posY, posZ],
            color,
          });
          
          foundPoints++;
        }
      }
      
      // Check if we found enough points
      if (newPoints.length < numPoints) {
        setError(`Could only find ${newPoints.length} visible points in the SVG. Try reducing the number of points or upload a different SVG.`);
      } else {
        setError(null);
      }
      
      setPoints(newPoints);
    };
    
    img.onerror = () => {
      setError('Failed to load SVG file.');
    };
  }, [svgUrl, scale, height, numPoints, color]);
  
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
    a.download = 'drone_svg.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <Container fluid p="md">
      <Title order={2} mb="md">SVG Importer</Title>
      
      <Grid gutter="md">
        <Grid.Col span={4}>
          <Paper shadow="md" p="md">
            <Stack>
              <Title order={4}>SVG Import Settings</Title>
              
              <Dropzone
                onDrop={onDrop}
                accept={['image/svg+xml']}
                maxSize={3 * 1024 * 1024}
              >
                <Group position="center" py="xl" style={{ pointerEvents: 'none' }}>
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
                      {svgFile ? svgFile.name : 'Drop SVG file here or click to select'}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center" mt={7}>
                      Attach a SVG file to convert into drone points
                    </Text>
                  </div>
                </Group>
              </Dropzone>
              
              {error && (
                <Alert icon={<IconInfoCircle size={16} />} title="Error" color="red">
                  {error}
                </Alert>
              )}
              
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
                    min={0.01}
                    max={0.5}
                    step={0.01}
                    value={scale}
                    onChange={setScale}
                    style={{ flex: 1 }}
                    label={(value) => `${value.toFixed(2)}`}
                    marks={[
                      { value: 0.01, label: '0.01' },
                      { value: 0.25, label: '0.25' },
                      { value: 0.5, label: '0.5' },
                    ]}
                  />
                  <Text size="sm" w={50}>{scale.toFixed(2)}</Text>
                </Group>
              </Stack>
              
              <NumberInput
                label="Height (Y position)"
                value={height}
                onChange={(value) => setHeight(Number(value))}
                min={0}
                max={20}
                step={0.5}
              />
              
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
                <Button onClick={generatePoints} color="blue" disabled={!svgUrl}>
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
            {/* Canvas for rendering - hidden */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            
            {/* 3D Preview */}
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

export default SvgImporter; 