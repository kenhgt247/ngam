import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, limit, orderBy, updateDoc, doc, increment, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { QuoteDisplay } from '../components/QuoteDisplay';
import { Controls } from '../components/Controls';
import { FilterSheet } from '../components/FilterSheet';
import { FavoritesList } from '../components/FavoritesList';
import { CommentsSheet } from '../components/CommentsSheet';
import { getRandomBackground } from '../utils/backgrounds';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Quote, Category, Mood } from '../types';
import { UserMenu } from '../components/UserMenu';
import { quotes as fallbackQuotes } from '../data/quotes';

export default function HomePage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [background, setBackground] = useState<{type: string, value: string} | null>(null);
  
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>();
  const [selectedMood, setSelectedMood] = useState<Mood | undefined>();
  
  const [favorites, setFavorites] = useLocalStorage<Quote[]>('ngam_favorites', []);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  // Fetch quotes from Firestore
  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        let q = query(collection(db, 'quotes'), where('isApproved', '==', true), limit(100));
        
        if (selectedCategory) {
          q = query(collection(db, 'quotes'), where('isApproved', '==', true), where('category', '==', selectedCategory), limit(100));
        } else if (selectedMood) {
          q = query(collection(db, 'quotes'), where('isApproved', '==', true), where('mood', '==', selectedMood), limit(100));
        }

        const snapshot = await getDocs(q);
        const fetchedQuotes: Quote[] = [];
        snapshot.forEach(doc => {
          fetchedQuotes.push({ id: doc.id, ...doc.data() } as Quote);
        });

        if (fetchedQuotes.length > 0) {
          setQuotes(fetchedQuotes);
          const randomQ = fetchedQuotes[Math.floor(Math.random() * fetchedQuotes.length)];
          setCurrentQuote(randomQ);
          setBackground(getRandomBackground(randomQ.backgroundType as any, randomQ.color, randomQ.imageUrl));
          if (randomQ.audioUrl) setIsAudioPlaying(true);
        } else {
          // Fallback to local data if firestore is empty or no match
          const localQuotes = fallbackQuotes.map(q => ({
            ...q,
            isApproved: true,
            createdAt: Date.now(),
            views: 0,
            likes: 0,
            backgroundType: q.backgroundType || 'gradient',
            slug: q.id
          })) as Quote[];
          
          let filtered = localQuotes;
          if (selectedCategory) filtered = filtered.filter(q => q.category === selectedCategory);
          if (selectedMood) filtered = filtered.filter(q => q.mood === selectedMood);
          
          if (filtered.length === 0) filtered = localQuotes;
          
          setQuotes(filtered);
          const randomQ = filtered[Math.floor(Math.random() * filtered.length)];
          setCurrentQuote(randomQ);
          setBackground(getRandomBackground(randomQ.backgroundType as any, randomQ.color, randomQ.imageUrl));
          if (randomQ.audioUrl) setIsAudioPlaying(true);
        }
      } catch (error) {
        console.error("Error fetching quotes:", error);
        if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
          const errInfo = {
            error: error.message,
            operationType: 'list',
            path: 'quotes',
            authInfo: {
              userId: auth.currentUser?.uid,
              email: auth.currentUser?.email,
              emailVerified: auth.currentUser?.emailVerified,
              isAnonymous: auth.currentUser?.isAnonymous,
              tenantId: auth.currentUser?.tenantId,
              providerInfo: auth.currentUser?.providerData.map(provider => ({
                providerId: provider.providerId,
                displayName: provider.displayName,
                email: provider.email,
                photoUrl: provider.photoURL
              })) || []
            }
          };
          console.error('Firestore Error: ', JSON.stringify(errInfo));
          throw new Error(JSON.stringify(errInfo));
        }
        // Fallback
        const localQuotes = fallbackQuotes.map(q => ({
            ...q,
            isApproved: true,
            createdAt: Date.now(),
            views: 0,
            likes: 0,
            backgroundType: q.backgroundType || 'gradient',
            slug: q.id
        })) as Quote[];
        setQuotes(localQuotes);
        const randomQ = localQuotes[Math.floor(Math.random() * localQuotes.length)];
        setCurrentQuote(randomQ);
        setBackground(getRandomBackground(randomQ.backgroundType as any, randomQ.color, randomQ.imageUrl));
        if (randomQ.audioUrl) setIsAudioPlaying(true);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, [selectedCategory, selectedMood]);

  useEffect(() => {
    if (currentQuote?.audioUrl) {
      setIsAudioPlaying(true);
    } else {
      setIsAudioPlaying(false);
    }
  }, [currentQuote]);

  const handleNextQuote = useCallback(() => {
    if (quotes.length === 0) return;
    const availableQuotes = quotes.length > 1 ? quotes.filter(q => q.id !== currentQuote?.id) : quotes;
    const nextQuote = availableQuotes[Math.floor(Math.random() * availableQuotes.length)];
    setCurrentQuote(nextQuote);
    setBackground(getRandomBackground(nextQuote.backgroundType as any, nextQuote.color, nextQuote.imageUrl));
    
    // Auto-play audio if the next quote has music
    if (nextQuote.audioUrl) {
      setIsAudioPlaying(true);
    } else {
      setIsAudioPlaying(false);
    }
  }, [quotes, currentQuote]);

  // Auto-play logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoPlaying) {
      const delay = Math.floor(Math.random() * (12000 - 8000 + 1) + 8000);
      interval = setInterval(handleNextQuote, delay);
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying, handleNextQuote]);

  const toggleFavorite = async () => {
    if (!currentQuote) return;
    const isFav = favorites.some(f => f.id === currentQuote.id);
    if (isFav) {
      setFavorites(favorites.filter(f => f.id !== currentQuote.id));
      showToast('Đã bỏ lưu');
      try {
        await updateDoc(doc(db, 'quotes', currentQuote.id), {
          likes: increment(-1)
        });
        
        if (auth.currentUser) {
          await deleteDoc(doc(db, 'favorites', `${auth.currentUser.uid}_${currentQuote.id}`));
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
          const errInfo = {
            error: error.message,
            operationType: 'update',
            path: `quotes/${currentQuote.id}`,
            authInfo: {
              userId: auth.currentUser?.uid,
              email: auth.currentUser?.email,
              emailVerified: auth.currentUser?.emailVerified,
              isAnonymous: auth.currentUser?.isAnonymous,
              tenantId: auth.currentUser?.tenantId,
              providerInfo: auth.currentUser?.providerData.map(provider => ({
                providerId: provider.providerId,
                displayName: provider.displayName,
                email: provider.email,
                photoUrl: provider.photoURL
              })) || []
            }
          };
          console.error('Firestore Error: ', JSON.stringify(errInfo));
          throw new Error(JSON.stringify(errInfo));
        }
      }
    } else {
      setFavorites([...favorites, currentQuote]);
      showToast('Đã lưu vào yêu thích');
      try {
        await updateDoc(doc(db, 'quotes', currentQuote.id), {
          likes: increment(1)
        });
        
        if (auth.currentUser) {
          await setDoc(doc(db, 'favorites', `${auth.currentUser.uid}_${currentQuote.id}`), {
            userId: auth.currentUser.uid,
            quoteId: currentQuote.id,
            createdAt: Date.now()
          });
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
          const errInfo = {
            error: error.message,
            operationType: 'update',
            path: `quotes/${currentQuote.id}`,
            authInfo: {
              userId: auth.currentUser?.uid,
              email: auth.currentUser?.email,
              emailVerified: auth.currentUser?.emailVerified,
              isAnonymous: auth.currentUser?.isAnonymous,
              tenantId: auth.currentUser?.tenantId,
              providerInfo: auth.currentUser?.providerData.map(provider => ({
                providerId: provider.providerId,
                displayName: provider.displayName,
                email: provider.email,
                photoUrl: provider.photoURL
              })) || []
            }
          };
          console.error('Firestore Error: ', JSON.stringify(errInfo));
          throw new Error(JSON.stringify(errInfo));
        }
      }
    }
  };

  const removeFavorite = (id: string) => {
    setFavorites(favorites.filter(f => f.id !== id));
  };

  const handleCopy = async () => {
    if (!currentQuote) return;
    try {
      await navigator.clipboard.writeText(`"${currentQuote.content}" - ${currentQuote.author}`);
      showToast('Đã sao chép');
    } catch (err) {
      showToast('Không thể sao chép');
    }
  };

  const handleShare = async () => {
    if (!currentQuote) return;
    const shareUrl = `${window.location.origin}/quote/${currentQuote.slug || currentQuote.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'NGẪM',
          text: `"${currentQuote.content}" - ${currentQuote.author}`,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Error sharing', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Đã sao chép link chia sẻ');
      } catch (err) {
        handleCopy();
      }
    }
  };

  if (loading || !currentQuote || !background) {
    return <div className="w-full h-[100dvh] bg-slate-950 flex items-center justify-center text-white">Đang tải...</div>;
  }

  const isFavorite = favorites.some(f => f.id === currentQuote.id);

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden bg-slate-950">
      <header className="absolute top-0 left-0 right-0 p-6 z-50 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="font-serif text-2xl font-bold tracking-widest text-white/90 drop-shadow-md">
            NGẪM
          </h1>
          <div className="hidden sm:block text-xs font-medium text-white/60 tracking-widest uppercase drop-shadow-md">
            {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
        </div>
        <UserMenu />
      </header>

      <QuoteDisplay 
        quote={currentQuote} 
        background={background}
        isAudioPlaying={isAudioPlaying}
        onSwipeLeft={handleNextQuote}
        onSwipeRight={handleNextQuote}
      />

      <Controls 
        isAutoPlaying={isAutoPlaying}
        isFavorite={isFavorite}
        hasAudio={!!currentQuote.audioUrl}
        isAudioPlaying={isAudioPlaying}
        onToggleAutoPlay={() => setIsAutoPlaying(!isAutoPlaying)}
        onToggleFavorite={toggleFavorite}
        onToggleAudio={() => setIsAudioPlaying(!isAudioPlaying)}
        onNext={handleNextQuote}
        onShare={handleShare}
        onCopy={handleCopy}
        onOpenFilters={() => setIsFiltersOpen(true)}
        onOpenFavorites={() => setIsFavoritesOpen(true)}
        onOpenComments={() => setIsCommentsOpen(true)}
      />

      <FilterSheet 
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        selectedCategory={selectedCategory}
        selectedMood={selectedMood}
        onSelectCategory={setSelectedCategory}
        onSelectMood={setSelectedMood}
      />

      <FavoritesList 
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        favorites={favorites}
        onRemoveFavorite={removeFavorite}
        onSelectQuote={(quote) => {
          setCurrentQuote(quote);
          setBackground(getRandomBackground(quote.backgroundType as any, quote.color, quote.imageUrl));
        }}
      />

      <CommentsSheet
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        quoteId={currentQuote.id}
      />

      {toast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-white/20 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full text-sm font-medium shadow-xl animate-in fade-in slide-in-from-top-4">
          {toast}
        </div>
      )}
    </main>
  );
}
