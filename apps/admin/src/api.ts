import axios from 'axios';

/**
 * Admin panel API client. Sign in by pasting an admin JWT (issued via the
 * mobile OTP flow for an admin-role account) — stored in localStorage.
 */
export const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('savora-admin-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const setAdminToken = (token: string) =>
  localStorage.setItem('savora-admin-token', token);

export const getAdminToken = () => localStorage.getItem('savora-admin-token');
