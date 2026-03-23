import express from 'express';
import cors from 'cors';
import { requireApiKey } from './middleware/auth';
import itemsRouter from './routes/items';
import categoriesRouter from './routes/categories';
import locationsRouter from './routes/locations';
import transactionsRouter from './routes/transactions';
import reportsRouter from './routes/reports';
import suppliersRouter from './routes/suppliers';
import purchaseOrdersRouter from './routes/purchaseOrders';
import appSettingsRouter from './routes/settings';
import itemLocationsRouter from './routes/itemLocations';
import transfersRouter from './routes/transfers';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Public health check — no auth required
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Inventory API is running', timestamp: new Date().toISOString() });
});

// All routes below require API key
app.use(requireApiKey);

app.use('/items', itemsRouter);
app.use('/categories', categoriesRouter);
app.use('/locations', locationsRouter);
app.use('/transactions', transactionsRouter);
app.use('/reports', reportsRouter);
app.use('/suppliers', suppliersRouter);
app.use('/purchase-orders', purchaseOrdersRouter);
app.use('/settings', appSettingsRouter);
app.use('/item-locations', itemLocationsRouter);
app.use('/transfers', transfersRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  const apiKey = process.env.API_KEY || 'inventory-secret-key';
  console.log(`\n  Inventory API running on http://0.0.0.0:${PORT}`);
  console.log(`  API Key: ${apiKey}`);
  console.log(`  Health:  http://localhost:${PORT}/health\n`);
});

export default app;
