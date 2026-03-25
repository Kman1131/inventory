import axios from 'axios';
import type {
  ApiResponse, InventoryItem, Category, Location, Transaction,
  ItemFormData, CategoryFormData, LocationFormData, TransactionFormData,
  Supplier, SupplierFormData, PurchaseOrder, POFormData,
  ItemLocation, StockTransfer, TransferFormData,
} from '../types';

export const STORAGE_KEYS = {
  API_URL: 'inv_api_url',
  API_KEY: 'inv_api_key',
} as const;

const DEFAULT_API_URL = (import.meta.env.VITE_API_URL?.trim() || '/api').replace(/\/$/, '');
const DEFAULT_API_KEY = 'inventory-secret-key';

export function getSettings() {
  const storedApiUrl = localStorage.getItem(STORAGE_KEYS.API_URL)?.trim();
  const storedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY)?.trim();

  return {
    apiUrl: storedApiUrl || DEFAULT_API_URL,
    apiKey: storedApiKey || DEFAULT_API_KEY,
  };
}

function client() {
  const { apiUrl, apiKey } = getSettings();
  return axios.create({
    baseURL: apiUrl,
    headers: { 'x-api-key': apiKey },
  });
}

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const res = await promise;
  if (!res.data.success) {
    throw new Error(res.data.error ?? 'Unknown API error');
  }
  return res.data.data as T;
}

