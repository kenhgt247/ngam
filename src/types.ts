export type Category = 
  | 'Châm ngôn cuộc sống'
  | 'Bài học cuộc sống'
  | 'Ngẫm sự đời'
  | 'Trưởng thành'
  | 'Cô đơn'
  | 'Buông bỏ'
  | 'Cố gắng'
  | 'Động lực'
  | 'Thức tỉnh'
  | 'Chữa lành'
  | 'Tình người'
  | 'Tiền bạc và giá trị'
  | 'Im lặng'
  | 'Nhân quả'
  | 'Bình yên';

export type Mood = 
  | 'Trầm lắng'
  | 'Tích cực'
  | 'Buồn'
  | 'Bình yên'
  | 'Sâu sắc'
  | 'Động lực'
  | 'Ngẫm sự đời';

export interface Quote {
  id: string;
  content: string;
  author: string;
  authorId?: string;
  authorDisplayName?: string;
  authorPhotoURL?: string;
  category: Category | string;
  mood: Mood | string;
  tags?: string[];
  isApproved: boolean;
  isFeatured: boolean;
  createdAt: number;
  views: number;
  likes: number;
  backgroundType: 'image' | 'gradient' | 'color';
  imageUrl?: string;
  audioUrl?: string;
  color?: string;
  fontFamily?: string;
  textColor?: string;
  slug: string;
}

export interface User {
  uid: string;
  email: string;
  role: 'admin' | 'user';
}

export interface Favorite {
  id: string;
  userId: string;
  quoteId: string;
  createdAt: number;
}

