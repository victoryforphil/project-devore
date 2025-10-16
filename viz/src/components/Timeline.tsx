import { Play, Pause, SkipBack, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useState } from "react"

export function Timeline() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const duration = 100 // placeholder

  return (
    <div className="border-b border-border bg-background px-4 py-3 space-y-2">
      {/* Playback Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentTime(Math.max(0, currentTime - 5))}
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentTime(Math.min(duration, currentTime + 5))}
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        {/* Time Display */}
        <div className="text-sm text-muted-foreground ml-2">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Timeline Slider */}
      <div className="px-2">
        <Slider
          value={[currentTime]}
          onValueChange={(value: number[]) => setCurrentTime(value[0])}
          max={duration}
          step={0.1}
          className="w-full"
        />
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}
