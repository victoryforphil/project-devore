import { useEffect, useState, useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Grid, Sphere, Line, Html } from "@react-three/drei"
import { useData } from "@/hooks/useData"
import { useParquetWasm } from "@/contexts/ParquetWasmContext"
import { useFileSystem } from "@/contexts/FileSystemContext"
import { usePlayback } from "@/contexts/PlaybackContext"
import * as THREE from "three"

interface Point3D {
  x: number
  y: number
  z: number
  index: number
}

interface Trajectory3DVisualizerProps {
  points: Point3D[]
  currentIndex: number
}

// Animated sphere that follows the trajectory
function TrajectoryPoint({ point, color = "#00ff00" }: { point: Point3D; color?: string }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame(() => {
    if (meshRef.current) {
      // Gentle pulsing animation
      const scale = 1 + Math.sin(Date.now() * 0.005) * 0.1
      meshRef.current.scale.setScalar(scale)
    }
  })

  return (
    <Sphere ref={meshRef} args={[0.15, 16, 16]} position={[point.x, point.y, point.z]}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
    </Sphere>
  )
}

// Trail line showing the path
function TrajectoryLine({ points }: { points: Point3D[] }) {
  const linePoints = useMemo(() => {
    return points.map((p) => new THREE.Vector3(p.x, p.y, p.z))
  }, [points])

  if (linePoints.length < 2) return null

  return (
    <Line
      points={linePoints}
      color="#00ffff"
      lineWidth={2}
      opacity={0.6}
      transparent
    />
  )
}

function Trajectory3DVisualizer({ points, currentIndex }: Trajectory3DVisualizerProps) {
  if (points.length === 0) {
    return (
      <Html center>
        <div className="text-white text-sm bg-black/80 px-4 py-2 rounded">
          No data to visualize
        </div>
      </Html>
    )
  }

  const currentPoint = points[Math.min(currentIndex, points.length - 1)]
  const visiblePoints = points.slice(0, currentIndex + 1)

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {/* Grid */}
      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6b7280"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#9ca3af"
        fadeDistance={50}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      {/* Trajectory line */}
      <TrajectoryLine points={visiblePoints} />

      {/* Current position marker */}
      <TrajectoryPoint point={currentPoint} color="#00ff00" />

      {/* All points as smaller spheres */}
      {visiblePoints.map((point, idx) => (
        <Sphere
          key={idx}
          args={[0.05, 8, 8]}
          position={[point.x, point.y, point.z]}
        >
          <meshStandardMaterial
            color="#00ffff"
            emissive="#00ffff"
            emissiveIntensity={0.3}
            opacity={0.6}
            transparent
          />
        </Sphere>
      ))}

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={100}
      />
    </>
  )
}

