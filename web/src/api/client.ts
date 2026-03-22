import axios from 'axios';
import type {
  ApiResponse, InventoryItem, Category, Location, Transaction,
  ItemFormData, CategoryFormData, LocationFormData, TransactionFormData,
} from '../types';

export const STORAGE_KEYS = {
  API_URL: 'inv_api_url',
  API_KEY: 'inv_api_key',
} as const;

export function getSettings() {
  return {
    apiUrl: localStorage.getItem(STORAGE_KEYS.API_URL) ?? 'http://localhost:3000',
    apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY) ?? 'inventory-secret-key',
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
  if (!res.data.success || res.data.data === undefined) {
    throw new Error(res.data.error ?? 'Unknown API error');
  }
  return res.data.data;
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
      device_id: 'web',
    })),

  // ── Reports ────────────────────────────────────────────────────────────────
  getReportUrl: () => {
    const { apiUrl, apiKey } = getSettings();
    return `${apiUrl}/reports/stock?apikey=${encodeURIComponent(apiKey)}`;
  },
};
