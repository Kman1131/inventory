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
