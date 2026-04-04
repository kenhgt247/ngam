import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { QuoteDisplay } from '../components/QuoteDisplay';
import { CommentsSheet } from '../components/CommentsSheet';
import { getRandomBackground } from '../utils/backgrounds';
import { Quote } from '../types';
import { UserMenu } from '../components/UserMenu';
import { ArrowLeft, MessageCircle } from 'lucide-react';

export default function QuotePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [background, setBackground] = useState<{type: string, value: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!slug) return;
      try {
        let q = query(collection(db, 'quotes'), where('slug', '==', slug), where('isApproved', '==', true), limit(1));
        
        // If user is logged in, we might want to try fetching their own quote if the public one fails,
        // but for simplicity and to avoid complex index requirements, we'll just fetch approved ones.
        // A better approach for fetching a specific document is to use its ID, but we only have the slug here.
        
        let snapshot = await getDocs(q);
        
        if (snapshot.empty && auth.currentUser) {
          // Fallback: Try fetching if the user is the author (might require a different index)
          try {
            const authorQuery = query(collection(db, 'quotes'), where('slug', '==', slug), where('authorId', '==', auth.currentUser.uid), limit(1));
            snapshot = await getDocs(authorQuery);
          } catch (e) {
            console.log("Fallback query failed, likely due to missing index or permissions", e);
          }
        }
        
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const fetchedQuote = { id: doc.id, ...doc.data() } as Quote;
          setQuote(fetchedQuote);
          setBackground(getRandomBackground(fetchedQuote.backgroundType as any, fetchedQuote.color, fetchedQuote.imageUrl));
        }
      } catch (error) {
        console.error("Error fetching quote:", error);
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
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [slug]);

  if (loading) {
    return <div className="w-full h-[100dvh] bg-slate-950 flex items-center justify-center text-white">Đang tải...</div>;
  }

  if (!quote || !background) {
    return (
      <div className="w-full h-[100dvh] bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
        <p>Không tìm thấy câu nói này.</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden bg-slate-950">
      <header className="absolute top-0 left-0 right-0 p-6 z-50 flex justify-between items-center pointer-events-none">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors pointer-events-auto">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium text-sm hidden sm:inline">Quay lại</span>
        </button>
        <h1 className="font-serif text-xl font-bold tracking-widest text-white/90 drop-shadow-md absolute left-1/2 -translate-x-1/2 pointer-events-auto">
          NGAM.VN
        </h1>
        <div className="pointer-events-auto">
          <UserMenu />
        </div>
      </header>

      <QuoteDisplay 
        quote={quote} 
        background={background}
        onSwipeLeft={() => {}}
        onSwipeRight={() => {}}
      />

      <div className="absolute bottom-0 left-0 right-0 p-6 z-30 flex flex-col items-center gap-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent pb-8">
        <button 
          onClick={() => setIsCommentsOpen(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all active:scale-95"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Bình luận</span>
        </button>
      </div>

      <CommentsSheet
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        quoteId={quote.id}
      />
    </main>
  );
}
