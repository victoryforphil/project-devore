import React, { useState } from 'react';
import { 
  Container, 
  Title, 
  Paper, 
  Stack, 
  Group, 
  Switch,
  Text,
  Button,
  NumberInput,
  Divider,
  Select,
} from '@mantine/core';

const Settings: React.FC = () => {
  // Default settings
  const [darkMode, setDarkMode] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [gridSize, setGridSize] = useState(10);
  const [gridDivisions, setGridDivisions] = useState(10);
  const [defaultDroneCount, setDefaultDroneCount] = useState(50);
  const [simulationFrameRate, setSimulationFrameRate] = useState(30);
  const [exportFormat, setExportFormat] = useState('json');

  // Reset to defaults
  const resetToDefaults = () => {
    setDarkMode(true);
    setAutoSave(true);
    setGridSize(10);
    setGridDivisions(10);
    setDefaultDroneCount(50);
    setSimulationFrameRate(30);
    setExportFormat('json');
  };

  return (
    <Container fluid p="md">
      <Title order={2} mb="md">Settings</Title>
      
      <Paper shadow="md" p="lg">
        <Stack>
          <Group position="apart">
            <Title order={3}>Application Settings</Title>
            <Button variant="subtle" onClick={resetToDefaults}>Reset to Defaults</Button>
          </Group>
          
          <Divider />
          
          <Stack>
            <Title order={4}>Interface</Title>
            
            <Group position="apart">
              <Text>Dark Mode</Text>
              <Switch 
                checked={darkMode} 
                onChange={(event) => setDarkMode(event.currentTarget.checked)} 
              />
            </Group>
            
            <Group position="apart">
              <Text>Auto Save</Text>
              <Switch 
                checked={autoSave} 
                onChange={(event) => setAutoSave(event.currentTarget.checked)} 
              />
            </Group>
          </Stack>
          
          <Divider />
          
          <Stack>
            <Title order={4}>3D Viewport</Title>
            
            <Group position="apart" align="flex-end">
              <Text>Grid Size</Text>
              <NumberInput
                value={gridSize}
                onChange={(value) => setGridSize(Number(value))}
                min={1}
                max={100}
                step={1}
                w={100}
              />
            </Group>
            
            <Group position="apart" align="flex-end">
              <Text>Grid Divisions</Text>
              <NumberInput
                value={gridDivisions}
                onChange={(value) => setGridDivisions(Number(value))}
                min={1}
                max={100}
                step={1}
                w={100}
              />
            </Group>
          </Stack>
          
          <Divider />
          
          <Stack>
            <Title order={4}>Drone Show Settings</Title>
            
            <Group position="apart" align="flex-end">
              <Text>Default Drone Count</Text>
              <NumberInput
                value={defaultDroneCount}
                onChange={(value) => setDefaultDroneCount(Number(value))}
                min={1}
                max={1000}
                step={10}
                w={100}
              />
            </Group>
            
            <Group position="apart" align="flex-end">
              <Text>Simulation Frame Rate</Text>
              <NumberInput
                value={simulationFrameRate}
                onChange={(value) => setSimulationFrameRate(Number(value))}
                min={1}
                max={60}
                step={1}
                w={100}
              />
            </Group>
            
            <Group position="apart" align="flex-end">
              <Text>Export Format</Text>
              <Select
                value={exportFormat}
                onChange={(value) => setExportFormat(value || 'json')}
                data={[
                  { value: 'json', label: 'JSON' },
                  { value: 'csv', label: 'CSV' },
                  { value: 'binary', label: 'Binary' },
                ]}
                w={100}
              />
            </Group>
          </Stack>
          
          <Divider />
          
          <Group position="right">
            <Button>Save Settings</Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
};

export default Settings; 