const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8787';

export function fileUrl(key?: string | null): string {
  if (!key) return '#';
  return `${API_BASE}/api/files/${encodeURIComponent(key)}`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: options.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...(options.headers || {}) },
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
}

export const api = {
  setup: (body: any) => request('/api/setup', { method: 'POST', body: JSON.stringify(body) }),
  login: (email: string, password: string) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ user: any }>('/api/auth/me'),
  dashboard: () => request<any>('/api/dashboard'),
  users: (role?: string) => request<{ users: any[] }>(`/api/users${role ? `?role=${role}` : ''}`),
  createUser: (body: any) => request('/api/users', { method: 'POST', body: JSON.stringify(body) }),
  routes: () => request<{ routes: any[] }>('/api/routes'),
  createRoute: (body: any) => request('/api/routes', { method: 'POST', body: JSON.stringify(body) }),
  orders: (query = '') => request<{ orders: any[] }>(`/api/orders${query}`),
  order: (id: string) => request<any>(`/api/orders/${id}`),
  createOrder: (form: FormData) => request('/api/orders', { method: 'POST', body: form }),
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
