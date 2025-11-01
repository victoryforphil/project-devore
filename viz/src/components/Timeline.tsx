import { Play, Pause, SkipBack, SkipForward, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { usePlayback } from "@/contexts/PlaybackContext"
import { formatTime } from "@/lib/formatters"

const SKIP_FRAMES = 100 // ~5 seconds at 20 FPS

export function Timeline() {
  const { isPlaying, setIsPlaying, currentIndex, setCurrentIndex, maxIndex, currentTime, reset } = usePlayback()
  
  const duration = maxIndex * 0.05 // Convert frames to seconds (20 FPS)

  const handleSkipBack = () => {
    setCurrentIndex(Math.max(0, currentIndex - SKIP_FRAMES))
  }

  const handleSkipForward = () => {
    setCurrentIndex(Math.min(maxIndex - 1, currentIndex + SKIP_FRAMES))
  }

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          title="Reset to start"
          className="h-8 w-8 p-0"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkipBack}
          disabled={currentIndex === 0}
          className="h-8 w-8 p-0"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={maxIndex === 0}
          className="h-8 w-8 p-0"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkipForward}
          disabled={currentIndex >= maxIndex - 1}
          className="h-8 w-8 p-0"
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        <div className="text-sm text-muted-foreground ml-3 font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
          {maxIndex > 0 && (
            <span className="ml-2 text-xs opacity-70">
              Frame {currentIndex + 1} of {maxIndex}
            </span>
          )}
        </div>
      </div>

      <Slider
        value={[currentIndex]}
        onValueChange={(value: number[]) => setCurrentIndex(value[0])}
        max={Math.max(1, maxIndex - 1)}
        step={1}
        className="w-full"
        disabled={maxIndex === 0}
      />
    </div>
  )
}
