import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/api';

interface ConfigState {
  serverIp: string;
  apiKey: string;
  isLoaded: boolean;
}

interface ConfigActions {
  setServerIp: (ip: string) => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
}

export function useConfig(): ConfigState & ConfigActions {
  const [serverIp, setServerIpState] = useState('');
  const [apiKey, setApiKeyState] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [[, ip], [, key]] = await AsyncStorage.multiGet([
          STORAGE_KEYS.SERVER_IP,
          STORAGE_KEYS.API_KEY,
        ]);
        setServerIpState(ip ?? '');
        setApiKeyState(key ?? '');
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  const setServerIp = useCallback(async (ip: string) => {
    await AsyncStorage.setItem(STORAGE_KEYS.SERVER_IP, ip);
    setServerIpState(ip);
  }, []);

  const setApiKey = useCallback(async (key: string) => {
    await AsyncStorage.setItem(STORAGE_KEYS.API_KEY, key);
    setApiKeyState(key);
  }, []);

  return { serverIp, apiKey, isLoaded, setServerIp, setApiKey };
}