export function Trajectory3DPlot() {
  const { selection } = useData()
  const { readTable } = useParquetWasm()
  const { selectedFiles } = useFileSystem()
  const { currentIndex, setMaxIndex } = usePlayback()
  
  const [points, setPoints] = useState<Point3D[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // X, Y, Z column selections from axis mapping
  const [xColumn, setXColumn] = useState<string | null>(null)
  const [yColumn, setYColumn] = useState<string | null>(null)
  const [zColumn, setZColumn] = useState<string | null>(null)

  // Extract selected columns using axis mapping
  useEffect(() => {
    if (!selection) {
      setXColumn(null)
      setYColumn(null)
      setZColumn(null)
      return
    }

    if (selection.type === 'column') {
      setXColumn(selection.columnName)
      setYColumn(null)
      setZColumn(null)
    } else if (selection.type === 'columns') {
      // Use axis mapping if available
      const mapping = selection.axisMapping
      if (mapping) {
        setXColumn(mapping.x)
        setYColumn(mapping.y)
        setZColumn(mapping.z)
      } else {
        // Fallback to first 3 visible columns
        const cols = selection.columns.filter(c => c.visible)
        setXColumn(cols[0]?.columnName || null)
        setYColumn(cols[1]?.columnName || null)
        setZColumn(cols[2]?.columnName || null)
      }
    }
  }, [selection])

  // Load data when columns are selected
  useEffect(() => {
    if (!xColumn) {
      setPoints([])
      setError(null)
      return
    }

    const loadTrajectoryData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Determine file path from selection
        let filePath: string | null = null
        if (selection?.type === 'column') {
          filePath = selection.filePath
        } else if (selection?.type === 'columns' && selection.columns.length > 0) {
          filePath = selection.columns[0].filePath
        }

        if (!filePath) {
          throw new Error('No file selected')
        }

        // Find the file
        const fileItem = selectedFiles.find((f) => f.path === filePath)
        if (!fileItem) {
          throw new Error(`File not found: ${filePath}`)
        }

        // Read file
        const fileHandle = fileItem.handle as FileSystemFileHandle
        const fileObj = await fileHandle.getFile()
        const arrayBuffer = await fileObj.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        const table = await readTable(uint8Array)

        // Get columns
        const xCol = table.getChild(xColumn)
        const yCol = yColumn ? table.getChild(yColumn) : null
        const zCol = zColumn ? table.getChild(zColumn) : null

        if (!xCol) {
          throw new Error(`Column not found: ${xColumn}`)
        }

        // Get scale from axis mapping
        const scale = selection?.type === 'columns' && selection.axisMapping?.scale 
          ? selection.axisMapping.scale 
          : 1

        // Build points array with scaling
        const newPoints: Point3D[] = []
        const length = xCol.length
        
        for (let i = 0; i < length; i++) {
          const x = (typeof xCol.get(i) === 'number' ? xCol.get(i) : 0) * scale
          const y = (yCol && typeof yCol.get(i) === 'number' ? yCol.get(i) : 0) * scale
          const z = (zCol && typeof zCol.get(i) === 'number' ? zCol.get(i) : 0) * scale
          
          newPoints.push({ x, y, z, index: i })
        }

        console.log('[Trajectory3DPlot] Loaded', newPoints.length, 'points (scale:', scale, ')')
        setPoints(newPoints)
        setMaxIndex(newPoints.length) // Update global playback state
      } catch (err: any) {
        console.error('[Trajectory3DPlot] Failed to load data:', err)
        setError(err.message || 'Failed to load trajectory data')
      } finally {
        setIsLoading(false)
      }
    }

    loadTrajectoryData()
  }, [xColumn, yColumn, zColumn, selection, selectedFiles, readTable, setMaxIndex])

  // Update max index when points change
  useEffect(() => {
    setMaxIndex(points.length)
  }, [points.length, setMaxIndex])

  return (
    <div className="flex h-full w-full flex-col gap-3 rounded-xl border border-white/10 bg-black/40 p-4 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">3D Trajectory</h3>
          <p className="text-xs text-white/60">
            {xColumn && `X: ${xColumn}`}
            {yColumn && ` | Y: ${yColumn}`}
            {zColumn && ` | Z: ${zColumn}`}
            {selection?.type === 'columns' && selection.axisMapping && selection.axisMapping.scale !== 1 && 
              ` | Scale: ${selection.axisMapping.scale.toFixed(1)}x`
            }
            {!xColumn && 'Select columns to visualize'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-xs font-medium text-white/70 ring-1 ring-white/10">
          {isLoading ? (
            <>
              <span className="h-1.5 w-1.5 animate-spin rounded-full border border-white/50 border-t-primary"></span>
              Loading
            </>
          ) : points.length > 0 ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
              {points.length} points
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-500"></span>
              No Data
            </>
          )}
        </div>
      </div>

      {/* Canvas */}
      {error ? (
        <div className="flex flex-1 items-center justify-center rounded-lg bg-black/20 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : (
        <div className="flex-1 rounded-lg bg-black/20 overflow-hidden">
          <Canvas
            camera={{ position: [10, 10, 10], fov: 50 }}
            style={{ width: '100%', height: '100%' }}
          >
            <Trajectory3DVisualizer points={points} currentIndex={currentIndex} />
          </Canvas>
        </div>
      )}
    </div>
  )
}
