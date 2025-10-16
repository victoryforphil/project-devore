/// <reference types="@react-three/fiber" />

import { extend } from '@react-three/fiber'
import * as THREE from 'three'

// Extend ThreeJS elements for JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any
      mesh: any
      ambientLight: any
      pointLight: any
      axesHelper: any
      meshStandardMaterial: any
    }
  }
}
