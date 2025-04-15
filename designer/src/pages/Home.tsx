import React from 'react';
import { 
  Container, 
  Title, 
  Text, 
  Button, 
  Group, 
  Stack,
  Card,
  SimpleGrid,
  Center,
  Box,
  ThemeIcon,
  rem,
  Paper,
} from '@mantine/core';
import { 
  IconCubeSend,
  IconTimeline,
  IconGridDots,
  IconFileVector,
  IconCube,
  IconSettings,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

// Custom styles
const useStyles = () => ({
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',

    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
  },

  neonButton: {
    background: 'rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 0 20px rgba(0, 149, 255, 0.2)',
    transition: 'all 0.2s ease',

    '&:hover': {
      boxShadow: '0 0 30px rgba(0, 149, 255, 0.4)',
      border: '1px solid rgba(0, 149, 255, 0.4)',
      transform: 'translateY(-1px)',
    },
  },

  neonText: {
    textShadow: '0 0 10px rgba(0, 149, 255, 0.5)',
  },

  heroSection: {
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'radial-gradient(circle at top right, rgba(0, 149, 255, 0.1) 0%, transparent 60%)',
      pointerEvents: 'none',
    },
  },

  featureIcon: {
    boxShadow: '0 0 20px rgba(0, 149, 255, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(0, 0, 0, 0.2)',
  },

  gradientBorder: {
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: -1,
      left: -1,
      right: -1,
      bottom: -1,
      background: 'linear-gradient(45deg, rgba(0, 149, 255, 0.5), rgba(0, 247, 255, 0.5))',
      borderRadius: '8px',
      zIndex: -1,
      opacity: 0,
      transition: 'opacity 0.2s ease',
    },
    '&:hover::before': {
      opacity: 1,
    },
  },
});

const features = [
  {
    icon: IconCubeSend,
    title: '3D Designer',
    description: 'Design and visualize your drone light shows in a 3D environment',
    link: '/designer',
  },
  {
    icon: IconTimeline,
    title: 'Keyframe Animation',
    description: 'Create complex animations with timeline and keyframe editor',
    link: '/timeline',
  },
  {
    icon: IconGridDots,
    title: 'Grid Generator',
    description: 'Generate grid-based formations for your drone shows',
    link: '/generators/grid',
  },
  {
    icon: IconFileVector,
    title: 'SVG Import',
    description: 'Create shapes from SVG files for stunning light displays',
    link: '/generators/svg',
  },
  {
    icon: IconCube,
    title: 'OBJ Import',
    description: 'Import 3D models and convert them to drone formations',
    link: '/generators/obj',
  },
  {
    icon: IconSettings,
    title: 'Settings',
    description: 'Configure application parameters and preferences',
    link: '/settings',
  },
];

export function Home() {
  const styles = useStyles();
  const navigate = useNavigate();

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Paper 
          style={styles.glassCard}
          p="xl" 
          radius="md"
        >
          <Stack gap="xs">
            <Title style={styles.neonText}>Drone Light Show Designer</Title>
            <Text c="gray.2">Create spectacular drone shows with our powerful design tools</Text>
          </Stack>
        </Paper>

        <Card style={styles.glassCard} shadow="sm" p="xl">
          <Center>
            <Stack align="center" gap="lg" maw={600}>
              <Title order={2} style={styles.neonText} ta="center">
                Powerful Tools for Drone Show Creation
              </Title>
              <Text c="dimmed" ta="center">
                Design, animate, and export drone light shows with our intuitive tools.
                Create stunning aerial displays using 3D models, SVG files, or grid patterns.
              </Text>
              <Button 
                style={styles.neonButton}
                size="lg"
                onClick={() => navigate('/designer')}
              >
                Start Designing
              </Button>
            </Stack>
          </Center>
        </Card>

        <Box py={rem(40)}>
          <Stack gap={50}>
            <Stack gap="xs" align="center">
              <Title order={2} style={styles.neonText}>Features</Title>
              <Text c="dimmed" ta="center" maw={600}>
                Explore our comprehensive suite of drone light show design tools
              </Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={30}>
              {features.map((feature) => (
                <Paper 
                  key={feature.title} 
                  style={{...styles.glassCard, ...styles.gradientBorder}}
                  p="md" 
                  radius="md"
                  onClick={() => navigate(feature.link)}
                  sx={{ cursor: 'pointer' }}
                >
                  <Group>
                    <ThemeIcon
                      size={44}
                      radius="md"
                      style={styles.featureIcon}
                    >
                      <feature.icon size={rem(26)} stroke={1.5} />
                    </ThemeIcon>
                    <Box>
                      <Text fw={500} size="lg" mb={7}>
                        {feature.title}
                      </Text>
                      <Text c="dimmed" size="sm">
                        {feature.description}
                      </Text>
                    </Box>
                  </Group>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}