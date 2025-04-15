import React, { useState, useRef } from 'react';
import { 
  Container, 
  Title, 
  Paper, 
  Group, 
  ActionIcon, 
  Text, 
  Stack, 
  Slider,
  NumberInput,
  Box,
  Grid,
  Select,
} from '@mantine/core';
import { 
  IconPlayerPlay, 
  IconPlayerPause, 
  IconPlayerStop,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';

// Define keyframe and animation types
interface Keyframe {
  id: string;
  time: number;
  droneId: string;
  position: [number, number, number];
  color: string;
}

interface Animation {
  id: string;
  name: string;
  duration: number;
  keyframes: Keyframe[];
}

const Timeline: React.FC = () => {
  // Mock data for drones
  const drones = [
    { id: '1', name: 'Drone 1' },
    { id: '2', name: 'Drone 2' },
    { id: '3', name: 'Drone 3' },
  ];
  
  // State for timeline
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [animations, setAnimations] = useState<Animation[]>([
    {
      id: '1',
      name: 'Main Animation',
      duration: 30,
      keyframes: [
        { id: 'k1', time: 0, droneId: '1', position: [0, 0, 0], color: '#ff5733' },
        { id: 'k2', time: 10, droneId: '1', position: [5, 5, 0], color: '#ff5733' },
        { id: 'k3', time: 20, droneId: '1', position: [0, 10, 0], color: '#ff5733' },
        { id: 'k4', time: 30, droneId: '1', position: [0, 0, 0], color: '#ff5733' },
        
        { id: 'k5', time: 0, droneId: '2', position: [2, 0, 0], color: '#33ff57' },
        { id: 'k6', time: 15, droneId: '2', position: [2, 8, 0], color: '#33ff57' },
        { id: 'k7', time: 30, droneId: '2', position: [2, 0, 0], color: '#33ff57' },
      ]
    }
  ]);
  
  const [selectedAnimation, setSelectedAnimation] = useState(animations[0]?.id);
  const [selectedKeyframe, setSelectedKeyframe] = useState<string | null>(null);
  
  // Timer reference for animation playback
  const animationTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Get the current animation
  const getCurrentAnimation = () => animations.find(a => a.id === selectedAnimation);
  
  // Get a keyframe by id
  const getKeyframe = (id: string) => {
    const animation = getCurrentAnimation();
    return animation?.keyframes.find(k => k.id === id);
  };
  
  // Play/pause the animation
  const togglePlay = () => {
    if (playing) {
      if (animationTimer.current) {
        clearInterval(animationTimer.current);
        animationTimer.current = null;
      }
      setPlaying(false);
    } else {
      // Start from current time and loop when reaching the end
      const animation = getCurrentAnimation();
      if (!animation) return;
      
      animationTimer.current = setInterval(() => {
        setCurrentTime(prevTime => {
          const newTime = prevTime + 0.1;
          if (newTime > animation.duration) {
            return 0; // Loop back to start
          }
          return newTime;
        });
      }, 100);
      
      setPlaying(true);
    }
  };
  
  // Stop the animation
  const stopAnimation = () => {
    if (animationTimer.current) {
      clearInterval(animationTimer.current);
      animationTimer.current = null;
    }
    setPlaying(false);
    setCurrentTime(0);
  };
  
  // Add a new keyframe
  const addKeyframe = (droneId: string) => {
    const animation = getCurrentAnimation();
    if (!animation) return;
    
    const newKeyframe: Keyframe = {
      id: `k${Date.now()}`,
      time: currentTime,
      droneId,
      position: [0, 0, 0],
      color: '#ffffff',
    };
    
    const updatedAnimations = animations.map(anim => {
      if (anim.id === selectedAnimation) {
        return {
          ...anim,
          keyframes: [...anim.keyframes, newKeyframe],
        };
      }
      return anim;
    });
    
    setAnimations(updatedAnimations);
    setSelectedKeyframe(newKeyframe.id);
  };
  
  // Delete a keyframe
  const deleteKeyframe = (keyframeId: string) => {
    const updatedAnimations = animations.map(anim => {
      if (anim.id === selectedAnimation) {
        return {
          ...anim,
          keyframes: anim.keyframes.filter(k => k.id !== keyframeId),
        };
      }
      return anim;
    });
    
    setAnimations(updatedAnimations);
    setSelectedKeyframe(null);
  };
  
  // Update keyframe time
  const updateKeyframeTime = (keyframeId: string, time: number) => {
    const updatedAnimations = animations.map(anim => {
      if (anim.id === selectedAnimation) {
        return {
          ...anim,
          keyframes: anim.keyframes.map(k => {
            if (k.id === keyframeId) {
              return { ...k, time };
            }
            return k;
          }),
        };
      }
      return anim;
    });
    
    setAnimations(updatedAnimations);
  };
  
  // Update keyframe position
  const updateKeyframePosition = (keyframeId: string, axis: 'x' | 'y' | 'z', value: number) => {
    const updatedAnimations = animations.map(anim => {
      if (anim.id === selectedAnimation) {
        return {
          ...anim,
          keyframes: anim.keyframes.map(k => {
            if (k.id === keyframeId) {
              const position = [...k.position] as [number, number, number];
              const index = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
              position[index] = value;
              return { ...k, position };
            }
            return k;
          }),
        };
      }
      return anim;
    });
    
    setAnimations(updatedAnimations);
  };
  
  // Render keyframe markers on the timeline
  const renderKeyframeMarkers = () => {
    const animation = getCurrentAnimation();
    if (!animation) return null;
    
    // Group keyframes by drone for better visualization
    const keyframesByDrone: Record<string, Keyframe[]> = {};
    
    animation.keyframes.forEach(keyframe => {
      if (!keyframesByDrone[keyframe.droneId]) {
        keyframesByDrone[keyframe.droneId] = [];
      }
      keyframesByDrone[keyframe.droneId].push(keyframe);
    });
    
    return (
      <Box mt="md">
        {Object.entries(keyframesByDrone).map(([droneId, keyframes]) => {
          const drone = drones.find(d => d.id === droneId);
          
          return (
            <Box key={droneId} mb="sm">
              <Group mb={5} position="apart">
                <Text size="sm">{drone?.name || `Drone ${droneId}`}</Text>
                <ActionIcon 
                  size="sm" 
                  color="blue" 
                  onClick={() => addKeyframe(droneId)}
                >
                  <IconPlus size={16} />
                </ActionIcon>
              </Group>
              
              <Paper p={8} withBorder style={{ position: 'relative', height: 30 }}>
                {keyframes.map(keyframe => {
                  const position = (keyframe.time / animation.duration) * 100;
                  
                  return (
                    <div
                      key={keyframe.id}
                      style={{
                        position: 'absolute',
                        left: `${position}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: keyframe.color,
                        border: selectedKeyframe === keyframe.id ? '2px solid white' : '1px solid white',
                        cursor: 'pointer',
                        zIndex: 10
                      }}
                      onClick={() => setSelectedKeyframe(keyframe.id)}
                    />
                  );
                })}
                
                {/* Timeline markers */}
                {Array.from({ length: 11 }).map((_, i) => {
                  const position = (i / 10) * 100;
                  return (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        left: `${position}%`,
                        top: 0,
                        bottom: 0,
                        width: 1,
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                      }}
                    />
                  );
                })}
                
                {/* Current time marker */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${(currentTime / animation.duration) * 100}%`,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    backgroundColor: 'red',
                    zIndex: 5
                  }}
                />
              </Paper>
            </Box>
          );
        })}
      </Box>
    );
  };
  
  return (
    <Container fluid p="md">
      <Title order={2} mb="md">Timeline Editor</Title>
      
      <Paper p="md" shadow="md">
        <Stack spacing="md">
          {/* Animation controls */}
          <Group position="apart">
            <Group>
              <ActionIcon 
                size="lg" 
                color={playing ? "red" : "blue"} 
                onClick={togglePlay}
              >
                {playing ? <IconPlayerPause size={24} /> : <IconPlayerPlay size={24} />}
              </ActionIcon>
              <ActionIcon size="lg" onClick={stopAnimation}>
                <IconPlayerStop size={24} />
              </ActionIcon>
            </Group>
            
            <Text>
              {currentTime.toFixed(1)}s / {getCurrentAnimation()?.duration || 0}s
            </Text>
          </Group>
          
          {/* Timeline scrubber */}
          <Slider
            value={currentTime}
            onChange={setCurrentTime}
            min={0}
            max={getCurrentAnimation()?.duration || 30}
            step={0.1}
            label={(value) => `${value.toFixed(1)}s`}
            marks={[
              { value: 0, label: '0s' },
              { value: getCurrentAnimation()?.duration || 30, label: `${getCurrentAnimation()?.duration || 30}s` },
            ]}
          />
          
          {/* Keyframe timeline */}
          {renderKeyframeMarkers()}
          
          {/* Keyframe editor */}
          {selectedKeyframe && getKeyframe(selectedKeyframe) && (
            <Paper withBorder p="md" mt="md">
              <Group position="apart" mb="md">
                <Title order={4}>Edit Keyframe</Title>
                <ActionIcon 
                  color="red" 
                  onClick={() => deleteKeyframe(selectedKeyframe)}
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Group>
              
              <Grid>
                <Grid.Col span={6}>
                  <NumberInput
                    label="Time (seconds)"
                    value={getKeyframe(selectedKeyframe)?.time || 0}
                    onChange={(value) => updateKeyframeTime(selectedKeyframe, Number(value))}
                    min={0}
                    max={getCurrentAnimation()?.duration || 30}
                    step={0.1}
                    precision={1}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Select
                    label="Drone"
                    data={drones.map(drone => ({ value: drone.id, label: drone.name }))}
                    value={getKeyframe(selectedKeyframe)?.droneId}
                    disabled
                  />
                </Grid.Col>
                
                <Grid.Col span={12}>
                  <Text size="sm" weight={500} mb={5}>Position</Text>
                </Grid.Col>
                
                <Grid.Col span={4}>
                  <NumberInput
                    label="X"
                    value={getKeyframe(selectedKeyframe)?.position[0] || 0}
                    onChange={(value) => updateKeyframePosition(selectedKeyframe, 'x', Number(value))}
                    min={-10}
                    max={10}
                    step={0.1}
                    precision={1}
                  />
                </Grid.Col>
                <Grid.Col span={4}>
                  <NumberInput
                    label="Y"
                    value={getKeyframe(selectedKeyframe)?.position[1] || 0}
                    onChange={(value) => updateKeyframePosition(selectedKeyframe, 'y', Number(value))}
                    min={-10}
                    max={10}
                    step={0.1}
                    precision={1}
                  />
                </Grid.Col>
                <Grid.Col span={4}>
                  <NumberInput
                    label="Z"
                    value={getKeyframe(selectedKeyframe)?.position[2] || 0}
                    onChange={(value) => updateKeyframePosition(selectedKeyframe, 'z', Number(value))}
                    min={-10}
                    max={10}
                    step={0.1}
                    precision={1}
                  />
                </Grid.Col>
              </Grid>
            </Paper>
          )}
        </Stack>
      </Paper>
    </Container>
  );
};

export default Timeline; 