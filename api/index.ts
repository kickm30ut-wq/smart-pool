import { app, ensureServerInitialized } from '../src/serverApp';

// Vercel Serverless Function Handler
export default async function handler(req: any, res: any) {
  await ensureServerInitialized();
  return app(req, res);
}
