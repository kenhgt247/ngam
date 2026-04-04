import { createServer as createViteServer } from 'vite';

async function test() {
  console.log('Before Vite:', process.env.GEMINI_API_KEY?.substring(0, 4));
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  console.log('After Vite:', process.env.GEMINI_API_KEY?.substring(0, 4));
  process.exit(0);
}
test();
