import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, increment, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Quote } from '../types';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, User as UserIcon, Heart, MessageCircle, PlusCircle, Image as ImageIcon, Edit, Trash2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { PostQuoteModal } from '../components/PostQuoteModal';
import { EditQuoteModal } from './admin/EditQuoteModal';

export default function ProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const { user: currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileUser, setProfileUser] = useState<{ displayName: string, photoURL: string, followersCount: number, followingCount: number } | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  const [activeTab, setActiveTab] = useState<'posts' | 'favorites'>('posts');
  const [favoriteQuotes, setFavoriteQuotes] = useState<Quote[]>([]);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);

  useEffect(() => {
    if (!uid || authLoading) return;
    
    let unsubscribeQuotes: () => void;
    
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        // Fetch followers count
        const followersQuery = query(collection(db, 'follows'), where('followingId', '==', uid));
        const followersSnapshot = await getDocs(followersQuery);
        const followersCount = followersSnapshot.size;

        // Fetch following count
        const followingQuery = query(collection(db, 'follows'), where('followerId', '==', uid));
        const followingSnapshot = await getDocs(followingQuery);
        const followingCount = followingSnapshot.size;

        // Check if following
        if (currentUser && currentUser.uid !== uid) {
          const followDoc = await getDoc(doc(db, 'follows', `${currentUser.uid}_${uid}`));
          setIsFollowing(followDoc.exists());
        }

        // Fetch favorites (only for current user)
        if (currentUser && currentUser.uid === uid) {
          const favQuery = query(collection(db, 'favorites'), where('userId', '==', uid));
          const favSnapshot = await getDocs(favQuery);
          const favQuoteIds = favSnapshot.docs.map(doc => doc.data().quoteId);
          
          if (favQuoteIds.length > 0) {
            const fetchedFavs: Quote[] = [];
            for (const quoteId of favQuoteIds) {
              const quoteDoc = await getDoc(doc(db, 'quotes', quoteId));
              if (quoteDoc.exists()) {
                fetchedFavs.push({ id: quoteDoc.id, ...quoteDoc.data() } as Quote);
              }
            }
            setFavoriteQuotes(fetchedFavs);
          }
        }

        // Setup real-time listener for quotes
        let q;
        if (currentUser && currentUser.uid === uid) {
          q = query(collection(db, 'quotes'), where('authorId', '==', uid));
        } else {
          q = query(collection(db, 'quotes'), where('authorId', '==', uid), where('isApproved', '==', true));
        }
        
        unsubscribeQuotes = onSnapshot(q, (snapshot) => {
          const fetchedQuotes: Quote[] = [];
          snapshot.forEach(doc => {
            fetchedQuotes.push({ id: doc.id, ...doc.data() } as Quote);
          });
          
          // Sort in memory to avoid requiring a composite index
          fetchedQuotes.sort((a, b) => b.createdAt - a.createdAt);
          setQuotes(fetchedQuotes);
          
          // Try to get user info from the first quote if we don't have a dedicated users collection
          if (fetchedQuotes.length > 0) {
            setProfileUser(prev => ({
              displayName: fetchedQuotes[0].authorDisplayName || fetchedQuotes[0].author || 'Người dùng',
              photoURL: fetchedQuotes[0].authorPhotoURL || '',
              followersCount: prev?.followersCount ?? followersCount,
              followingCount: prev?.followingCount ?? followingCount
            }));
          } else {
            setProfileUser(prev => ({
              displayName: 'Người dùng',
              photoURL: '',
              followersCount: prev?.followersCount ?? followersCount,
              followingCount: prev?.followingCount ?? followingCount
            }));
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching quotes:", error);
          setLoading(false);
        });

      } catch (error) {
        console.error("Error fetching profile:", error);
        setLoading(false);
      }
    };

    fetchProfileData();
    
    return () => {
      if (unsubscribeQuotes) {
        unsubscribeQuotes();
      }
    };
  }, [uid, currentUser, authLoading]);

  const handleToggleFollow = async () => {
    if (!currentUser || !uid) return;
    
    const followRef = doc(db, 'follows', `${currentUser.uid}_${uid}`);
    
    try {
      if (isFollowing) {
        await deleteDoc(followRef);
        setIsFollowing(false);
        if (profileUser) {
          setProfileUser({ ...profileUser, followersCount: Math.max(0, profileUser.followersCount - 1) });
        }
      } else {
        await setDoc(followRef, {
          followerId: currentUser.uid,
          followingId: uid,
          createdAt: Date.now()
        });
        setIsFollowing(true);
        if (profileUser) {
          setProfileUser({ ...profileUser, followersCount: profileUser.followersCount + 1 });
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        const errInfo = {
          error: error.message,
          operationType: isFollowing ? 'delete' : 'create',
          path: `follows/${currentUser.uid}_${uid}`,
          authInfo: {
            userId: currentUser?.uid,
            email: currentUser?.email,
            emailVerified: currentUser?.emailVerified,
            isAnonymous: currentUser?.isAnonymous,
            tenantId: currentUser?.tenantId,
            providerInfo: currentUser?.providerData.map(provider => ({
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
  };

  if (loading) {
    return <div className="w-full min-h-screen bg-slate-950 flex items-center justify-center text-white">Đang tải...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-medium">{profileUser?.displayName || 'Hồ sơ'}</h1>
      </header>

      {/* Cover Photo */}
      <div className="w-full h-48 sm:h-64 bg-gradient-to-r from-blue-600 to-purple-600 relative mt-14">
        {/* You can add an actual image here later if you store cover photos */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Profile Info */}
      <div className="px-4 sm:px-8 pb-6 relative">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16 sm:-mt-20 mb-4 relative z-10">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-slate-950 bg-slate-800 flex items-center justify-center shrink-0">
            {profileUser?.photoURL ? (
              <img src={profileUser.photoURL} alt={profileUser.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <UserIcon className="w-16 h-16 text-slate-400" />
            )}
          </div>
          
          <div className="flex-1 pb-2">
            <h2 className="text-2xl sm:text-3xl font-bold">{profileUser?.displayName}</h2>
            <p className="text-slate-400 text-sm mt-1">
              {profileUser?.followersCount || 0} người theo dõi • {profileUser?.followingCount || 0} đang theo dõi
            </p>
          </div>

          {currentUser && currentUser.uid !== uid && (
            <button 
              onClick={handleToggleFollow}
              className={cn(
                "px-8 py-2 rounded-lg font-medium transition-all w-full sm:w-auto mb-2",
                isFollowing 
                  ? "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700" 
                  : "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >
              {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
            </button>
          )}
          
          {currentUser && currentUser.uid === uid && (
             <button 
               className="px-6 py-2 rounded-lg font-medium transition-all w-full sm:w-auto mb-2 bg-slate-800 text-white hover:bg-slate-700 border border-slate-700"
             >
               Chỉnh sửa trang cá nhân
             </button>
          )}
        </div>
      </div>

      {/* Create Post Section (Wall) */}
      {currentUser && currentUser.uid === uid && (
        <div className="px-4 sm:px-8 mb-6">
          <div className="bg-slate-900 rounded-xl p-4 border border-white/5 shadow-lg">
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 shrink-0">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="w-6 h-6 m-2 text-slate-400" />
                )}
              </div>
              <button 
                onClick={() => setIsPostModalOpen(true)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-left px-4 py-2.5 rounded-full text-slate-300 transition-colors text-sm"
              >
                Bạn đang nghĩ gì?
              </button>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
              <button 
                onClick={() => setIsPostModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 text-slate-300 text-sm transition-colors"
              >
                <ImageIcon className="w-4 h-4 text-green-500" />
                <span>Hình nền</span>
              </button>
              <button 
                onClick={() => setIsPostModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 text-slate-300 text-sm transition-colors"
              >
                <PlusCircle className="w-4 h-4 text-blue-500" />
                <span>Đăng câu nói</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-4 sm:px-8 bg-slate-950 sticky top-[60px] z-40">
        <button 
          onClick={() => setActiveTab('posts')}
          className={cn(
            "px-4 py-4 font-medium text-sm transition-colors relative",
            activeTab === 'posts' ? "text-blue-500" : "text-slate-400 hover:text-slate-200"
          )}
        >
          Bài viết
          {activeTab === 'posts' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />
          )}
        </button>
        {currentUser && currentUser.uid === uid && (
          <button 
            onClick={() => setActiveTab('favorites')}
            className={cn(
              "px-4 py-4 font-medium text-sm transition-colors relative",
              activeTab === 'favorites' ? "text-blue-500" : "text-slate-400 hover:text-slate-200"
            )}
          >
            Đã thích
            {activeTab === 'favorites' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />
            )}
          </button>
        )}
      </div>

      {/* Feed / Wall */}
      <div className="p-4 sm:p-8 max-w-3xl mx-auto">
        {activeTab === 'posts' ? (
          quotes.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-900/50 rounded-xl border border-white/5">
              Chưa có bài viết nào.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {quotes.map(quote => (
                <div key={quote.id} className="bg-slate-900 rounded-xl border border-white/5 overflow-hidden shadow-lg">
                  {/* Post Header */}
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 shrink-0">
                        {quote.authorPhotoURL ? (
                          <img src={quote.authorPhotoURL} alt={quote.author} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <UserIcon className="w-6 h-6 m-2 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{quote.authorDisplayName || quote.author}</h3>
                        <p className="text-xs text-slate-400">{new Date(quote.createdAt).toLocaleString('vi-VN')}</p>
                      </div>
                    </div>
                    {currentUser && currentUser.uid === quote.authorId && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setEditingQuote(quote);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={async () => {
                            if (window.confirm('Bạn có chắc chắn muốn xóa câu nói này?')) {
                              try {
                                await deleteDoc(doc(db, 'quotes', quote.id));
                                setQuotes(quotes.filter(q => q.id !== quote.id));
                              } catch (error) {
                                console.error('Error deleting quote:', error);
                                alert('Có lỗi xảy ra khi xóa câu nói.');
                              }
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Post Content */}
                  <Link 
                    to={`/quote/${quote.slug || quote.id}`}
                    className={cn(
                      "block p-8 sm:p-12 text-center transition-all group relative min-h-[200px] flex items-center justify-center overflow-hidden",
                      quote.backgroundType === 'color' ? quote.color : 'bg-slate-800'
                    )}
                  >
                    {quote.backgroundType === 'image' && quote.imageUrl && (
                      <div className="absolute inset-0 z-0">
                        <img 
                          src={quote.imageUrl} 
                          alt="Background" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40" />
                      </div>
                    )}
                    <p className={cn(
                      "text-xl sm:text-2xl line-clamp-6 relative z-10",
                      quote.fontFamily || "font-serif",
                      quote.textColor || "text-white"
                    )}>
                      "{quote.content}"
                    </p>
                  </Link>
                  
                  {/* Post Footer */}
                  <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-6 text-slate-400">
                      <button className="flex items-center gap-2 hover:text-white transition-colors">
                        <Heart className="w-5 h-5" />
                        <span className="text-sm">{quote.likes || 0}</span>
                      </button>
                      <Link to={`/quote/${quote.slug || quote.id}`} className="flex items-center gap-2 hover:text-white transition-colors">
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm">Bình luận</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          favoriteQuotes.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-900/50 rounded-xl border border-white/5">
              Chưa có câu nói yêu thích nào.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {favoriteQuotes.map(quote => (
                <Link 
                  key={quote.id} 
                  to={`/quote/${quote.slug || quote.id}`}
                  className={cn(
                    "block p-6 rounded-xl border border-white/5 hover:border-white/20 transition-all group relative overflow-hidden",
                    quote.backgroundType === 'color' ? quote.color : 'bg-slate-800'
                  )}
                >
                  {quote.backgroundType === 'image' && quote.imageUrl && (
                    <div className="absolute inset-0 z-0">
                      <img 
                        src={quote.imageUrl} 
                        alt="Background" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40" />
                    </div>
                  )}
                  <div className="relative z-10">
                    <p className={cn(
                      "text-lg line-clamp-4 mb-4",
                      quote.fontFamily || "font-serif",
                      quote.textColor || "text-white"
                    )}>
                      "{quote.content}"
                    </p>
                    <div className="flex items-center justify-between text-xs opacity-60">
                      <span className={quote.textColor || "text-white"}>{quote.author}</span>
                      <div className={cn("flex items-center gap-3", quote.textColor || "text-white")}>
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3 fill-current" /> {quote.likes || 0}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </div>

      <PostQuoteModal 
        isOpen={isPostModalOpen} 
        onClose={() => setIsPostModalOpen(false)} 
      />

      <EditQuoteModal 
        quote={editingQuote}
        isOpen={!!editingQuote}
        onClose={() => setEditingQuote(null)}
        onUpdate={(updatedQuote) => {
          setQuotes(quotes.map(q => q.id === updatedQuote.id ? updatedQuote : q));
        }}
      />
    </div>
  );
}
