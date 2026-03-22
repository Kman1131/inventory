import { Router, Request, Response } from 'express';
import { generateStockReport } from '../utils/reportGen';

const router = Router();

// GET /reports/stock — stream PDF stock report
router.get('/stock', async (_req: Request, res: Response) => {
  try {
    await generateStockReport(res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }
});

export default router;
