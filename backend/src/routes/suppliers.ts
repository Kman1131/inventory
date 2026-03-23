import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import type { Supplier } from '../../types';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all() as Supplier[];
    res.json({ success: true, data: suppliers });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id) as Supplier | undefined;
    if (!supplier) {
      res.status(404).json({ success: false, error: 'Supplier not found' });
      return;
    }
    res.json({ success: true, data: supplier });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { name, contact_name, email, phone, address, notes } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: 'name is required' });
      return;
    }
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO suppliers (id, name, contact_name, email, phone, address, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, contact_name ?? null, email ?? null, phone ?? null, address ?? null, notes ?? null, now, now);
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as Supplier;
    res.status(201).json({ success: true, data: supplier });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('UNIQUE constraint')) {
      res.status(409).json({ success: false, error: 'Supplier name already exists' });
    } else {
      res.status(500).json({ success: false, error: msg });
    }
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id) as Supplier | undefined;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Supplier not found' });
      return;
    }
    const { name, contact_name, email, phone, address, notes } = req.body;
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE suppliers SET name = ?, contact_name = ?, email = ?, phone = ?, address = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      name ?? existing.name,
      contact_name !== undefined ? contact_name : existing.contact_name,
      email !== undefined ? email : existing.email,
      phone !== undefined ? phone : existing.phone,
      address !== undefined ? address : existing.address,
      notes !== undefined ? notes : existing.notes,
      now,
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id) as Supplier;
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const result = db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      res.status(404).json({ success: false, error: 'Supplier not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
