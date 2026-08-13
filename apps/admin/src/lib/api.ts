export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.clothinary.cloudpunch.in/api';

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  // Only send a JSON content-type when there's a body — otherwise every GET
  // becomes a non-simple CORS request and pays for an OPTIONS preflight.
  const hasBody = options.body != null;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    cache: 'no-store',
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data as T;
}

/** Multipart upload (images) — does not set JSON content-type. */
export async function uploadFiles(files: FileList): Promise<{ url: string; publicId: string }[]> {
  const fd = new FormData();
  Array.from(files).forEach((f) => fd.append('images', f));
  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    credentials: 'include',
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Upload failed');
  return data.images;
}
