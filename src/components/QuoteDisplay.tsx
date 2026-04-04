import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactPlayer from 'react-player';
import { Quote } from '../types';
import { cn } from '../utils/cn';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';

import { Link } from 'react-router-dom';

interface QuoteDisplayProps {
  quote: Quote;
  background: { type: string; value: string };
  isAudioPlaying?: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export function QuoteDisplay({ quote, background, isAudioPlaying = true, onSwipeLeft, onSwipeRight }: QuoteDisplayProps) {
  // Simple swipe detection
  let touchStartX = 0;
  let touchEndX = 0;
  
  useEffect(() => {
    // Increment view count when quote is displayed
    if (quote && quote.id && quote.id.length > 5) { // Ensure it's a real firestore ID
      updateDoc(doc(db, 'quotes', quote.id), {
        views: increment(1)
      }).catch(() => {});
    }
  }, [quote.id]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  };

  const handleSwipe = () => {
    if (touchEndX < touchStartX - 50) onSwipeLeft();
    if (touchEndX > touchStartX + 50) onSwipeRight();
  };

  const [hasAudioError, setHasAudioError] = React.useState(false);

  useEffect(() => {
    setHasAudioError(false);
  }, [quote.audioUrl]);

  // Helper to check if a URL is a valid YouTube URL with a video ID
  const isValidAudioUrl = (url: string | undefined) => {
    if (!url) return false;
    if (!ReactPlayer.canPlay(url)) return false;
    
    // Extra check for YouTube URLs to ensure they have a valid 11-character video ID
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
      return ytRegex.test(url);
    }
    
    return true;
  };

  return (
    <div 
      className="relative w-full h-full flex flex-col items-center justify-center px-6 sm:px-12 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={background.value}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className={cn(
            "absolute inset-0 z-0",
            (background.type === 'gradient' || background.type === 'color') ? background.value : ''
          )}
        >
          {background.type === 'image' && (
            <img 
              src={background.value} 
              alt="Background" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Overlay - only for images to ensure text readability */}
      {background.type === 'image' && (
        <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[2px]" />
      )}

      {/* Audio Player (Hidden) */}
      {quote.audioUrl && !hasAudioError && isValidAudioUrl(quote.audioUrl) && (
        <div className="hidden">
          <ReactPlayer
            key={quote.audioUrl}
            url={quote.audioUrl}
            playing={isAudioPlaying}
            loop={true}
            volume={0.5}
            width="0"
            height="0"
            playsinline
            onError={(e) => {
              console.log('Audio player error:', e);
              setHasAudioError(true);
            }}
            config={{
              youtube: {
                playerVars: { autoplay: 1, controls: 0 }
              }
            } as any}
          />
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={quote.id}
          initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-20 max-w-2xl w-full text-center space-y-8"
        >
          <p className={cn(
            "text-3xl sm:text-4xl md:text-5xl leading-relaxed sm:leading-relaxed md:leading-relaxed tracking-wide drop-shadow-lg",
            quote.fontFamily || "font-serif",
            quote.textColor || "text-white/95"
          )}>
            "{quote.content}"
          </p>
          
          <div className="flex flex-col items-center gap-2">
            {quote.authorId ? (
              <Link 
                to={`/profile/${quote.authorId}`}
                className={cn("font-sans text-sm sm:text-base tracking-widest uppercase opacity-80 hover:opacity-100 transition-opacity flex items-center gap-2", quote.textColor || "text-white")}
              >
                {quote.authorPhotoURL && (
                  <img src={quote.authorPhotoURL} alt={quote.author} className="w-6 h-6 rounded-full object-cover border border-current/20" referrerPolicy="no-referrer" />
                )}
                {quote.author}
              </Link>
            ) : (
              <span className={cn("font-sans text-sm sm:text-base tracking-widest uppercase opacity-80", quote.textColor || "text-white")}>
                {quote.author}
              </span>
            )}
            <div className={cn("flex items-center gap-3 text-xs opacity-60", quote.textColor || "text-white")}>
              <span className="px-2 py-1 rounded-full border border-current/20 bg-current/5 backdrop-blur-sm">
                {quote.category}
              </span>
              <span className="px-2 py-1 rounded-full border border-current/20 bg-current/5 backdrop-blur-sm">
                {quote.mood}
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
