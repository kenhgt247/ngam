import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, orderBy, limit, startAfter, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Quote } from '../../types';
import { Trash2, CheckCircle, XCircle, Edit, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { EditQuoteModal } from './EditQuoteModal';

export default function QuotesManager() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  
  // Pagination state
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [pageStack, setPageStack] = useState<QueryDocumentSnapshot<DocumentData>[]>([]);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Confirm modal state
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchQuotes = async (isNext = false, isPrev = false) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let q = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'), limit(pageSize));

      if (isNext && lastVisible) {
        q = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(pageSize));
      } else if (isPrev && pageStack.length > 1) {
        // Pop current page
        const newStack = [...pageStack];
        newStack.pop();
        const prevLastVisible = newStack[newStack.length - 1];
        
        if (newStack.length === 1) {
          // Back to first page
          q = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'), limit(pageSize));
        } else {
          q = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'), startAfter(prevLastVisible), limit(pageSize));
        }
        setPageStack(newStack);
      } else if (!isNext && !isPrev) {
        // Reset to first page
        setPageStack([]);
        setCurrentPage(1);
      }

      const snapshot = await getDocs(q);
      const fetchedQuotes: Quote[] = [];
      snapshot.forEach(doc => {
        fetchedQuotes.push({ id: doc.id, ...doc.data() } as Quote);
      });

      if (snapshot.docs.length > 0) {
        setFirstVisible(snapshot.docs[0]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        
        if (isNext) {
          setPageStack(prev => [...prev, lastVisible!]);
          setCurrentPage(prev => prev + 1);
        } else if (isPrev) {
          setCurrentPage(prev => prev - 1);
        } else {
          setPageStack([snapshot.docs[0]]);
        }
      }

      setQuotes(fetchedQuotes);
      setHasNextPage(snapshot.docs.length === pageSize);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      setErrorMsg('Bạn không có quyền xem danh sách này hoặc có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const toggleApproval = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'quotes', id), { isApproved: !currentStatus });
      setQuotes(quotes.map(q => q.id === id ? { ...q, isApproved: !currentStatus } : q));
    } catch (error) {
      console.error("Error updating approval:", error);
      setErrorMsg('Bạn không có quyền cập nhật trạng thái.');
    }
  };

  const confirmDelete = (id: string) => {
    setQuoteToDelete(id);
  };

  const handleDelete = async () => {
    if (!quoteToDelete) return;
    try {
      await deleteDoc(doc(db, 'quotes', quoteToDelete));
      setQuotes(quotes.filter(q => q.id !== quoteToDelete));
      setQuoteToDelete(null);
    } catch (error) {
      console.error("Error deleting quote:", error);
      setErrorMsg('Bạn không có quyền xoá câu nói này.');
      setQuoteToDelete(null);
    }
  };

  const handleUpdateQuote = (updatedQuote: Quote) => {
    setQuotes(quotes.map(q => q.id === updatedQuote.id ? updatedQuote : q));
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý Quotes</h1>
        <button onClick={() => fetchQuotes()} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 w-full sm:w-auto">
          Làm mới
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 p-4 bg-rose-50 text-rose-600 rounded-lg border border-rose-200">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {quotes.map(quote => (
            <div key={quote.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3">
              <div className="flex justify-between items-start gap-4">
                <p className="text-slate-800 font-medium line-clamp-3 flex-1">"{quote.content}"</p>
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => setEditingQuote(quote)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => confirmDelete(quote.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-600 font-medium">{quote.author}</span>
                <span className="text-slate-300">•</span>
                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                  {quote.category}
                </span>
                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                  {quote.mood}
                </span>
                <button 
                  onClick={() => toggleApproval(quote.id, quote.isApproved)}
                  className={`ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-full font-medium ${quote.isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                >
                  {quote.isApproved ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {quote.isApproved ? 'Đã duyệt' : 'Chờ duyệt'}
                </button>
              </div>
            </div>
          ))}
          {quotes.length === 0 && (
            <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              Chưa có dữ liệu.
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
        <button
          onClick={() => fetchQuotes(false, true)}
          disabled={currentPage === 1 || loading}
          className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Trước
        </button>
        <span className="text-sm text-slate-600">
          Trang {currentPage}
        </span>
        <button
          onClick={() => fetchQuotes(true, false)}
          disabled={!hasNextPage || loading}
          className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Sau
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <EditQuoteModal 
        quote={editingQuote}
        isOpen={!!editingQuote}
        onClose={() => setEditingQuote(null)}
        onUpdate={handleUpdateQuote}
      />

      {/* Delete Confirm Modal */}
      {quoteToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Xác nhận xoá</h3>
            <p className="text-slate-600 mb-6">Bạn có chắc chắn muốn xoá câu nói này? Hành động này không thể hoàn tác.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setQuoteToDelete(null)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 text-white font-medium hover:bg-rose-700 rounded-lg transition-colors"
              >
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
