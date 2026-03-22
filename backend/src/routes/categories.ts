import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import type { Category } from '../../types';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all() as Category[];
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { name, parent_id } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: 'name is required' });
      return;
    }
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO categories (id, name, parent_id, created_at) VALUES (?, ?, ?, ?)').run(
      id, name, parent_id ?? null, now
    );
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category;
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('UNIQUE constraint')) {
      res.status(409).json({ success: false, error: 'Category name already exists' });
    } else {
      res.status(500).json({ success: false, error: msg });
    }
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id) as Category | undefined;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }
    const { name, parent_id } = req.body;
    db.prepare('UPDATE categories SET name = ?, parent_id = ? WHERE id = ?').run(
      name ?? existing.name,
      parent_id !== undefined ? parent_id : existing.parent_id,
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id) as Category;
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const result = db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
