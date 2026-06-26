export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type FetchOptions = RequestInit & { auth?: boolean };

/**
 * Thin fetch wrapper. Sends cookies (credentials) for auth and unwraps
 * the API's { success, ... } envelope, throwing on failure.
 */
export async function api<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
  const { auth, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    cache: rest.cache ?? 'no-store',
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data as T;
}

/** Server-side safe fetch that never throws — returns a fallback instead. */
export async function safeApi<T>(path: string, fallback: T, revalidate = 60): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: { revalidate },
    });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}
