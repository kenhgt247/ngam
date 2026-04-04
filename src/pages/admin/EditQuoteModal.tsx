import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Upload } from 'lucide-react';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { Quote } from '../../types';
import { presetColors, presetTextColors } from '../../utils/backgrounds';
import { cn } from '../../utils/cn';
import ReactPlayer from 'react-player';

interface EditQuoteModalProps {
  quote: Quote | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedQuote: Quote) => void;
}

export function EditQuoteModal({ quote, isOpen, onClose, onUpdate }: EditQuoteModalProps) {
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [mood, setMood] = useState('');
  const [backgroundType, setBackgroundType] = useState<'image' | 'gradient' | 'color'>('color');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedTextColor, setSelectedTextColor] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [fontFamily, setFontFamily] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (quote) {
      setContent(quote.content);
      setAuthor(quote.author);
      setCategory(quote.category);
      setMood(quote.mood);
      setBackgroundType(quote.backgroundType || 'color');
      setSelectedColor(quote.color || 'bg-slate-800');
      setSelectedTextColor(quote.textColor || 'text-white');
      setImageUrl(quote.imageUrl || '');
      setAudioUrl(quote.audioUrl || '');
      setFontFamily(quote.fontFamily || 'font-serif');
    }
  }, [quote]);

  if (!isOpen || !quote) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn một file hình ảnh hợp lệ.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit for raw file
      setError('Kích thước ảnh quá lớn. Vui lòng chọn ảnh dưới 10MB.');
      return;
    }

    setIsUploadingImage(true);
    setError('');

    try {
      // Compress image and convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      const base64Url = await new Promise<string>((resolve, reject) => {
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1080;
            const MAX_HEIGHT = 1920;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              // Compress to JPEG with 0.7 quality to keep size small for Firestore
              resolve(canvas.toDataURL('image/jpeg', 0.7));
            } else {
              reject(new Error('Could not get canvas context'));
            }
          };
          img.onerror = () => reject(new Error('Failed to load image'));
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
      });
      
      // Check if the resulting base64 is too large for Firestore (1MB limit)
      if (base64Url.length > 800 * 1024) {
        setError('Ảnh sau khi nén vẫn quá lớn. Vui lòng chọn ảnh khác đơn giản hơn.');
      } else {
        setImageUrl(base64Url);
      }
    } catch (err) {
      console.error('Error processing image:', err);
      setError('Có lỗi xảy ra khi xử lý ảnh. Vui lòng thử lại.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Vui lòng nhập nội dung câu nói.');
      return;
    }

    if (audioUrl.trim()) {
      const url = audioUrl.trim();
      if (!ReactPlayer.canPlay(url)) {
        setError('Đường dẫn âm thanh không hợp lệ. Vui lòng nhập link YouTube, SoundCloud, MP3...');
        return;
      }
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        if (!ytRegex.test(url)) {
          setError('Link YouTube không hợp lệ. Vui lòng kiểm tra lại ID video.');
          return;
        }
      }
    }

    setIsSubmitting(true);
    setError('');

    try {
      const updatedData: any = {
        content: content.trim(),
        author: author.trim() || 'Khuyết danh',
        category,
        mood,
        backgroundType,
        color: backgroundType === 'color' ? selectedColor : deleteField(),
        textColor: selectedTextColor,
        imageUrl: backgroundType === 'image' ? imageUrl : deleteField(),
        audioUrl: audioUrl.trim() || deleteField(),
        fontFamily
      };

      await updateDoc(doc(db, 'quotes', quote.id), updatedData);
      
      // Clean up updatedData for local state update
      const localUpdatedData: Partial<Quote> = { ...updatedData };
      if (backgroundType !== 'color') delete localUpdatedData.color;
      if (backgroundType !== 'image') delete localUpdatedData.imageUrl;
      
      onUpdate({ ...quote, ...localUpdatedData });
      onClose();
    } catch (err: any) {
      console.error('Error updating quote:', err);
      if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
        const errInfo = {
          error: err.message,
          operationType: 'update',
          path: `quotes/${quote.id}`,
          authInfo: {
            userId: 'user', // Placeholder
            email: '',
            emailVerified: false,
            isAnonymous: false,
            tenantId: '',
            providerInfo: []
          }
        };
        console.error('Firestore Error: ', JSON.stringify(errInfo));
        setError('Bạn không có quyền cập nhật bài viết này.');
      } else {
        setError('Có lỗi xảy ra khi cập nhật. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white sm:rounded-3xl w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 shrink-0 bg-white">
          <h2 className="text-lg sm:text-xl font-serif font-medium text-slate-900">Sửa câu nói</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex sm:hidden border-b border-slate-100 shrink-0 bg-white">
          <button 
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'edit' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
            onClick={() => setActiveTab('edit')}
          >
            Chỉnh sửa
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'preview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
            onClick={() => setActiveTab('preview')}
          >
            Xem trước
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col sm:flex-row gap-6 sm:gap-8 bg-slate-50/50">
          {/* Form Section */}
          <div className={`flex-1 space-y-4 ${activeTab === 'edit' ? 'block' : 'hidden sm:block'}`}>
            <form id="edit-quote-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nội dung câu nói *
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-32 bg-white border border-slate-200 rounded-2xl p-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                  maxLength={500}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tác giả
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Link nhạc nền (YouTube hoặc MP3 - tuỳ chọn)
                </label>
                <input
                  type="text"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Chủ đề
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="Châm ngôn cuộc sống">Châm ngôn cuộc sống</option>
                    <option value="Bài học cuộc sống">Bài học cuộc sống</option>
                    <option value="Ngẫm sự đời">Ngẫm sự đời</option>
                    <option value="Trưởng thành">Trưởng thành</option>
                    <option value="Cô đơn">Cô đơn</option>
                    <option value="Buông bỏ">Buông bỏ</option>
                    <option value="Cố gắng">Cố gắng</option>
                    <option value="Động lực">Động lực</option>
                    <option value="Thức tỉnh">Thức tỉnh</option>
                    <option value="Chữa lành">Chữa lành</option>
                    <option value="Tình người">Tình người</option>
                    <option value="Tiền bạc và giá trị">Tiền bạc và giá trị</option>
                    <option value="Im lặng">Im lặng</option>
                    <option value="Nhân quả">Nhân quả</option>
                    <option value="Bình yên">Bình yên</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cảm xúc
                  </label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="Trầm lắng">Trầm lắng</option>
                    <option value="Tích cực">Tích cực</option>
                    <option value="Buồn">Buồn</option>
                    <option value="Bình yên">Bình yên</option>
                    <option value="Sâu sắc">Sâu sắc</option>
                    <option value="Động lực">Động lực</option>
                    <option value="Ngẫm sự đời">Ngẫm sự đời</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Loại nền
                  </label>
                  <select
                    value={backgroundType}
                    onChange={(e) => setBackgroundType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="color">Màu sắc</option>
                    <option value="gradient">Gradient ngẫu nhiên</option>
                    <option value="image">Hình ảnh</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phông chữ
                  </label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="font-serif">Serif (Mặc định)</option>
                    <option value="font-sans">Sans-serif</option>
                    <option value="font-mono">Monospace</option>
                  </select>
                </div>
              </div>

              {backgroundType === 'color' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Màu nền
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {presetColors.map((colorClass) => (
                      <button
                        key={colorClass}
                        type="button"
                        onClick={() => setSelectedColor(colorClass)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${colorClass} ${
                          selectedColor === colorClass ? 'border-blue-500 scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                        }`}
                        title={colorClass}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Màu chữ
                </label>
                <div className="flex flex-wrap gap-2">
                  {presetTextColors.map((colorClass) => (
                    <button
                      key={colorClass}
                      type="button"
                      onClick={() => setSelectedTextColor(colorClass)}
                      className={`w-8 h-8 rounded-full border-2 transition-all bg-slate-800 flex items-center justify-center font-bold text-lg ${colorClass} ${
                        selectedTextColor === colorClass ? 'border-blue-500 scale-110 shadow-lg' : 'border-slate-600 hover:scale-105'
                      }`}
                      title={colorClass}
                    >
                      A
                    </button>
                  ))}
                </div>
              </div>

              {backgroundType === 'image' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    URL Hình ảnh (Tuỳ chọn)
                  </label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Để trống để lấy ảnh ngẫu nhiên"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-slate-200"></div>
                    <span className="text-xs text-slate-400 uppercase">Hoặc</span>
                    <div className="h-px flex-1 bg-slate-200"></div>
                  </div>
                  <div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploadingImage ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Đang tải lên...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          Tải ảnh lên từ thiết bị
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 text-center">Khuyên dùng ảnh dọc (tỷ lệ 9:16). Kích thước tối đa 5MB.</p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                  {error}
                </div>
              )}
            </form>
          </div>

          {/* Preview Section */}
          <div className="flex-1 flex flex-col">
            <label className="block text-sm font-medium text-slate-700 mb-2 shrink-0">
              Bản xem trước
            </label>
            <div className={cn(
              "flex-1 rounded-2xl min-h-[300px] flex flex-col items-center justify-center p-6 text-center space-y-6 shadow-inner relative overflow-hidden",
              backgroundType === 'color' ? selectedColor : 'bg-slate-900'
            )}>
              {backgroundType === 'image' && imageUrl && (
                <img src={imageUrl} alt="Background" className="absolute inset-0 w-full h-full object-cover z-0" />
              )}
              {backgroundType === 'image' && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10" />
              )}
              
              <div className="relative z-20 space-y-6">
                <p className={cn(
                  "text-xl sm:text-2xl leading-relaxed tracking-wide drop-shadow-md",
                  fontFamily,
                  selectedTextColor
                )}>
                  "{content || 'Nội dung câu nói sẽ hiển thị ở đây...'}"
                </p>
                
                <div className="flex flex-col items-center gap-2">
                  <span className={cn(
                    "font-sans text-xs sm:text-sm tracking-widest uppercase opacity-80",
                    selectedTextColor
                  )}>
                    {author || 'Tác giả'}
                  </span>
                  <div className={cn(
                    "flex items-center gap-2 text-[10px] sm:text-xs opacity-60",
                    selectedTextColor
                  )}>
                    <span className="px-2 py-1 rounded-full border border-current/20 bg-current/5 backdrop-blur-sm">
                      {category}
                    </span>
                    <span className="px-2 py-1 rounded-full border border-current/20 bg-current/5 backdrop-blur-sm">
                      {mood}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-slate-100 shrink-0 bg-white pb-safe">
          <button
            type="submit"
            form="edit-quote-form"
            disabled={isSubmitting}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Đang lưu...
              </>
            ) : (
              'Lưu thay đổi'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
