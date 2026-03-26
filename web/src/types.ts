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
  parent_id: string | null;
  created_at: string;
  // Joined from parent
  parent_zone?: string | null;
  parent_aisle?: string | null;
  parent_bin?: string | null;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  quantity: number;
  min_threshold: number;
  order_qty: number | null;
  price: number;
  category_id: string | null;
  location_id: string | null;
  qr_code_data: string | null;
  created_at: string;
  updated_at: string;
  supplier_id?: string | null;
  // Joined fields from list queries
  category_name?: string;
  location_zone?: string;
  location_aisle?: string;
  location_bin?: string;
  supplier_name?: string;
  locations_label?: string | null;
}

export type TransactionType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface Transaction {
  id: string;
  item_id: string;
  type: TransactionType;
  quantity_delta: number;
  notes: string | null;
  device_id: string | null;
  location_id: string | null;
  job_number: string | null;
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
  order_qty: number | null;
  price: number;
  category_id: string;
  location_id: string;
  supplier_id: string;
};

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'received' | 'cancelled';

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  item_id: string | null;
  sku: string;
  name: string;
  quantity_ordered: number;
  unit_price: number;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string | null;
  status: PurchaseOrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  supplier_name?: string;
  supplier_email?: string;
  items?: PurchaseOrderItem[];
}

export type SupplierFormData = {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
};

export type POItemFormData = {
  item_id: string;
  sku: string;
  name: string;
  quantity_ordered: number;
  unit_price: number;
};

export type POFormData = {
  supplier_id: string;
  notes: string;
  items: POItemFormData[];
};

export interface ItemLocation {
  id: string;
  item_id: string;
  location_id: string;
  quantity: number;
  min_qty: number;
  updated_at: string;
  zone?: string;
  aisle?: string | null;
  bin?: string | null;
  item_name?: string;
  item_sku?: string;
}

export interface StockTransfer {
  id: string;
  item_id: string;
  from_location_id: string | null;
  to_location_id: string | null;
  quantity: number;
  notes: string | null;
  created_at: string;
  item_name?: string;
  item_sku?: string;
  from_zone?: string | null;
  from_aisle?: string | null;
  from_bin?: string | null;
  to_zone?: string | null;
  to_aisle?: string | null;
  to_bin?: string | null;
}

export type TransferFormData = {
  item_id: string;
  from_location_id: string;
  to_location_id: string;
  quantity: number;
  notes: string;
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
  location_id: string | null;
  job_number: string | null;
};
