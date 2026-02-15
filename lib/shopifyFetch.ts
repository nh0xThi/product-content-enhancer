type FetchOptions = Omit<RequestInit, 'headers'> & { headers?: HeadersInit };

const getSessionToken = async () => {
  if (typeof window === 'undefined') return null;
  try {
    const token = await window.shopify?.idToken?.();
    return token || null;
  } catch {
    return null;
  }
};

export const fetchWithSessionToken = async (input: RequestInfo, options: FetchOptions = {}) => {
  const token = await getSessionToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...options, headers });
};
