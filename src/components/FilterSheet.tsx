import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Category, Mood } from '../types';
import { cn } from '../utils/cn';

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory?: Category;
  selectedMood?: Mood;
  onSelectCategory: (c?: Category) => void;
  onSelectMood: (m?: Mood) => void;
}

const categories: Category[] = [
  'Châm ngôn cuộc sống', 'Bài học cuộc sống', 'Ngẫm sự đời', 'Trưởng thành',
  'Cô đơn', 'Buông bỏ', 'Cố gắng', 'Động lực', 'Thức tỉnh', 'Chữa lành',
  'Tình người', 'Tiền bạc và giá trị', 'Im lặng', 'Nhân quả', 'Bình yên'
];

const moods: Mood[] = ['Trầm lắng', 'Tích cực', 'Buồn', 'Bình yên', 'Sâu sắc', 'Động lực', 'Ngẫm sự đời'];

export function FilterSheet({
  isOpen,
  onClose,
  selectedCategory,
  selectedMood,
  onSelectCategory,
  onSelectMood
}: FilterSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 z-50 bg-slate-900 rounded-t-3xl border-t border-white/10 p-6 max-h-[80vh] overflow-y-auto no-scrollbar"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif text-white">Khám phá</h2>
              <button onClick={onClose} className="p-2 text-white/50 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-8">
              {/* Moods */}
              <section>
                <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4">Tâm trạng</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onSelectMood(undefined)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm transition-colors border",
                      !selectedMood 
                        ? "bg-white text-slate-900 border-white" 
                        : "bg-transparent text-white/70 border-white/20 hover:border-white/50"
                    )}
                  >
                    Tất cả
                  </button>
                  {moods.map(mood => (
                    <button
                      key={mood}
                      onClick={() => onSelectMood(mood)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm transition-colors border",
                        selectedMood === mood
                          ? "bg-white text-slate-900 border-white" 
                          : "bg-transparent text-white/70 border-white/20 hover:border-white/50"
                      )}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </section>

              {/* Categories */}
              <section>
                <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4">Chủ đề</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onSelectCategory(undefined)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm transition-colors border",
                      !selectedCategory 
                        ? "bg-white text-slate-900 border-white" 
                        : "bg-transparent text-white/70 border-white/20 hover:border-white/50"
                    )}
                  >
                    Tất cả
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => onSelectCategory(cat)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm transition-colors border",
                        selectedCategory === cat
                          ? "bg-white text-slate-900 border-white" 
                          : "bg-transparent text-white/70 border-white/20 hover:border-white/50"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
