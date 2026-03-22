import { Request, Response, NextFunction } from 'express';

const API_KEY = process.env.API_KEY || 'inventory-secret-key';

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  // Accept key from header (standard) or query param (for direct download URLs like PDF)
  const key = (req.headers['x-api-key'] as string | undefined) ?? (req.query['apikey'] as string | undefined);
  if (!key || key !== API_KEY) {
    res.status(401).json({ success: false, error: 'Invalid or missing API key' });
    return;
  }
  next();
}
