import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage on every client request.
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiError {
  message: string;
}

/** True when the request never reached the server (server down / unreachable / CORS). */
export const isNetworkError = (err: unknown): boolean =>
  axios.isAxiosError(err) && !err.response;

export const getErrorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    // No response = the API server could not be reached (down, wrong URL, CORS).
    if (!err.response) {
      return 'Cannot reach the server. Please make sure the backend is running and try again.';
    }
    return err.response?.data?.message || err.message;
  }
  return 'Something went wrong. Please try again.';
};
