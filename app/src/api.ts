const API_BASE = (import.meta.env.VITE_API_BASE || 'https://zoe-delivery-api.marco-cruz.workers.dev').replace(/\/$/, '');
const TOKEN_KEY = 'zoe_delivery_token';
const LEGACY_TOKEN_KEY = 'token';

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY) || '';
}

export function saveToken(token?: string) {
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(LEGACY_TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function withTokenQuery(url: string): string {
  const token = getToken();
  if (!token) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

export function fileUrl(key?: string | null): string {
  if (!key) return '#';
  return withTokenQuery(`${API_BASE}/api/files/${encodeURIComponent(key)}`);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      credentials: 'omit',
      mode: 'cors',
    });
  } catch (err: any) {
    throw new Error(
      'No se pudo conectar con el API. Revisa que el Worker esté desplegado, que VITE_API_BASE apunte a https://zoe-delivery-api.marco-cruz.workers.dev y que el celular no tenga una versión vieja instalada.'
    );
  }

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await res.json().catch(() => ({}))
    : await res.text().catch(() => '');

  if (!res.ok) {
    const message = typeof data === 'string' ? data : data?.error || data?.message || 'Error en la solicitud';
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  setup: async (body: any) => { const data: any = await request('/api/setup', { method: 'POST', body: JSON.stringify(body) }); saveToken(data.token); return data; },
  login: async (email: string, password: string) => { const data: any = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), password: password.trim() }) }); saveToken(data.token); return data; },
  logout: async () => { const data = await request('/api/auth/logout', { method: 'POST' }); clearToken(); return data; },
  me: () => request<{ user: any }>('/api/auth/me'),
  dashboard: () => request<any>('/api/dashboard'),
  users: (role?: string) => request<{ users: any[] }>(`/api/users${role ? `?role=${role}` : ''}`),
  createUser: (body: any) => request('/api/users', { method: 'POST', body: JSON.stringify(body) }),

  customers: (query = '') => request<{ customers: any[] }>(`/api/customers${query}`),
  customer: (id: string) => request<{ customer: any; orders: any[] }>(`/api/customers/${id}`),
  routes: () => request<{ routes: any[] }>('/api/routes'),
  createRoute: (body: any) => request('/api/routes', { method: 'POST', body: JSON.stringify(body) }),
  orders: (query = '') => request<{ orders: any[] }>(`/api/orders${query}`),
  order: (id: string) => request<any>(`/api/orders/${id}`),
  createOrder: (form: FormData) => request('/api/orders', { method: 'POST', body: form }),
  extractOrderPdf: (form: FormData) => request<any>('/api/orders/extract-pdf', { method: 'POST', body: form }),
  updateOrder: (id: string, body: any) => request(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  validateLoad: (id: string, body: any) => request(`/api/orders/${id}/validate-load`, { method: 'POST', body: JSON.stringify(body) }),
  startRoute: (id: string) => request(`/api/orders/${id}/start-route`, { method: 'POST' }),
  vehicleChecklists: (query = '') => request<{ checklists: any[] }>(`/api/vehicle-checklists${query}`),
  createVehicleChecklist: (form: FormData) => request('/api/vehicle-checklists', { method: 'POST', body: form }),
  vehicleChecklistReportUrl: (month: string) => withTokenQuery(`${API_BASE}/api/reports/vehicle-checklists?month=${encodeURIComponent(month)}`),
  inventoryProducts: (query = '') => request<{ products: any[] }>(`/api/inventory/products${query}`),
  createInventoryProduct: (body: any) => request('/api/inventory/products', { method: 'POST', body: JSON.stringify(body) }),
  updateInventoryProduct: (id: string, body: any) => request(`/api/inventory/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateInventoryStock: (id: string, body: any) => request(`/api/inventory/products/${id}/stock`, { method: 'POST', body: JSON.stringify(body) }),
  inventoryMovements: (query = '') => request<{ movements: any[] }>(`/api/inventory/movements${query}`),
  inventoryReportUrl: () => withTokenQuery(`${API_BASE}/api/reports/inventory`),
  deliver: (id: string, form: FormData) => request(`/api/orders/${id}/deliver`, { method: 'POST', body: form }),
  reopen: (id: string, reason: string) => request(`/api/orders/${id}/reopen`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reportUrl: (month: string) => withTokenQuery(`${API_BASE}/api/reports/monthly?month=${encodeURIComponent(month)}`),
};

export { API_BASE };
