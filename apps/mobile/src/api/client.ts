import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '@/store/authStore';

const baseURL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${baseURL}/api/v1`,
  timeout: 15_000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ message?: string }>) => {
    // Session expiry → sign out locally; navigation reacts to the store change.
    if (error.response?.status === 401 && useAuthStore.getState().token) {
      useAuthStore.getState().signOut();
    }
    const message =
      error.response?.data?.message ??
      (error.code === 'ECONNABORTED' || !error.response
        ? 'Network issue — check your connection and try again.'
        : 'Something went wrong.');
    return Promise.reject(Object.assign(error, { friendlyMessage: message }));
  },
);

export const getErrorMessage = (err: unknown): string =>
  (err as { friendlyMessage?: string })?.friendlyMessage ?? 'Something went wrong.';
