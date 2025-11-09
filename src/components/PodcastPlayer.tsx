import { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface PodcastPlayerProps {
  segments: Array<{
    speaker: 'AURA' | 'NEO';
    text: string;
    audio: string | null;
    status: 'success' | 'failed';
  }>;
}

export const PodcastPlayer = ({ segments }: PodcastPlayerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(100);
  const audioRef = useRef<HTMLAudioElement>(null);

  const validSegments = segments.filter(s => s.status === 'success' && s.audio);
  const currentSegment = validSegments[currentIndex];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current && currentSegment?.audio) {
      audioRef.current.src = `data:audio/mpeg;base64,${currentSegment.audio}`;
      if (isPlaying) {
        audioRef.current.play();
      }
    }
  }, [currentIndex, currentSegment?.audio]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleNext = () => {
    if (currentIndex < validSegments.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const percent = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(percent || 0);
    }
  };

  const handleEnded = () => {
    if (currentIndex < validSegments.length - 1) {
      handleNext();
    } else {
      setIsPlaying(false);
      setProgress(0);
    }
  };

  const handleProgressChange = (value: number[]) => {
    if (audioRef.current) {
      const time = (value[0] / 100) * audioRef.current.duration;
      audioRef.current.currentTime = time;
      setProgress(value[0]);
    }
  };

  if (!currentSegment) return null;

  return (
    <div className="bg-gradient-to-br from-card via-card/95 to-muted/30 rounded-2xl p-6 border border-border/50 shadow-lg">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Now Playing */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <div className={`h-16 w-16 rounded-2xl ${currentSegment.speaker === 'AURA' ? 'bg-primary' : 'bg-secondary'} flex items-center justify-center text-3xl shadow-lg animate-pulse-subtle`}>
            {currentSegment.speaker === 'AURA' ? '🎙️' : '🤖'}
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Now Playing</p>
            <h3 className="font-semibold text-lg">{currentSegment.speaker}</h3>
            <p className="text-sm text-muted-foreground">
              Segment {currentIndex + 1} of {validSegments.length}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-3">
          {currentSegment.text}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <Slider
          value={[progress]}
          onValueChange={handleProgressChange}
          max={100}
          step={0.1}
          className="cursor-pointer"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="h-10 w-10"
        >
          <SkipBack className="h-5 w-5" />
        </Button>

        <Button
          size="icon"
          onClick={togglePlay}
          className="h-14 w-14 rounded-full bg-gradient-primary shadow-lg hover:shadow-xl transition-all"
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6 ml-0.5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          disabled={currentIndex === validSegments.length - 1}
          className="h-10 w-10"
        >
          <SkipForward className="h-5 w-5" />
        </Button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3">
        <Volume2 className="h-4 w-4 text-muted-foreground" />
        <Slider
          value={[volume]}
          onValueChange={(v) => setVolume(v[0])}
          max={100}
          step={1}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-10 text-right">{volume}%</span>
      </div>
    </div>
  );
};
