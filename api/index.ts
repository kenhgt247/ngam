import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json());

// AI API Routes
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { topic } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Viết 10 câu châm ngôn tiếng Việt về chủ đề "${topic}", văn phong sâu sắc, không sáo rỗng, mỗi câu 1-3 dòng. Trả về định dạng JSON array chứa các object có cấu trúc: { "content": "nội dung câu nói", "author": "tác giả hoặc Sưu tầm", "category": "${topic}", "mood": "Trầm lắng | Tích cực | Buồn | Bình yên | Sâu sắc | Động lực | Ngẫm sự đời" }`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const jsonStr = response.text?.trim() || '[]';
    const quotes = JSON.parse(jsonStr);
    res.json({ quotes });
  } catch (error: any) {
    console.error('AI Generate Error:', error);
    res.status(500).json({ error: 'Failed to generate quotes', details: error.message });
  }
});

app.post('/api/ai/rewrite', async (req, res) => {
  try {
    const { quote } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Viết lại câu sau cho sâu sắc hơn, ít từ hơn, giàu cảm xúc hơn: "${quote}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    res.json({ result: response.text?.trim() });
  } catch (error) {
    console.error('AI Rewrite Error:', error);
    res.status(500).json({ error: 'Failed to rewrite quote' });
  }
});

app.post('/api/ai/classify', async (req, res) => {
  try {
    const { quote } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Phân loại câu sau vào category và mood.
Câu: "${quote}"
Danh sách Category: Châm ngôn cuộc sống, Bài học cuộc sống, Ngẫm sự đời, Trưởng thành, Cô đơn, Buông bỏ, Cố gắng, Động lực, Thức tỉnh, Chữa lành, Tình người, Tiền bạc và giá trị, Im lặng, Nhân quả, Bình yên.
Danh sách Mood: Trầm lắng, Tích cực, Buồn, Bình yên, Sâu sắc, Động lực, Ngẫm sự đời.
Trả về định dạng JSON: { "category": "...", "mood": "..." }`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const jsonStr = response.text?.trim() || '{}';
    const result = JSON.parse(jsonStr);
    res.json(result);
  } catch (error) {
    console.error('AI Classify Error:', error);
    res.status(500).json({ error: 'Failed to classify quote' });
  }
});

export default app;
