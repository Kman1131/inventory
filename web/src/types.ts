export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export interface Location {
  id: string;
  zone: string;
  aisle: string | null;
  bin: string | null;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  quantity: number;
  min_threshold: number;
  price: number;
  category_id: string | null;
  location_id: string | null;
  qr_code_data: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields from list queries
  category_name?: string;
  location_zone?: string;
  location_aisle?: string;
  location_bin?: string;
}

export type TransactionType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface Transaction {
  id: string;
  item_id: string;
  type: TransactionType;
  quantity_delta: number;
  notes: string | null;
  device_id: string | null;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type ItemFormData = {
  sku: string;
  name: string;
  description: string;
  quantity: number;
  min_threshold: number;
  price: number;
  category_id: string;
  location_id: string;
};

export type CategoryFormData = {
  name: string;
  parent_id: string;
};

export type LocationFormData = {
  zone: string;
  aisle: string;
  bin: string;
};

export type TransactionFormData = {
  type: TransactionType;
  quantity_delta: number;
  notes: string;
};
