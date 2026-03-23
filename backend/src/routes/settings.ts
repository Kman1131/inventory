import { Router, Request, Response } from 'express';
import db from '../db';
import type { AppSetting } from '../../types';

const router = Router();

// GET /settings
router.get('/', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM app_settings ORDER BY key ASC').all() as AppSetting[];
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /settings — upsert one or more key/value pairs
router.post('/', (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, string>;
    if (typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ success: false, error: 'Body must be a key/value object' });
      return;
    }

    const upsert = db.prepare(
      'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );
    const upsertAll = db.transaction(() => {
      for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'string') upsert.run(key, value);
      }
    });
    upsertAll();

    const rows = db.prepare('SELECT * FROM app_settings ORDER BY key ASC').all() as AppSetting[];
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
