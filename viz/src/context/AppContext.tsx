import React, { createContext, useContext, useState } from "react"

interface AppContextType {
  selectedDataSource: string
  setSelectedDataSource: (source: string) => void
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  currentTime: number
  setCurrentTime: (time: number) => void
  duration: number
  setDuration: (duration: number) => void
  openedFile: string | null
  setOpenedFile: (file: string | null) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [selectedDataSource, setSelectedDataSource] = useState("overview")
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(100)
  const [openedFile, setOpenedFile] = useState<string | null>(null)

  const value: AppContextType = {
    selectedDataSource,
    setSelectedDataSource,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    openedFile,
    setOpenedFile,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useApp must be used within AppProvider")
  }
  return context
}
