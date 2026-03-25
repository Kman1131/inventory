import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  SERVER_IP: '@server_ip',
  SERVER_PORT: '@server_port',
  API_KEY: '@api_key',
} as const;

export const DEFAULT_PORT = '3000';

let apiInstance: AxiosInstance | null = null;

export async function getApiBaseUrl(): Promise<string> {
  const [[, ip], [, port]] = await AsyncStorage.multiGet([
    STORAGE_KEYS.SERVER_IP,
    STORAGE_KEYS.SERVER_PORT,
  ]);

  const serverIp = ip?.trim() || '192.168.1.100';
  const serverPort = port?.trim() || DEFAULT_PORT;

  return `http://${serverIp}:${serverPort}`;
}

export async function getApiClient(): Promise<AxiosInstance> {
  const [baseUrl, apiKey] = await Promise.all([
    getApiBaseUrl(),
    AsyncStorage.getItem(STORAGE_KEYS.API_KEY),
  ]);

  const key = apiKey?.trim() ?? '';

  apiInstance = axios.create({
    baseURL: baseUrl,
    headers: {
      'x-api-key': key,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

  return apiInstance;
}

// Convenience typed request helpers
export async function apiGet<T>(path: string): Promise<T> {
  const client = await getApiClient();
  const response = await client.get<{ success: boolean; data: T; error?: string }>(path);
  if (!response.data.success) throw new Error(response.data.error ?? 'Request failed');
  return response.data.data as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const client = await getApiClient();
  const response = await client.post<{ success: boolean; data: T; error?: string }>(path, body);
  if (!response.data.success) throw new Error(response.data.error ?? 'Request failed');
  return response.data.data as T;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const client = await getApiClient();
  const response = await client.put<{ success: boolean; data: T; error?: string }>(path, body);
  if (!response.data.success) throw new Error(response.data.error ?? 'Request failed');
  return response.data.data as T;
}

export async function apiDelete(path: string): Promise<void> {
  const client = await getApiClient();
  await client.delete(path);
}

// ── Items ────────────────────────────────────────────────────────────────────
import type {
  InventoryItem, Category, Location, Supplier, Transaction, PurchaseOrder, PurchaseOrderItem, ItemLocation,
} from '../types';

export const itemsApi = {
  list:   () => apiGet<InventoryItem[]>('/items'),
  get:    (id: string) => apiGet<InventoryItem>(`/items/${id}`),
  create: (data: Partial<InventoryItem>) => apiPost<InventoryItem>('/items', data),
  update: (id: string, data: Partial<InventoryItem>) => apiPut<InventoryItem>(`/items/${id}`, data),
  remove: (id: string) => apiDelete(`/items/${id}`),
};

// ── Categories ───────────────────────────────────────────────────────────────
export const categoriesApi = {
  list:   () => apiGet<Category[]>('/categories'),
  create: (data: { name: string; parent_id?: string | null }) => apiPost<Category>('/categories', data),
  update: (id: string, data: { name: string; parent_id?: string | null }) => apiPut<Category>(`/categories/${id}`, data),
  remove: (id: string) => apiDelete(`/categories/${id}`),
};

// ── Locations ────────────────────────────────────────────────────────────────
export const locationsApi = {
  list:   () => apiGet<Location[]>('/locations'),
  create: (data: { zone: string; aisle?: string | null; bin?: string | null; parent_id?: string | null }) =>
    apiPost<Location>('/locations', data),
  update: (id: string, data: { zone: string; aisle?: string | null; bin?: string | null; parent_id?: string | null }) =>
    apiPut<Location>(`/locations/${id}`, data),
  remove: (id: string) => apiDelete(`/locations/${id}`),
};

// ── Suppliers ────────────────────────────────────────────────────────────────
export const suppliersApi = {
  list:   () => apiGet<Supplier[]>('/suppliers'),
  get:    (id: string) => apiGet<Supplier>(`/suppliers/${id}`),
  create: (data: Partial<Supplier>) => apiPost<Supplier>('/suppliers', data),
  update: (id: string, data: Partial<Supplier>) => apiPut<Supplier>(`/suppliers/${id}`, data),
  remove: (id: string) => apiDelete(`/suppliers/${id}`),
};

// ── Transactions ───────────────────────────────────────────────────────────────
export const transactionsApi = {
  list: (itemId: string) => apiGet<Transaction[]>(`/transactions/${itemId}`),
  create: (data: { item_id: string; type: string; quantity_delta: number; notes?: string; device_id?: string; location_id?: string | null }) =>
    apiPost<Transaction>('/transactions', data),
};

// ── Purchase Orders ──────────────────────────────────────────────────────────
export const purchaseOrdersApi = {
  list:   () => apiGet<PurchaseOrder[]>('/purchase-orders'),
  get:    (id: string) => apiGet<PurchaseOrder>(`/purchase-orders/${id}`),
  create: (data: { supplier_id?: string | null; notes?: string; items: { sku: string; name: string; quantity_ordered: number; unit_price: number; item_id?: string }[] }) =>
    apiPost<PurchaseOrder>('/purchase-orders', data),
  update: (id: string, data: { status?: string; notes?: string; supplier_id?: string | null }) =>
    apiPut<PurchaseOrder>(`/purchase-orders/${id}`, data),
  remove: (id: string) => apiDelete(`/purchase-orders/${id}`),
  autoGenerate: () => apiPost<PurchaseOrder[]>('/purchase-orders/auto-generate', {}),
  sendEmail: (id: string) => apiPost<{ message: string }>(`/purchase-orders/${id}/send-email`, {}),  receive: (id: string) => apiPost<{ po: PurchaseOrder; transactions_created: number }>(`/purchase-orders/${id}/receive`, {}),
};

// ── Item Locations ──────────────────────────────────────────────────────────────────
export const itemLocationsApi = {
  list: (itemId: string) => apiGet<ItemLocation[]>(`/item-locations/${itemId}`),
  getLocationQRs: (itemId: string) => apiGet<{ location_id: string; zone: string; aisle: string | null; bin: string | null; quantity: number; qr_data: string }[]>(`/items/${itemId}/location-qrs`),
};
