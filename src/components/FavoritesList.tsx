import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2 } from 'lucide-react';
import { Quote } from '../types';

interface FavoritesListProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: Quote[];
  onRemoveFavorite: (id: string) => void;
  onSelectQuote: (quote: Quote) => void;
}

export function FavoritesList({
  isOpen,
  onClose,
  favorites,
  onRemoveFavorite,
  onSelectQuote
}: FavoritesListProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute inset-0 z-50 bg-slate-950 flex flex-col"
        >
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-xl font-serif text-white">Câu nói yêu thích</h2>
            <button onClick={onClose} className="p-2 text-white/50 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
            {favorites.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/50 space-y-4">
                <p>Chưa có câu nói nào được lưu.</p>
              </div>
            ) : (
              favorites.map(quote => (
                <div 
                  key={quote.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-3"
                >
                  <p 
                    className="font-serif text-lg text-white/90 cursor-pointer hover:text-white transition-colors"
                    onClick={() => {
                      onSelectQuote(quote);
                      onClose();
                    }}
                  >
                    "{quote.content}"
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-white/50 uppercase tracking-wider">{quote.author}</span>
                    <button 
                      onClick={() => onRemoveFavorite(quote.id)}
                      className="text-white/30 hover:text-rose-400 transition-colors p-2 -mr-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
