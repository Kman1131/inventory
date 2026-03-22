import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import type { Location } from '../../types';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const locations = db.prepare('SELECT * FROM locations ORDER BY zone ASC').all() as Location[];
    res.json({ success: true, data: locations });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { zone, aisle, bin } = req.body;
    if (!zone) {
      res.status(400).json({ success: false, error: 'zone is required' });
      return;
    }
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO locations (id, zone, aisle, bin, created_at) VALUES (?, ?, ?, ?, ?)').run(
      id, zone, aisle ?? null, bin ?? null, now
    );
    const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(id) as Location;
    res.status(201).json({ success: true, data: location });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id) as Location | undefined;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Location not found' });
      return;
    }
    const { zone, aisle, bin } = req.body;
    db.prepare('UPDATE locations SET zone = ?, aisle = ?, bin = ? WHERE id = ?').run(
      zone ?? existing.zone,
      aisle !== undefined ? aisle : existing.aisle,
      bin !== undefined ? bin : existing.bin,
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id) as Location;
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const result = db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      res.status(404).json({ success: false, error: 'Location not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