export const api = {
  // ── Health ─────────────────────────────────────────────────────────────────
  health: () => client().get<{ success: boolean; message: string }>('/health'),

  // ── Items ──────────────────────────────────────────────────────────────────
  getItems:     () => unwrap<InventoryItem[]>(client().get('/items')),
  getLowStock:  () => unwrap<InventoryItem[]>(client().get('/items/low-stock')),
  getItem:      (id: string) => unwrap<InventoryItem>(client().get(`/items/${id}`)),
  createItem:   (data: Partial<ItemFormData>) => unwrap<InventoryItem>(client().post('/items', data)),
  updateItem:   (id: string, data: Partial<ItemFormData>) => unwrap<InventoryItem>(client().put(`/items/${id}`, data)),
  deleteItem:   (id: string) => client().delete(`/items/${id}`),

  // ── Categories ─────────────────────────────────────────────────────────────
  getCategories:  () => unwrap<Category[]>(client().get('/categories')),
  createCategory: (data: CategoryFormData) => unwrap<Category>(client().post('/categories', {
    name: data.name,
    parent_id: data.parent_id || null,
  })),
  updateCategory: (id: string, data: CategoryFormData) => unwrap<Category>(client().put(`/categories/${id}`, {
    name: data.name,
    parent_id: data.parent_id || null,
  })),
  deleteCategory: (id: string) => client().delete(`/categories/${id}`),

  // ── Locations ──────────────────────────────────────────────────────────────
  getLocations:  () => unwrap<Location[]>(client().get('/locations')),
  createLocation: (data: LocationFormData) => unwrap<Location>(client().post('/locations', {
    zone: data.zone,
    aisle: data.aisle || null,
    bin: data.bin || null,
  })),
  updateLocation: (id: string, data: LocationFormData) => unwrap<Location>(client().put(`/locations/${id}`, {
    zone: data.zone,
    aisle: data.aisle || null,
    bin: data.bin || null,
  })),
  deleteLocation: (id: string) => client().delete(`/locations/${id}`),

  // ── Transactions ───────────────────────────────────────────────────────────
  getTransactions: (itemId: string) => unwrap<Transaction[]>(client().get(`/transactions/${itemId}`)),
  createTransaction: (itemId: string, data: TransactionFormData) =>
    unwrap<Transaction>(client().post('/transactions', {
      item_id: itemId,
      type: data.type,
      quantity_delta: data.quantity_delta,
      notes: data.notes || null,
      location_id: data.location_id || null,
      job_number: data.job_number || null,
      device_id: 'web',
    })),

  // ── Reports ────────────────────────────────────────────────────────────────
  getReportUrl: () => {
    const { apiUrl, apiKey } = getSettings();
    return `${apiUrl}/reports/stock?apikey=${encodeURIComponent(apiKey)}`;
  },
  getReplenishmentUrl: (locationId?: string) => {
    const { apiUrl, apiKey } = getSettings();
    const qs = locationId ? `location_id=${encodeURIComponent(locationId)}&` : '';
    return `${apiUrl}/reports/replenishment?${qs}apikey=${encodeURIComponent(apiKey)}`;
  },
  // ── Suppliers ──────────────────────────────────────────────────────────────
  getSuppliers:    () => unwrap<Supplier[]>(client().get('/suppliers')),
  getSupplier:     (id: string) => unwrap<Supplier>(client().get(`/suppliers/${id}`)),
  createSupplier:  (data: SupplierFormData) => unwrap<Supplier>(client().post('/suppliers', data)),
  updateSupplier:  (id: string, data: Partial<SupplierFormData>) => unwrap<Supplier>(client().put(`/suppliers/${id}`, data)),
  deleteSupplier:  (id: string) => client().delete(`/suppliers/${id}`),

  // ── Purchase Orders ────────────────────────────────────────────────────────
  getPurchaseOrders:     () => unwrap<PurchaseOrder[]>(client().get('/purchase-orders')),
  getPurchaseOrder:      (id: string) => unwrap<PurchaseOrder>(client().get(`/purchase-orders/${id}`)),
  createPurchaseOrder:   (data: POFormData) => unwrap<PurchaseOrder>(client().post('/purchase-orders', data)),
  autoGeneratePOs:       () => unwrap<PurchaseOrder[]>(client().post('/purchase-orders/auto-generate', {})),
  updatePurchaseOrder:   (id: string, data: Partial<{ status: string; notes: string; supplier_id: string }>) =>
    unwrap<PurchaseOrder>(client().put(`/purchase-orders/${id}`, data)),
  deletePurchaseOrder:   (id: string) => client().delete(`/purchase-orders/${id}`),
  sendPOEmail:           (id: string) => unwrap<{ message: string }>(client().post(`/purchase-orders/${id}/send-email`, {})),
  getPOPdfUrl:           (id: string) => {
    const { apiUrl, apiKey } = getSettings();
    return `${apiUrl}/purchase-orders/${id}/pdf?apikey=${encodeURIComponent(apiKey)}`;
  },
  receivePurchaseOrder:  (id: string) => unwrap<{ po: PurchaseOrder; transactions_created: number }>(client().post(`/purchase-orders/${id}/receive`, {})),

  // ── Labels ─────────────────────────────────────────────────────────────────
  getLabelsUrl: (ids: string[]) => {
    const { apiUrl, apiKey } = getSettings();
    return `${apiUrl}/reports/labels?ids=${ids.join(',')}&apikey=${encodeURIComponent(apiKey)}`;
  },
  getAllLabelsUrl: () => {
    const { apiUrl, apiKey } = getSettings();
    return `${apiUrl}/reports/labels?all=1&apikey=${encodeURIComponent(apiKey)}`;
  },
  getUnassignedItems: () => unwrap<InventoryItem[]>(client().get('/items?unassigned=1')),

  // ── App Settings (SMTP etc) ────────────────────────────────────────────────
  getAppSettings:  () => unwrap<Record<string, string>>(client().get('/settings')),
  saveAppSettings: (data: Record<string, string>) => unwrap<Record<string, string>>(client().post('/settings', data)),

  // ── Item Locations ─────────────────────────────────────────────────────────
  getItemLocations: (itemId: string) => unwrap<ItemLocation[]>(client().get(`/item-locations/${itemId}`)),
  getItemLocationQRs: (itemId: string) => unwrap<{ location_id: string; zone: string; aisle: string | null; bin: string | null; quantity: number; qr_data: string }[]>(client().get(`/items/${itemId}/location-qrs`)),

  // ── Transfers ──────────────────────────────────────────────────────────────
  getTransfers:     () => unwrap<StockTransfer[]>(client().get('/transfers')),
  getItemTransfers: (itemId: string) => unwrap<StockTransfer[]>(client().get(`/transfers/item/${itemId}`)),
  createTransfer:   (data: TransferFormData) => unwrap<StockTransfer>(client().post('/transfers', data)),
};
