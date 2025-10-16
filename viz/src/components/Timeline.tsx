import { Play, Pause, SkipBack, SkipForward, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { usePlayback } from "@/contexts/PlaybackContext"

export function Timeline() {
  const { isPlaying, setIsPlaying, currentIndex, setCurrentIndex, maxIndex, currentTime, reset } = usePlayback()
  
  const duration = (maxIndex * 0.05) // Convert frames to seconds (20 FPS)

  const handleSkipBack = () => {
    setCurrentIndex(Math.max(0, currentIndex - 100)) // Skip back ~5 seconds
  }

  const handleSkipForward = () => {
    setCurrentIndex(Math.min(maxIndex - 1, currentIndex + 100)) // Skip forward ~5 seconds
  }

  return (
    <div className="border-b border-border bg-background px-4 py-3 space-y-2">
      {/* Playback Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          title="Reset to start"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkipBack}
          disabled={currentIndex === 0}
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={maxIndex === 0}
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
          onClick={handleSkipForward}
          disabled={currentIndex >= maxIndex - 1}
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        {/* Time Display */}
        <div className="text-sm text-muted-foreground ml-2">
          {formatTime(currentTime)} / {formatTime(duration)}
          {maxIndex > 0 && (
            <span className="ml-2 text-xs opacity-70">
              ({currentIndex + 1} / {maxIndex})
            </span>
          )}
        </div>
      </div>

      {/* Timeline Slider */}
      <div className="px-2">
        <Slider
          value={[currentIndex]}
          onValueChange={(value: number[]) => setCurrentIndex(value[0])}
          max={Math.max(1, maxIndex - 1)}
          step={1}
          className="w-full"
          disabled={maxIndex === 0}
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
