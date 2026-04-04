import { Heart, Share2, Copy, Play, Pause, ChevronRight, ListFilter, Bookmark, Music, VolumeX, MessageCircle } from 'lucide-react';
import { cn } from '../utils/cn';

interface ControlsProps {
  isAutoPlaying: boolean;
  isFavorite: boolean;
  hasAudio?: boolean;
  isAudioPlaying?: boolean;
  onToggleAutoPlay: () => void;
  onToggleFavorite: () => void;
  onToggleAudio?: () => void;
  onNext: () => void;
  onShare: () => void;
  onCopy: () => void;
  onOpenFilters: () => void;
  onOpenFavorites: () => void;
  onOpenComments?: () => void;
}

export function Controls({
  isAutoPlaying,
  isFavorite,
  hasAudio,
  isAudioPlaying,
  onToggleAutoPlay,
  onToggleFavorite,
  onToggleAudio,
  onNext,
  onShare,
  onCopy,
  onOpenFilters,
  onOpenFavorites,
  onOpenComments
}: ControlsProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 p-6 z-30 flex flex-col items-center gap-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent pb-8">
      
      {/* Main Action Button */}
      <button 
        onClick={onNext}
        className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-95"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Secondary Actions */}
      <div className="flex items-center gap-4 sm:gap-6 text-white/70 flex-wrap justify-center">
        <button onClick={onOpenFavorites} className="hover:text-white transition-colors p-2">
          <Bookmark className="w-5 h-5" />
        </button>
        
        <button onClick={onToggleFavorite} className={cn("hover:text-white transition-colors p-2", isFavorite && "text-rose-400 hover:text-rose-300")}>
          <Heart className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} />
        </button>

        {onOpenComments && (
          <button onClick={onOpenComments} className="hover:text-white transition-colors p-2">
            <MessageCircle className="w-5 h-5" />
          </button>
        )}
        
        <button onClick={onToggleAutoPlay} className="hover:text-white transition-colors p-2">
          {isAutoPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>

        {hasAudio && onToggleAudio && (
          <button onClick={onToggleAudio} className={cn("hover:text-white transition-colors p-2", isAudioPlaying ? "text-blue-400" : "")}>
            {isAudioPlaying ? <Music className="w-5 h-5 animate-pulse" /> : <VolumeX className="w-5 h-5" />}
          </button>
        )}
        
        <button onClick={onCopy} className="hover:text-white transition-colors p-2">
          <Copy className="w-5 h-5" />
        </button>
        
        <button onClick={onShare} className="hover:text-white transition-colors p-2">
          <Share2 className="w-5 h-5" />
        </button>

        <button onClick={onOpenFilters} className="hover:text-white transition-colors p-2">
          <ListFilter className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
