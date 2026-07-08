export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * URL used for server-side (SSR/ISR) fetches. In containerized deploys the
 * browser reaches the API at NEXT_PUBLIC_API_URL while the Next.js server
 * reaches it over the internal network — set INTERNAL_API_URL for that case.
 */
const SERVER_API_URL = process.env.INTERNAL_API_URL || API_URL;

type FetchOptions = RequestInit & { auth?: boolean };

/**
 * Thin fetch wrapper. Sends cookies (credentials) for auth and unwraps
 * the API's { success, ... } envelope, throwing on failure.
 */
/** Broadcast API reachability so a UI banner can surface connection problems. */
function signal(status: 'online' | 'offline') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nova-api-status', { detail: status }));
  }
}

export async function api<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
  const { auth, headers, ...rest } = options;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      cache: rest.cache ?? 'no-store',
    });
  } catch {
    // Network-level failure (server down / connection refused / CORS).
    signal('offline');
    throw new Error(
      `Can't reach the server at ${API_URL}. Make sure the backend is running (npm run dev:backend) and MongoDB is up.`
    );
  }
  signal('online');

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
    const res = await fetch(`${SERVER_API_URL}${path}`, {
      next: { revalidate },
    });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}
