import { createContext, useContext, useState, useEffect } from "react"
import type { ReactNode } from "react"

interface PlaybackContextType {
  isPlaying: boolean
  currentIndex: number
  maxIndex: number
  currentTime: number
  setIsPlaying: (playing: boolean) => void
  setCurrentIndex: (index: number) => void
  setMaxIndex: (max: number) => void
  reset: () => void
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined)

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [maxIndex, setMaxIndex] = useState(100)

  // Auto-play when enabled
  useEffect(() => {
    if (!isPlaying || maxIndex === 0) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= maxIndex - 1) {
          setIsPlaying(false) // Stop at end
          return maxIndex - 1
        }
        return prev + 1
      })
    }, 50) // 20 FPS

    return () => clearInterval(interval)
  }, [isPlaying, maxIndex])

  const reset = () => {
    setCurrentIndex(0)
    setIsPlaying(false)
  }

  // Calculate current time (assuming ~20 FPS or 50ms per frame)
  const currentTime = (currentIndex * 0.05)

  return (
    <PlaybackContext.Provider
      value={{
        isPlaying,
        currentIndex,
        maxIndex,
        currentTime,
        setIsPlaying,
        setCurrentIndex,
        setMaxIndex,
        reset,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  )
}

export function usePlayback() {
  const context = useContext(PlaybackContext)
  if (context === undefined) {
    throw new Error("usePlayback must be used within a PlaybackProvider")
  }
  return context
}
