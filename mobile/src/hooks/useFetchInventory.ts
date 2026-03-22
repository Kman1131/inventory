import { useState, useCallback } from 'react';
import { apiGet } from '../config/api';
import type { InventoryItem } from '../types';

interface FetchInventoryResult {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useFetchInventory(endpoint: string = '/items'): FetchInventoryResult {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<InventoryItem[]>(endpoint);
      setItems(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  return { items, loading, error, refresh };
}
