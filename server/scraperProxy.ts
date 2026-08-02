import { Router, Request, Response } from 'express';

const router = Router();

const SCRAPER_URL = process.env.SCRAPER_URL ?? 'http://localhost:3001';
const SCRAPER_INTERNAL_KEY = process.env.SCRAPER_INTERNAL_KEY ?? '';

router.all('*', async (req: Request, res: Response) => {
  const qs = Object.keys(req.query).length
    ? '?' + new URLSearchParams(req.query as Record<string, string>).toString()
    : '';

  const targetUrl = `${SCRAPER_URL}/api${req.path}${qs}`;

  try {
    const options: RequestInit = {
      method: req.method,
      headers: {
        'X-Internal-Key': SCRAPER_INTERNAL_KEY,
        'Content-Type': 'application/json',
      },
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      options.body = JSON.stringify(req.body);
    }

    const upstream = await fetch(targetUrl, options);
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err: unknown) {
    const isDown = (err as { cause?: { code?: string } })?.cause?.code === 'ECONNREFUSED';
    res.status(503).json({
      success: false,
      error: {
        code: 'SCRAPER_UNAVAILABLE',
        message: isDown
          ? 'שירות ייבוא הבנק אינו זמין. הפעל אותו עם: cd finance-scraper && npm run dev'
          : String(err),
      },
    });
  }
});

export { router as scraperProxy };
