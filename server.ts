import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { app, ensureServerInitialized } from './src/serverApp';

const PORT = 3000;

async function startServer() {
  // Ensure DB / MongoDB Atlas initialization and auto-seed
  await ensureServerInitialized();

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Smart Pooling server running on http://0.0.0.0:${PORT}`);
    if (process.env.MONGODB_URI) {
      console.log('🍃 Persistence mode: MongoDB Atlas');
    } else {
      console.log('📦 Persistence mode: Local Document Store (Add MONGODB_URI to enable MongoDB Atlas)');
    }
  });
}

startServer();
