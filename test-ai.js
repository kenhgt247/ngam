import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

async function test() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('API Key starts with:', apiKey.substring(0, 4));
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Viết 2 câu châm ngôn.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    console.log(response.text);
  } catch (e) {
    console.error(e);
  }
}
test();
