import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Image as ImageIcon, Upload } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Quote } from '../types';
import slugify from 'slugify';
import { presetColors, presetTextColors, images } from '../utils/backgrounds';
import { cn } from '../utils/cn';
import ReactPlayer from 'react-player';

interface PostQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PostQuoteModal({ isOpen, onClose }: PostQuoteModalProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [category, setCategory] = useState<string>('Ngẫm sự đời');
  const [mood, setMood] = useState<string>('Sâu sắc');
  
  const [backgroundType, setBackgroundType] = useState<'color' | 'image'>('image');
  const [selectedColor, setSelectedColor] = useState<string>('bg-slate-800');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedTextColor, setSelectedTextColor] = useState<string>('text-white');
  const [fontFamily, setFontFamily] = useState<string>('font-serif');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  if (!isOpen) return null;

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
      // Base64 is roughly 1.33x the binary size, so 1MB binary is ~1.33MB base64
      // Let's set a safe limit of 800KB for the base64 string
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
    if (!user) return;
    
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
      const displayAuthor = author.trim() || user.displayName || 'Khuyết danh';
      const slug = slugify(content.substring(0, 50), { lower: true, strict: true }) + '-' + Date.now().toString().slice(-6);

      let finalImageUrl = imageUrl.trim();
      if (backgroundType === 'image' && !finalImageUrl) {
        finalImageUrl = images[Math.floor(Math.random() * images.length)];
      }

      const newQuote: Partial<Quote> = {
        content: content.trim(),
        author: displayAuthor,
        authorId: user.uid,
        authorDisplayName: user.displayName || '',
        authorPhotoURL: user.photoURL || '',
        category,
        mood,
        isApproved: true, // Auto-approve for now, or could be false for admin review
        isFeatured: false,
        createdAt: Date.now(),
        views: 0,
        likes: 0,
        backgroundType,
        color: backgroundType === 'color' ? selectedColor : '',
        imageUrl: backgroundType === 'image' ? finalImageUrl : '',
        textColor: selectedTextColor,
        fontFamily,
        audioUrl: audioUrl.trim(),
        slug
      };

      await addDoc(collection(db, 'quotes'), newQuote);
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setContent('');
        setAuthor('');
        setAudioUrl('');
        setImageUrl('');
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error posting quote:', err);
      if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
        const errInfo = {
          error: err.message,
          operationType: 'create',
          path: 'quotes',
          authInfo: {
            userId: user?.uid,
            email: user?.email,
            emailVerified: user?.emailVerified,
            isAnonymous: user?.isAnonymous,
            tenantId: user?.tenantId,
            providerInfo: user?.providerData.map(provider => ({
              providerId: provider.providerId,
              displayName: provider.displayName,
              email: provider.email,
              photoUrl: provider.photoURL
            })) || []
          }
        };
        console.error('Firestore Error: ', JSON.stringify(errInfo));
        setError('Bạn không có quyền đăng bài.');
      } else {
        setError('Có lỗi xảy ra khi đăng bài. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 sm:border border-white/10 sm:rounded-3xl w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 shrink-0 bg-slate-900">
          <h2 className="text-lg sm:text-xl font-serif font-medium text-white">Đăng câu nói của bạn</h2>
          <button 
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!success && (
          <div className="flex sm:hidden border-b border-white/10 shrink-0 bg-slate-900">
            <button 
              className={`flex-1 py-3 text-sm font-medium ${activeTab === 'edit' ? 'text-white border-b-2 border-white' : 'text-white/50'}`}
              onClick={() => setActiveTab('edit')}
            >
              Chỉnh sửa
            </button>
            <button 
              className={`flex-1 py-3 text-sm font-medium ${activeTab === 'preview' ? 'text-white border-b-2 border-white' : 'text-white/50'}`}
              onClick={() => setActiveTab('preview')}
            >
              Xem trước
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col sm:flex-row gap-6 sm:gap-8 bg-slate-900">
          {success ? (
            <div className="text-center py-8 w-full flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Đăng thành công!</h3>
              <p className="text-white/60">Câu nói của bạn đã được thêm vào hệ thống.</p>
            </div>
          ) : (
            <>
              {/* Form Section */}
              <div className={`flex-1 space-y-4 ${activeTab === 'edit' ? 'block' : 'hidden sm:block'}`}>
                <form id="post-quote-form" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Nội dung câu nói *
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Viết ra những suy ngẫm của bạn..."
                      className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 resize-none"
                      maxLength={500}
                    />
                    <div className="text-right text-xs text-white/40 mt-1">
                      {content.length}/500
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Tác giả (tuỳ chọn)
                    </label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder={user?.displayName || 'Tên của bạn'}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30"
                      maxLength={50}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Link nhạc nền (YouTube hoặc MP3 - tuỳ chọn)
                    </label>
                    <input
                      type="text"
                      value={audioUrl}
                      onChange={(e) => setAudioUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        Chủ đề
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
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
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        Cảm xúc
                      </label>
                      <select
                        value={mood}
                        onChange={(e) => setMood(e.target.value)}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
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

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Phông chữ
                    </label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                    >
                      <option value="font-serif">Serif (Mặc định)</option>
                      <option value="font-sans">Sans-serif</option>
                      <option value="font-mono">Monospace</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Loại nền
                    </label>
                    <div className="flex gap-4 mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="bgType" 
                          value="color" 
                          checked={backgroundType === 'color'} 
                          onChange={() => setBackgroundType('color')}
                          className="text-blue-500 focus:ring-blue-500 bg-slate-800 border-white/20"
                        />
                        <span className="text-white/80">Màu sắc</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="bgType" 
                          value="image" 
                          checked={backgroundType === 'image'} 
                          onChange={() => setBackgroundType('image')}
                          className="text-blue-500 focus:ring-blue-500 bg-slate-800 border-white/20"
                        />
                        <span className="text-white/80">Ảnh (Link)</span>
                      </label>
                    </div>

                    {backgroundType === 'color' ? (
                      <div className="flex flex-wrap gap-2">
                        {presetColors.map((colorClass) => (
                          <button
                            key={colorClass}
                            type="button"
                            onClick={() => setSelectedColor(colorClass)}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${colorClass} ${
                              selectedColor === colorClass ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                            }`}
                            title={colorClass}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-white/30">
                          <ImageIcon className="w-5 h-5 text-white/40 shrink-0" />
                          <input
                            type="url"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="Để trống để dùng ảnh ngẫu nhiên..."
                            className="w-full bg-transparent text-white placeholder:text-white/30 focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="h-px flex-1 bg-white/10"></div>
                          <span className="text-xs text-white/40 uppercase">Hoặc</span>
                          <div className="h-px flex-1 bg-white/10"></div>
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
                            className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <p className="text-xs text-white/40 text-center">Khuyên dùng ảnh dọc (tỷ lệ 9:16). Kích thước tối đa 5MB.</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
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

                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                </form>
              </div>

              {/* Preview Section */}
              <div className={`flex-1 flex flex-col ${activeTab === 'preview' ? 'flex' : 'hidden sm:flex'}`}>
                <label className="hidden sm:block text-sm font-medium text-white/70 mb-2 shrink-0">
                  Bản xem trước
                </label>
                <div 
                  className={cn(
                    "flex-1 rounded-2xl min-h-[300px] flex flex-col items-center justify-center p-6 text-center space-y-6 shadow-inner relative overflow-hidden",
                    backgroundType === 'color' ? selectedColor : 'bg-slate-800'
                  )}
                >
                  {backgroundType === 'image' && imageUrl && (
                    <div className="absolute inset-0 z-0">
                      <img 
                        src={imageUrl} 
                        alt="Background preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40" /> {/* Overlay to ensure text is readable */}
                    </div>
                  )}
                  
                  <div className="relative z-10 flex flex-col items-center justify-center w-full h-full space-y-6">
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
                        {author || user?.displayName || 'Tác giả'}
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
            </>
          )}
        </div>
        
        {!success && (
          <div className="p-4 sm:p-6 border-t border-white/10 shrink-0 bg-slate-900 pb-safe">
            <button
              type="submit"
              form="post-quote-form"
              disabled={isSubmitting}
              className="w-full py-3 bg-white text-slate-900 rounded-xl font-medium hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang đăng...
                </>
              ) : (
                'Đăng câu nói'
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
