import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import slugify from 'slugify';
import { moodColors } from '../../utils/backgrounds';

export default function AIGenerator() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedQuotes, setGeneratedQuotes] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });
      const data = await response.json();
      if (data.quotes) {
        setGeneratedQuotes(data.quotes);
      }
    } catch (error) {
      console.error("Error generating quotes:", error);
      alert("Lỗi khi tạo quotes");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    if (generatedQuotes.length === 0) return;
    setSaving(true);
    try {
      const quotesRef = collection(db, 'quotes');
      for (const q of generatedQuotes) {
        const slug = slugify(q.content.substring(0, 50), { lower: true, strict: true }) + '-' + Date.now().toString().slice(-4);
        const colors = moodColors[q.mood] || moodColors['Sâu sắc'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        await addDoc(quotesRef, {
          content: q.content,
          author: q.author || 'Sưu tầm',
          category: q.category,
          mood: q.mood,
          tags: [q.category],
          isApproved: true,
          isFeatured: false,
          createdAt: Date.now(),
          views: 0,
          likes: 0,
          backgroundType: 'color',
          color: randomColor,
          textColor: 'text-white',
          fontFamily: 'font-serif',
          slug: slug
        });
      }
      alert("Đã lưu thành công!");
      setGeneratedQuotes([]);
      setTopic('');
    } catch (error) {
      console.error("Error saving quotes:", error);
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        const errInfo = {
          error: error.message,
          operationType: 'create',
          path: 'quotes',
          authInfo: {
            userId: 'admin', // Placeholder
            email: '',
            emailVerified: false,
            isAnonymous: false,
            tenantId: '',
            providerInfo: []
          }
        };
        console.error('Firestore Error: ', JSON.stringify(errInfo));
        alert("Bạn không có quyền lưu quotes.");
      } else {
        alert("Lỗi khi lưu quotes");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">AI Generator</h1>
      
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200 mb-6 sm:mb-8">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Nhập chủ đề để AI tạo châm ngôn
        </label>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <input 
            type="text" 
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="VD: Sự trưởng thành, Tình yêu, Buông bỏ..."
            className="flex-1 px-4 py-3 sm:py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <button 
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Đang tạo...' : 'Tạo bằng AI'}
          </button>
        </div>
      </div>

      {generatedQuotes.length > 0 && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Kết quả ({generatedQuotes.length} câu)</h2>
            <button 
              onClick={handleSaveAll}
              disabled={saving}
              className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Đang lưu...' : 'Lưu tất cả vào Database'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedQuotes.map((q, idx) => (
              <div key={idx} className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200">
                <p className="font-serif text-base sm:text-lg text-slate-800 mb-3">"{q.content}"</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md">Tác giả: {q.author}</span>
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md">Chủ đề: {q.category}</span>
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md">Mood: {q.mood}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
