import type { RequestHandler } from 'express';
import { decodeAccessToken } from './authUtils';
export const configuredAiModel = () => process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
export const serverAiKey = () => {
  const value = process.env.GEMINI_API_KEY?.trim();
  return value && !value.startsWith('your_') ? value : undefined;
};
export const integrationAuth: RequestHandler = (req, res, next) => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'aifina-default-secret-key-change-in-production') {
    res.status(503).json({ error: 'Configure a secure JWT_SECRET on the server.' }); return;
  }
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) throw new Error('missing');
    const payload = decodeAccessToken(auth.slice(7)) as { sub: string; type?: string };
    if (payload.type !== 'access' || !payload.sub) throw new Error('invalid');
    next();
  } catch { res.status(401).json({ error: 'Authentication required' }); }
};
export const integrationStatus: RequestHandler = (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const provider = process.env.OPEN_BANKING_PROVIDER?.trim().toLowerCase() || 'hapoalim';
  const mode = process.env.OPEN_BANKING_MODE?.trim().toLowerCase() || 'not_configured';
  const connectUrl = process.env.OPEN_BANKING_CONNECT_URL?.trim();
  res.json({ ai: { configured: Boolean(serverAiKey()), model: configuredAiModel() },
    openBanking: {
      provider,
      mode,
      configured: Boolean(connectUrl),
      // This is public documentation only. Provider credentials and certificates remain server-side.
      documentationUrl: provider === 'hapoalim' ? 'https://poalimdev.co.il/get-started' : undefined,
    }, imports: { available: true } });
};
