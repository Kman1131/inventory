import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/api';

interface ConfigState {
  serverIp: string;
  serverPort: string;
  apiKey: string;
  isLoaded: boolean;
}

interface ConfigActions {
  setServerIp: (ip: string) => Promise<void>;
  setServerPort: (port: string) => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
}

export function useConfig(): ConfigState & ConfigActions {
  const [serverIp, setServerIpState] = useState('');
  const [serverPort, setServerPortState] = useState('');
  const [apiKey, setApiKeyState] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [[, ip], [, port], [, key]] = await AsyncStorage.multiGet([
          STORAGE_KEYS.SERVER_IP,
          STORAGE_KEYS.SERVER_PORT,
          STORAGE_KEYS.API_KEY,
        ]);
        setServerIpState(ip ?? '');
        setServerPortState(port ?? '');
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

  const setServerPort = useCallback(async (port: string) => {
    await AsyncStorage.setItem(STORAGE_KEYS.SERVER_PORT, port);
    setServerPortState(port);
  }, []);

  const setApiKey = useCallback(async (key: string) => {
    await AsyncStorage.setItem(STORAGE_KEYS.API_KEY, key);
    setApiKeyState(key);
  }, []);

  return { serverIp, serverPort, apiKey, isLoaded, setServerIp, setServerPort, setApiKey };
}
