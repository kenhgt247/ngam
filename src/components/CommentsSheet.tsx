import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { X, Send, Trash2, User as UserIcon, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

interface Comment {
  id: string;
  quoteId: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  content: string;
  createdAt: number;
}

interface CommentsSheetProps {
  quoteId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentsSheet({ quoteId, isOpen, onClose }: CommentsSheetProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (!isOpen || !quoteId) return;

    setIsLoading(true);
    const q = query(
      collection(db, 'comments'),
      where('quoteId', '==', quoteId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments: Comment[] = [];
      snapshot.forEach((doc) => {
        fetchedComments.push({ id: doc.id, ...doc.data() } as Comment);
      });
      setComments(fetchedComments);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching comments:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, quoteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'comments'), {
        quoteId,
        userId: user.uid,
        userDisplayName: user.displayName || 'Người dùng ẩn danh',
        userPhotoURL: user.photoURL || '',
        content: newComment.trim(),
        createdAt: Date.now()
      });
      setNewComment('');
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Có lỗi xảy ra khi gửi bình luận.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (commentId: string) => {
    if (!user || !editContent.trim()) return;
    try {
      await updateDoc(doc(db, 'comments', commentId), {
        content: editContent.trim()
      });
      setEditingCommentId(null);
      setEditContent('');
    } catch (error) {
      console.error("Error updating comment:", error);
      alert("Có lỗi xảy ra khi cập nhật bình luận.");
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bình luận này?")) return;
    
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Có lỗi xảy ra khi xóa bình luận.");
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div 
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 bg-slate-900 rounded-t-3xl transition-transform duration-300 ease-out flex flex-col max-h-[85vh]",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Drag Handle Indicator */}
        <div className="w-full flex justify-center pt-3 pb-1 shrink-0" onClick={onClose}>
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4 border-b border-white/10 shrink-0">
          <h3 className="text-lg font-medium text-white">Bình luận ({comments.length})</h3>
          <button 
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-white/50" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-white/50">
              Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 shrink-0">
                  {comment.userPhotoURL ? (
                    <img src={comment.userPhotoURL} alt={comment.userDisplayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="w-5 h-5 m-1.5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="bg-slate-800 rounded-2xl rounded-tl-none px-4 py-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium text-sm text-white">{comment.userDisplayName}</span>
                      <span className="text-[10px] text-white/40">
                        {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    {editingCommentId === comment.id ? (
                      <div className="mt-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button 
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditContent('');
                            }}
                            className="text-xs px-3 py-1.5 rounded-md text-white/70 hover:bg-white/10"
                          >
                            Hủy
                          </button>
                          <button 
                            onClick={() => handleUpdate(comment.id)}
                            disabled={!editContent.trim()}
                            className="text-xs px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                          >
                            Lưu
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-white/90 whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                    )}
                  </div>
                  {user && user.uid === comment.userId && editingCommentId !== comment.id && (
                    <div className="flex items-center gap-3 mt-1 ml-2">
                      <button 
                        onClick={() => {
                          setEditingCommentId(comment.id);
                          setEditContent(comment.content);
                        }}
                        className="text-xs text-white/50 hover:text-white transition-colors"
                      >
                        Sửa
                      </button>
                      <button 
                        onClick={() => handleDelete(comment.id)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Xóa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/10 shrink-0 bg-slate-900 pb-safe">
          {user ? (
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 shrink-0 mb-1">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="w-5 h-5 m-1.5 text-slate-400" />
                )}
              </div>
              <div className="flex-1 relative">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Viết bình luận..."
                  className="w-full bg-slate-800 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none max-h-32 min-h-[44px]"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 mb-1"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-2 text-sm text-white/60">
              Vui lòng đăng nhập để bình luận.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
