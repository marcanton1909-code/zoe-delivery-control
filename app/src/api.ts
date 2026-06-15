// API client
// IMPORTANT: In production we use SAME-ORIGIN requests (/api/...) and Cloudflare Pages
// proxies them to the Worker through public/_redirects. This avoids mobile browser/CORS/cookie
// issues between *.pages.dev and *.workers.dev.
//
// To force an external API URL for local debugging only, set:
// VITE_FORCE_EXTERNAL_API=true
// VITE_API_BASE=https://zoe-delivery-api.marco-cruz.workers.dev
const EXTERNAL_API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const FORCE_EXTERNAL = import.meta.env.VITE_FORCE_EXTERNAL_API === 'true';
const API_BASE = FORCE_EXTERNAL ? EXTERNAL_API_BASE : '';
const TOKEN_KEY = 'zoe_delivery_token';
const USER_KEY = 'zoe_delivery_user';

export function saveToken(token?: string) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function saveUser(user?: any) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function endpoint(path: string): string {
  return `${API_BASE}${path}`;
}

export function fileUrl(key?: string | null): string {
  if (!key) return '#';
  const token = localStorage.getItem(TOKEN_KEY);
  const qs = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${API_BASE}/api/files/${encodeURIComponent(key)}${qs}`;
}

function friendlyNetworkError(error: any): Error {
  const msg = String(error?.message || error || '');
  if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('load failed')) {
    return new Error('No se pudo conectar con el API. Actualiza la página e intenta de nuevo. Si estás en celular, borra caché del sitio o vuelve a abrir la app.');
  }
  return error instanceof Error ? error : new Error(msg || 'Error de red');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(endpoint(path), {
      ...options,
      // We do not rely on cross-domain cookies. Authorization Bearer token is the primary session.
      credentials: 'same-origin',
      headers: options.body instanceof FormData
        ? { ...authHeader(), ...(options.headers as any || {}) }
        : { 'Content-Type': 'application/json', ...authHeader(), ...(options.headers || {}) },
    });

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      if (contentType.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error en la solicitud');
      }
      throw new Error(await res.text());
    }

    if (contentType.includes('application/json')) return (await res.json()) as T;
    return (await res.text()) as T;
  } catch (error: any) {
    throw friendlyNetworkError(error);
  }
}

export const api = {
  setup: async (body: any) => { const data: any = await request('/api/setup', { method: 'POST', body: JSON.stringify(body) }); saveToken(data.token); saveUser(data.user); return data; },
  login: async (email: string, password: string) => { const data: any = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: String(email || '').trim().toLowerCase(), password: String(password || '').trim() }) }); saveToken(data.token); saveUser(data.user); return data; },
  mobileAdminLogin: async (pin: string) => { const data: any = await request('/api/auth/mobile-admin', { method: 'POST', body: JSON.stringify({ email: 'marco.cruz@mackavi.com', pin }) }); saveToken(data.token); saveUser(data.user); return data; },
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
  vehicleChecklistReportUrl: (month: string) => `${API_BASE}/api/reports/vehicle-checklists?month=${month}`,
  inventoryProducts: (query = '') => request<{ products: any[] }>(`/api/inventory/products${query}`),
  createInventoryProduct: (body: any) => request('/api/inventory/products', { method: 'POST', body: JSON.stringify(body) }),
  updateInventoryProduct: (id: string, body: any) => request(`/api/inventory/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateInventoryStock: (id: string, body: any) => request(`/api/inventory/products/${id}/stock`, { method: 'POST', body: JSON.stringify(body) }),
  inventoryMovements: (query = '') => request<{ movements: any[] }>(`/api/inventory/movements${query}`),
  inventoryReportUrl: () => `${API_BASE}/api/reports/inventory`,
  deliver: (id: string, form: FormData) => request(`/api/orders/${id}/deliver`, { method: 'POST', body: form }),
  reopen: (id: string, reason: string) => request(`/api/orders/${id}/reopen`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reportUrl: (month: string) => `${API_BASE}/api/reports/monthly?month=${month}`,
};
