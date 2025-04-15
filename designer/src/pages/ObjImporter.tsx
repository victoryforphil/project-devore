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

// ... rest of the file with these fixes:
// 1. Change 'let boundingBox' to 'const boundingBox'
// 2. Change 'let center' to 'const center' 