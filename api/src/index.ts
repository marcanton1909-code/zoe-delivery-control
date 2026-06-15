import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type Role = 'admin' | 'coordinador' | 'almacen' | 'repartidor';
type FuelLevel = 'tanque_lleno' | 'tres_cuartos' | 'medio_tanque' | 'un_cuarto' | 'reserva';

type OrderStatus =
  | 'pendiente_validacion'
  | 'programada'
  | 'cargada'
  | 'carga_incompleta'
  | 'en_ruta'
  | 'entregada'
  | 'parcial'
  | 'no_entregada'
  | 'rechazada'
  | 'cancelada';

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  RESEND_API_KEY?: string;
  JWT_SECRET?: string;
  ALLOWED_ORIGIN?: string;
  MAIL_FROM?: string;
  MAIL_COORDINACION?: string;
  APP_NAME?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: number;
}

interface VehicleChecklistRow {
  id: string;
  checklist_date: string;
  vehicle: string;
  route_id: string | null;
  driver_id: string | null;
  reviewer_name: string;
  mileage: number;
  fuel_level: FuelLevel;
  tires_ok: number;
  spare_tire_ok: number;
  mileage_photo_key: string | null;
  fuel_photo_key: string | null;
  tires_photo_key: string | null;
  spare_tire_photo_key: string | null;
  comments: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  route_name?: string | null;
  driver_name?: string | null;
  created_by_name?: string | null;
}


interface InventoryProductRow {
  id: string;
  sku: string | null;
  name: string;
  category: string | null;
  unit: string;
  presentation: string | null;
  min_stock: number;
  current_stock: number;
  active: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  created_by_name?: string | null;
}

interface InventoryMovementRow {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  product_name?: string | null;
  sku?: string | null;
  created_by_name?: string | null;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  quantity: number;
  description: string;
  unit_price: number;
  amount: number;
  sort_order: number;
}


interface CustomerRow {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  delivery_address: string | null;
  delivery_references: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  total_orders?: number;
  last_order_at?: string | null;
  packages_delivered?: number;
}

interface ParsedOrderDraft {
  zoe_folio?: string;
  customer_company?: string;
  customer_name?: string;
  customer_contact_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  delivery_reference?: string;
  payment_note?: string;
  order_total?: number;
  packages_expected?: number;
  items?: OrderItemRow[];
}

interface OrderRow {
  id: string;
  customer_id?: string | null;
  zoe_folio: string;
  order_date: string | null;
  scheduled_delivery_date: string | null;
  customer_company: string | null;
  customer_name: string;
  customer_contact_name: string | null;
  customer_email: string | null;
  customer_address: string;
  customer_phone: string | null;
  delivery_reference: string | null;
  payment_note: string | null;
  order_total: number | null;
  packages_expected: number;
  packages_loaded: number;
  packages_delivered: number;
  status: OrderStatus;
  route_id: string | null;
  driver_id: string | null;
  vehicle: string | null;
  original_pdf_key: string | null;
  signed_pdf_key: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  route_name?: string | null;
  driver_name?: string | null;
  items?: OrderItemRow[];
}

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' };
const finalStatuses = ['entregada', 'parcial', 'no_entregada', 'rechazada', 'cancelada'];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return withCors(request, env, new Response(null, { status: 204 }));

    try {
      let response: Response;

      if (url.pathname === '/health') response = json({ ok: true, name: env.APP_NAME || 'Zoé Delivery Control' });
      else if (url.pathname === '/api/install' && (request.method === 'GET' || request.method === 'POST')) response = await installSchema(env);
      else if (url.pathname === '/api/setup' && request.method === 'POST') response = await setupAdmin(request, env);
      else if (url.pathname === '/api/auth/login' && request.method === 'POST') response = await login(request, env);
      else if (url.pathname === '/api/auth/logout' && request.method === 'POST') response = await logout(request, env);
      else if (url.pathname === '/api/auth/me' && request.method === 'GET') response = await me(request, env);
      else if (url.pathname === '/api/dashboard' && request.method === 'GET') response = await dashboard(request, env);
      else if (url.pathname === '/api/users' && request.method === 'GET') response = await listUsers(request, env);
      else if (url.pathname === '/api/users' && request.method === 'POST') response = await createUser(request, env);
      else if (url.pathname === '/api/customers' && request.method === 'GET') response = await listCustomers(request, env);
      else if (url.pathname.match(/^\/api\/customers\/[^/]+$/) && request.method === 'GET') response = await getCustomer(request, env);
      else if (url.pathname === '/api/routes' && request.method === 'GET') response = await listRoutes(request, env);
      else if (url.pathname === '/api/routes' && request.method === 'POST') response = await createRoute(request, env);
      else if (url.pathname === '/api/orders' && request.method === 'GET') response = await listOrders(request, env);
      else if (url.pathname === '/api/orders' && request.method === 'POST') response = await createOrder(request, env);
      else if (url.pathname === '/api/orders/extract-pdf' && request.method === 'POST') response = await extractOrderPdf(request, env);
      else if (url.pathname === '/api/vehicle-checklists' && request.method === 'GET') response = await listVehicleChecklists(request, env);
      else if (url.pathname === '/api/vehicle-checklists' && request.method === 'POST') response = await createVehicleChecklist(request, env);
      else if (url.pathname === '/api/inventory/products' && request.method === 'GET') response = await listInventoryProducts(request, env);
      else if (url.pathname === '/api/inventory/products' && request.method === 'POST') response = await createInventoryProduct(request, env);
      else if (url.pathname.match(/^\/api\/inventory\/products\/[^/]+$/) && request.method === 'PATCH') response = await updateInventoryProduct(request, env);
      else if (url.pathname.match(/^\/api\/inventory\/products\/[^/]+\/stock$/) && request.method === 'POST') response = await updateInventoryStock(request, env);
      else if (url.pathname === '/api/inventory/movements' && request.method === 'GET') response = await listInventoryMovements(request, env);
      else if (url.pathname === '/api/reports/inventory' && request.method === 'GET') response = await inventoryReport(request, env);
      else if (url.pathname === '/api/reports/vehicle-checklists' && request.method === 'GET') response = await vehicleChecklistReport(request, env);
      else if (url.pathname === '/api/reports/monthly' && request.method === 'GET') response = await monthlyReport(request, env);
      else if (url.pathname.startsWith('/api/files/') && request.method === 'GET') response = await getFile(request, env);
      else if (url.pathname.match(/^\/api\/orders\/[^/]+$/) && request.method === 'GET') response = await getOrder(request, env);
      else if (url.pathname.match(/^\/api\/orders\/[^/]+$/) && request.method === 'PATCH') response = await updateOrder(request, env);
      else if (url.pathname.match(/^\/api\/orders\/[^/]+\/validate-load$/) && request.method === 'POST') response = await validateLoad(request, env);
      else if (url.pathname.match(/^\/api\/orders\/[^/]+\/start-route$/) && request.method === 'POST') response = await startRoute(request, env);
      else if (url.pathname.match(/^\/api\/orders\/[^/]+\/deliver$/) && request.method === 'POST') response = await deliverOrder(request, env);
      else if (url.pathname.match(/^\/api\/orders\/[^/]+\/reopen$/) && request.method === 'POST') response = await reopenOrder(request, env);
      else response = json({ error: 'Ruta no encontrada' }, 404);

      return withCors(request, env, response);
    } catch (error: any) {
      console.error(error);
      return withCors(request, env, json({ error: error?.message || 'Error interno' }, error?.status || 500));
    }
  },
};

function withCors(request: Request, env: Env, response: Response): Response {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const allowOrigin = allowed.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1') ? origin : allowed[0] || origin;

  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', allowOrigin);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Vary', 'Origin');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

async function parseJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error('JSON inválido');
  }
}

async function setupAdmin(request: Request, env: Env): Promise<Response> {
  // Instalación simple: si las tablas no existen, las crea automáticamente.
  // Además, si el correo ya existe, actualiza ese usuario como admin activo y cambia su contraseña.
  await ensureSchema(env);

  const body = await parseJson<{ name: string; email: string; password: string }>(request);
  requireString(body.name, 'name');
  requireEmail(body.email);
  requirePassword(body.password);

  const email = body.email.trim().toLowerCase();
  const name = body.name.trim();
  const passwordHash = await hashPassword(body.password);
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>();
  const id = existing?.id || crypto.randomUUID();

  if (existing?.id) {
    await env.DB.prepare(
      `UPDATE users SET name = ?, password_hash = ?, role = 'admin', active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(name, passwordHash, id).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO users (id, name, email, password_hash, role, active) VALUES (?, ?, ?, ?, 'admin', 1)`
    ).bind(id, name, email, passwordHash).run();
  }

  // Crea sesión automáticamente para que no tengas que hacer login aparte.
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<any>();
  const token = randomToken();
  const tokenHash = await sha256(token);
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();

  await env.DB.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
    .bind(sessionId, id, tokenHash, expiresAt)
    .run();

  const response = json({ ok: true, user: publicUser(user), token, message: 'Admin creado/actualizado e inicio de sesión listo.' });
  response.headers.append('Set-Cookie', buildSessionCookie(request, token, expiresAt));
  return response;
}

async function installSchema(env: Env): Promise<Response> {
  await ensureSchema(env);
  return json({ ok: true, message: 'Base de datos instalada/verificada correctamente.' });
}

async function ensureSchema(env: Env): Promise<void> {
  const statements = SCHEMA_SQL
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await env.DB.prepare(statement).run();
  }
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'coordinador', 'almacen', 'repartidor')),
  phone TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  zone TEXT,
  default_driver_id TEXT,
  default_vehicle TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(default_driver_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  company_name TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  delivery_address TEXT,
  delivery_references TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_name);
CREATE INDEX IF NOT EXISTS idx_customers_contact ON customers(contact_name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE TABLE IF NOT EXISTS customer_orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  order_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_customer_orders_customer ON customer_orders(customer_id);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  zoe_folio TEXT UNIQUE NOT NULL,
  order_date TEXT,
  scheduled_delivery_date TEXT,
  customer_company TEXT,
  customer_name TEXT NOT NULL,
  customer_contact_name TEXT,
  customer_email TEXT,
  customer_address TEXT NOT NULL,
  customer_phone TEXT,
  delivery_reference TEXT,
  payment_note TEXT,
  order_total REAL DEFAULT 0,
  packages_expected INTEGER NOT NULL DEFAULT 0,
  packages_loaded INTEGER NOT NULL DEFAULT 0,
  packages_delivered INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendiente_validacion' CHECK(status IN ('pendiente_validacion','programada','cargada','carga_incompleta','en_ruta','entregada','parcial','no_entregada','rechazada','cancelada')),
  route_id TEXT,
  driver_id TEXT,
  vehicle TEXT,
  original_pdf_key TEXT,
  signed_pdf_key TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(route_id) REFERENCES routes(id),
  FOREIGN KEY(driver_id) REFERENCES users(id),
  FOREIGN KEY(created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_delivery_date ON orders(scheduled_delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_route ON orders(route_id);
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  unit_price REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE TABLE IF NOT EXISTS load_validations (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  packages_expected INTEGER NOT NULL,
  packages_loaded INTEGER NOT NULL,
  validation_result TEXT NOT NULL CHECK(validation_result IN ('completa', 'incompleta', 'bloqueada')),
  comments TEXT,
  validated_by TEXT,
  validated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(validated_by) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS delivery_evidence (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  receiver_name TEXT,
  signature_key TEXT,
  photo_key TEXT,
  gps_lat REAL,
  gps_lng REAL,
  delivered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivery_result TEXT NOT NULL CHECK(delivery_result IN ('completa', 'parcial', 'no_entregada', 'rechazada')),
  packages_delivered INTEGER NOT NULL DEFAULT 0,
  comments TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_evidence_order ON delivery_evidence(order_id);
CREATE INDEX IF NOT EXISTS idx_evidence_delivered_at ON delivery_evidence(delivered_at);
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  type TEXT NOT NULL CHECK(type IN ('cliente_ausente','direccion_incorrecta','pedido_incompleto','rechazo_cliente','unidad_con_problema','otro')),
  description TEXT,
  photo_key TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(created_by) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS vehicle_checklists (
  id TEXT PRIMARY KEY,
  checklist_date TEXT NOT NULL,
  vehicle TEXT NOT NULL,
  route_id TEXT,
  driver_id TEXT,
  reviewer_name TEXT NOT NULL,
  mileage INTEGER NOT NULL,
  fuel_level TEXT NOT NULL CHECK(fuel_level IN ('tanque_lleno', 'tres_cuartos', 'medio_tanque', 'un_cuarto', 'reserva')),
  tires_ok INTEGER NOT NULL DEFAULT 1,
  spare_tire_ok INTEGER NOT NULL DEFAULT 1,
  mileage_photo_key TEXT,
  fuel_photo_key TEXT,
  tires_photo_key TEXT,
  spare_tire_photo_key TEXT,
  comments TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(route_id) REFERENCES routes(id),
  FOREIGN KEY(driver_id) REFERENCES users(id),
  FOREIGN KEY(created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_vehicle_checklists_date ON vehicle_checklists(checklist_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_checklists_vehicle ON vehicle_checklists(vehicle);
CREATE TABLE IF NOT EXISTS inventory_products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'pieza',
  presentation TEXT,
  min_stock INTEGER NOT NULL DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_inventory_products_active ON inventory_products(active);
CREATE INDEX IF NOT EXISTS idx_inventory_products_name ON inventory_products(name);
CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  movement_type TEXT NOT NULL CHECK(movement_type IN ('inicial', 'entrada', 'salida', 'ajuste')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reference TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(product_id) REFERENCES inventory_products(id) ON DELETE CASCADE,
  FOREIGN KEY(created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON inventory_movements(created_at);
`;

const DEFAULT_ADMIN_EMAIL = 'marco.cruz@mackavi.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin1234!';
const DEFAULT_ADMIN_NAME = 'Marco Cruz';

async function login(request: Request, env: Env): Promise<Response> {
  const body = await parseJson<{ email: string; password: string }>(request);
  const email = body.email?.trim().toLowerCase();
  const password = body.password || '';

  // Acceso inicial simplificado: si se intenta entrar con el admin definido,
  // la API crea/verifica tablas, crea o repara el usuario admin y abre sesión.
  // Esto evita usar curl o insertar usuarios manualmente en D1.
  if (email === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASSWORD) {
    return upsertDefaultAdminAndLogin(request, env);
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ? AND active = 1').bind(email).first<any>();
  if (!user) return json({ error: 'Correo o contraseña incorrectos' }, 401);

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return json({ error: 'Correo o contraseña incorrectos' }, 401);

  return createLoginSession(request, env, user);
}

async function upsertDefaultAdminAndLogin(request: Request, env: Env): Promise<Response> {
  await ensureSchema(env);

  const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(DEFAULT_ADMIN_EMAIL)
    .first<{ id: string }>();

  const id = existing?.id || 'admin-marco-cruz';

  if (existing?.id) {
    await env.DB.prepare(
      `UPDATE users
       SET name = ?, password_hash = ?, role = 'admin', active = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(DEFAULT_ADMIN_NAME, passwordHash, id).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO users (id, name, email, password_hash, role, active)
       VALUES (?, ?, ?, ?, 'admin', 1)`
    ).bind(id, DEFAULT_ADMIN_NAME, DEFAULT_ADMIN_EMAIL, passwordHash).run();
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<any>();
  return createLoginSession(request, env, user);
}

async function createLoginSession(request: Request, env: Env, user: any): Promise<Response> {
  const token = randomToken();
  const tokenHash = await sha256(token);
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();

  await env.DB.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
    .bind(sessionId, user.id, tokenHash, expiresAt)
    .run();

  const response = json({ ok: true, user: publicUser(user), token });
  response.headers.append('Set-Cookie', buildSessionCookie(request, token, expiresAt));
  return response;
}

async function logout(request: Request, env: Env): Promise<Response> {
  const token = getCookie(request, 'zoe_session');
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  const response = json({ ok: true });
  response.headers.append('Set-Cookie', 'zoe_session=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0');
  response.headers.append('Set-Cookie', 'zoe_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return response;
}

async function me(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env);
  return json({ user });
}

async function dashboard(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env);
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const filters = user.role === 'repartidor' ? ' AND driver_id = ? ' : '';
  const bind = user.role === 'repartidor' ? [user.id] : [];

  const byStatus = await env.DB.prepare(`SELECT status, COUNT(*) as total FROM orders WHERE 1=1 ${filters} GROUP BY status`)
    .bind(...bind)
    .all<{ status: string; total: number }>();

  const todayStats = await env.DB.prepare(
    `SELECT COUNT(*) as orders_today, COALESCE(SUM(packages_delivered),0) as packages_today FROM orders WHERE scheduled_delivery_date = ? ${filters}`
  )
    .bind(today, ...bind)
    .first<any>();

  const monthStats = await env.DB.prepare(
    `SELECT COUNT(*) as delivered_month, COALESCE(SUM(packages_delivered),0) as packages_month FROM orders WHERE substr(updated_at, 1, 7) = ? AND status IN ('entregada','parcial') ${filters}`
  )
    .bind(month, ...bind)
    .first<any>();

  const byDriver = await env.DB.prepare(
    `SELECT u.name as driver_name, COUNT(o.id) as total, COALESCE(SUM(o.packages_delivered),0) as packages
     FROM orders o LEFT JOIN users u ON u.id = o.driver_id
     WHERE o.status IN ('entregada','parcial') AND substr(o.updated_at,1,7)=?
     GROUP BY u.name ORDER BY total DESC LIMIT 10`
  ).bind(month).all();

  return json({
    today,
    month,
    byStatus: byStatus.results || [],
    todayStats,
    monthStats,
    byDriver: byDriver.results || [],
  });
}

async function listUsers(request: Request, env: Env): Promise<Response> {
  const user = await requireRole(request, env, ['admin', 'coordinador', 'almacen', 'repartidor']);
  const url = new URL(request.url);
  const role = url.searchParams.get('role');
  let sql = 'SELECT id, name, email, role, phone, active, created_at FROM users WHERE 1=1';
  const params: string[] = [];
  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }
  if (user.role === 'repartidor') {
    sql += ' AND id = ?';
    params.push(user.id);
  }
  sql += ' ORDER BY name ASC';
  const rows = await env.DB.prepare(sql).bind(...params).all();
  await audit(env, user.id, 'list_users', 'users', null, null);
  return json({ users: rows.results || [] });
}

async function createUser(request: Request, env: Env): Promise<Response> {
  const actor = await requireRole(request, env, ['admin']);
  const body = await parseJson<{ name: string; email: string; password: string; role: Role; phone?: string }>(request);
  requireString(body.name, 'name');
  requireEmail(body.email);
  requirePassword(body.password);
  if (!['admin', 'coordinador', 'almacen', 'repartidor'].includes(body.role)) throw new Error('Rol inválido');

  const id = crypto.randomUUID();
  const hash = await hashPassword(body.password);
  await env.DB.prepare(
    'INSERT INTO users (id, name, email, password_hash, role, phone, active) VALUES (?, ?, ?, ?, ?, ?, 1)'
  )
    .bind(id, body.name.trim(), body.email.trim().toLowerCase(), hash, body.role, body.phone || null)
    .run();
  await audit(env, actor.id, 'create_user', 'users', id, JSON.stringify({ email: body.email, role: body.role }));
  return json({ ok: true, user: { id, name: body.name, email: body.email.toLowerCase(), role: body.role } }, 201);
}


async function listCustomers(request: Request, env: Env): Promise<Response> {
  await requireRole(request, env, ['admin', 'coordinador', 'almacen']);
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  const params: any[] = [];
  let where = '1=1';
  if (q) {
    where += ` AND (LOWER(c.company_name) LIKE ? OR LOWER(c.contact_name) LIKE ? OR LOWER(c.email) LIKE ? OR c.phone LIKE ? OR LOWER(c.delivery_address) LIKE ?)`;
    const like = `%${q.toLowerCase()}%`;
    params.push(like, like, like, `%${q.replace(/\D/g, '') || q}%`, like);
  }

  const rows = await env.DB.prepare(
    `SELECT c.*,
            COUNT(co.order_id) as total_orders,
            MAX(o.updated_at) as last_order_at,
            COALESCE(SUM(CASE WHEN o.status IN ('entregada','parcial') THEN o.packages_delivered ELSE 0 END),0) as packages_delivered
     FROM customers c
     LEFT JOIN customer_orders co ON co.customer_id = c.id
     LEFT JOIN orders o ON o.id = co.order_id
     WHERE ${where}
     GROUP BY c.id
     ORDER BY COALESCE(MAX(o.updated_at), c.updated_at) DESC
     LIMIT 500`
  ).bind(...params).all<CustomerRow>();

  return json({ customers: rows.results || [] });
}

async function getCustomer(request: Request, env: Env): Promise<Response> {
  await requireRole(request, env, ['admin', 'coordinador', 'almacen']);
  const id = new URL(request.url).pathname.split('/')[3];
  const customer = await env.DB.prepare(
    `SELECT c.*,
            COUNT(co.order_id) as total_orders,
            MAX(o.updated_at) as last_order_at,
            COALESCE(SUM(CASE WHEN o.status IN ('entregada','parcial') THEN o.packages_delivered ELSE 0 END),0) as packages_delivered
     FROM customers c
     LEFT JOIN customer_orders co ON co.customer_id = c.id
     LEFT JOIN orders o ON o.id = co.order_id
     WHERE c.id = ?
     GROUP BY c.id`
  ).bind(id).first<CustomerRow>();
  if (!customer) return json({ error: 'Cliente no encontrado' }, 404);

  const orders = await env.DB.prepare(
    `SELECT o.*, r.name as route_name, u.name as driver_name
     FROM customer_orders co
     JOIN orders o ON o.id = co.order_id
     LEFT JOIN routes r ON r.id = o.route_id
     LEFT JOIN users u ON u.id = o.driver_id
     WHERE co.customer_id = ?
     ORDER BY COALESCE(o.scheduled_delivery_date, o.created_at) DESC
     LIMIT 200`
  ).bind(id).all<OrderRow>();

  return json({ customer, orders: orders.results || [] });
}

async function extractOrderPdf(request: Request, env: Env): Promise<Response> {
  const actor = await requireRole(request, env, ['admin', 'coordinador']);
  const form = await request.formData();
  const file = form.get('original_pdf');
  if (!(file instanceof File) || file.size <= 0) return json({ error: 'Sube un PDF de orden Zoé para extraer datos.' }, 400);
  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) return json({ error: 'El archivo debe ser PDF.' }, 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const tempFolio = `import-${Date.now()}`;
  const pdfKey = await putR2Bytes(env, `original-orders/${yearMonth()}/${safeName(file.name || tempFolio)}-${Date.now()}.pdf`, bytes, file.type || 'application/pdf');

  const extractedText = await extractTextFromPdfBytes(bytes);
  const draft = parseZoeOrderText(extractedText);
  const match = await findMatchingCustomer(env, draft);
  const confidence = scoreExtractedDraft(draft, extractedText);

  await audit(env, actor.id, 'extract_order_pdf', 'orders', null, JSON.stringify({ pdf_key: pdfKey, confidence }));
  return json({
    ok: true,
    pdf_key: pdfKey,
    draft,
    customer_match: match,
    confidence,
    raw_text_preview: extractedText.slice(0, 2500),
    notes: confidence < 50
      ? 'No se detectó suficiente texto. Si el PDF está escaneado o viene como imagen, corrige los campos manualmente antes de guardar.'
      : 'Datos extraídos. Revisa y corrige antes de guardar la orden.',
  });
}

async function listRoutes(request: Request, env: Env): Promise<Response> {
  await requireUser(request, env);
  const rows = await env.DB.prepare(
    `SELECT r.*, u.name as default_driver_name FROM routes r LEFT JOIN users u ON u.id = r.default_driver_id WHERE r.active = 1 ORDER BY r.name ASC`
  ).all();
  return json({ routes: rows.results || [] });
}

async function createRoute(request: Request, env: Env): Promise<Response> {
  const actor = await requireRole(request, env, ['admin', 'coordinador']);
  const body = await parseJson<{ name: string; zone?: string; default_driver_id?: string; default_vehicle?: string }>(request);
  requireString(body.name, 'name');
  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO routes (id, name, zone, default_driver_id, default_vehicle, active) VALUES (?, ?, ?, ?, ?, 1)'
  )
    .bind(id, body.name.trim(), body.zone || null, body.default_driver_id || null, body.default_vehicle || null)
    .run();
  await audit(env, actor.id, 'create_route', 'routes', id, JSON.stringify(body));
  return json({ ok: true, route: { id, ...body } }, 201);
}

async function listOrders(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env);
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');
  const driverId = url.searchParams.get('driver_id');

  const where: string[] = ['1=1'];
  const params: any[] = [];

  if (status) {
    where.push('o.status = ?');
    params.push(status);
  }
  if (dateFrom) {
    where.push('o.scheduled_delivery_date >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    where.push('o.scheduled_delivery_date <= ?');
    params.push(dateTo);
  }
  if (driverId && ['admin', 'coordinador', 'almacen'].includes(user.role)) {
    where.push('o.driver_id = ?');
    params.push(driverId);
  }
  if (user.role === 'repartidor') {
    where.push('o.driver_id = ?');
    params.push(user.id);
  }

  const rows = await env.DB.prepare(
    `SELECT o.*, co.customer_id as customer_id, r.name as route_name, u.name as driver_name
     FROM orders o
     LEFT JOIN customer_orders co ON co.order_id = o.id
     LEFT JOIN routes r ON r.id = o.route_id
     LEFT JOIN users u ON u.id = o.driver_id
     WHERE ${where.join(' AND ')}
     ORDER BY COALESCE(o.scheduled_delivery_date, o.created_at) DESC, o.created_at DESC
     LIMIT 500`
  )
    .bind(...params)
    .all<OrderRow>();

  return json({ orders: rows.results || [] });
}

async function createOrder(request: Request, env: Env): Promise<Response> {
  const actor = await requireRole(request, env, ['admin', 'coordinador']);
  const form = await request.formData();
  const id = crypto.randomUUID();
  const zoeFolio = requiredForm(form, 'zoe_folio').trim();
  const customerName = requiredForm(form, 'customer_name');
  const customerAddress = requiredForm(form, 'customer_address');
  const packagesExpected = toInt(form.get('packages_expected'), 0);
  if (packagesExpected < 1) throw new Error('packages_expected debe ser mayor a 0');

  const duplicate = await env.DB.prepare('SELECT id FROM orders WHERE zoe_folio = ?').bind(zoeFolio).first<{ id: string }>();
  if (duplicate?.id) return json({ error: 'Ya existe una orden registrada con este folio Zoé. Revisa la orden existente o usa un folio diferente.' }, 409);

  const items = parseOrderItemsFromForm(form, packagesExpected);
  const orderTotal = parseNumberOrNull(form.get('order_total')) ?? items.reduce((sum, item) => sum + item.amount, 0);

  const file = form.get('original_pdf');
  let pdfKey: string | null = valueOrNull(form.get('original_pdf_key'));
  if (file instanceof File && file.size > 0) {
    pdfKey = await putR2(env, `original-orders/${yearMonth()}/${safeName(zoeFolio)}-${Date.now()}.pdf`, file, file.type || 'application/pdf');
  }

  const customerId = await upsertCustomerFromOrder(env, {
    company_name: valueOrNull(form.get('customer_company')),
    contact_name: valueOrNull(form.get('customer_contact_name')) || customerName.trim(),
    phone: valueOrNull(form.get('customer_phone')),
    email: valueOrNull(form.get('customer_email')),
    delivery_address: customerAddress.trim(),
    delivery_references: valueOrNull(form.get('delivery_reference')),
    notes: valueOrNull(form.get('notes')),
  }, actor.id);

  const status: OrderStatus = form.get('route_id') || form.get('driver_id') ? 'programada' : 'pendiente_validacion';

  const statements = [
    env.DB.prepare(
      `INSERT INTO orders (
        id, zoe_folio, order_date, scheduled_delivery_date, customer_company, customer_name,
        customer_contact_name, customer_email, customer_address, customer_phone, delivery_reference,
        payment_note, order_total, packages_expected, status, route_id, driver_id, vehicle,
        original_pdf_key, notes, created_by, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).bind(
      id,
      zoeFolio,
      valueOrNull(form.get('order_date')),
      valueOrNull(form.get('scheduled_delivery_date')),
      valueOrNull(form.get('customer_company')),
      customerName.trim(),
      valueOrNull(form.get('customer_contact_name')),
      valueOrNull(form.get('customer_email')),
      customerAddress.trim(),
      valueOrNull(form.get('customer_phone')),
      valueOrNull(form.get('delivery_reference')),
      valueOrNull(form.get('payment_note')),
      orderTotal,
      packagesExpected,
      status,
      valueOrNull(form.get('route_id')),
      valueOrNull(form.get('driver_id')),
      valueOrNull(form.get('vehicle')),
      pdfKey,
      valueOrNull(form.get('notes')),
      actor.id
    ),
    ...items.map((item, index) => env.DB.prepare(
      'INSERT INTO order_items (id, order_id, quantity, description, unit_price, amount, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), id, item.quantity, item.description, item.unit_price, item.amount, index)),
  ];

  if (customerId) {
    statements.push(env.DB.prepare(
      'INSERT OR REPLACE INTO customer_orders (id, customer_id, order_id) VALUES (COALESCE((SELECT id FROM customer_orders WHERE order_id = ?), ?), ?, ?)'
    ).bind(id, crypto.randomUUID(), customerId, id));
  }

  await env.DB.batch(statements);
  await audit(env, actor.id, 'create_order', 'orders', id, JSON.stringify({ zoe_folio: zoeFolio, items: items.length }));
  return json({ ok: true, order: await fetchOrder(env, id) }, 201);
}

async function getOrder(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env);
  const id = getOrderId(request.url);
  const order = await fetchOrder(env, id);
  if (!order) return json({ error: 'Orden no encontrada' }, 404);
  if (user.role === 'repartidor' && order.driver_id !== user.id) return json({ error: 'No autorizado' }, 403);

  const evidence = await env.DB.prepare('SELECT * FROM delivery_evidence WHERE order_id = ? ORDER BY created_at DESC').bind(id).all();
  const validations = await env.DB.prepare('SELECT * FROM load_validations WHERE order_id = ? ORDER BY validated_at DESC').bind(id).all();
  return json({ order, evidence: evidence.results || [], validations: validations.results || [] });
}

async function updateOrder(request: Request, env: Env): Promise<Response> {
  const actor = await requireRole(request, env, ['admin', 'coordinador']);
  const id = getOrderId(request.url);
  const existing = await fetchOrder(env, id);
  if (!existing) return json({ error: 'Orden no encontrada' }, 404);
  if (finalStatuses.includes(existing.status)) return json({ error: 'La orden ya está finalizada. Reábrela antes de editar.' }, 409);

  const body = await parseJson<Record<string, any>>(request);
  const allowed = [
    'order_date',
    'scheduled_delivery_date',
    'customer_company',
    'customer_name',
    'customer_contact_name',
    'customer_email',
    'customer_address',
    'customer_phone',
    'delivery_reference',
    'payment_note',
    'order_total',
    'packages_expected',
    'route_id',
    'driver_id',
    'vehicle',
    'notes',
    'status',
  ];
  const updates: string[] = [];
  const params: any[] = [];
  for (const key of allowed) {
    if (key in body) {
      updates.push(`${key} = ?`);
      params.push(body[key] === '' ? null : body[key]);
    }
  }
  if (!updates.length) return json({ error: 'No hay campos para actualizar' }, 400);
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);
  await env.DB.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
  await audit(env, actor.id, 'update_order', 'orders', id, JSON.stringify(body));
  return json({ ok: true, order: await fetchOrder(env, id) });
}

async function validateLoad(request: Request, env: Env): Promise<Response> {
  const actor = await requireRole(request, env, ['admin', 'coordinador', 'almacen']);
  const id = getOrderId(request.url);
  const order = await fetchOrder(env, id);
  if (!order) return json({ error: 'Orden no encontrada' }, 404);
  if (finalStatuses.includes(order.status)) return json({ error: 'La orden ya está finalizada' }, 409);

  const body = await parseJson<{ packages_loaded: number; comments?: string; validation_result?: string }>(request);
  const loaded = Number(body.packages_loaded || 0);
  if (loaded < 0) return json({ error: 'Paquetes cargados inválidos' }, 400);
  let result = body.validation_result as string;
  if (!result) result = loaded >= order.packages_expected ? 'completa' : 'incompleta';
  if (!['completa', 'incompleta', 'bloqueada'].includes(result)) return json({ error: 'Resultado de validación inválido' }, 400);

  const newStatus: OrderStatus = result === 'completa' ? 'cargada' : result === 'bloqueada' ? 'carga_incompleta' : 'carga_incompleta';
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO load_validations (id, order_id, packages_expected, packages_loaded, validation_result, comments, validated_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), id, order.packages_expected, loaded, result, body.comments || null, actor.id),
    env.DB.prepare('UPDATE orders SET packages_loaded = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(loaded, newStatus, id),
  ]);

  await audit(env, actor.id, 'validate_load', 'orders', id, JSON.stringify({ loaded, result }));
  return json({ ok: true, order: await fetchOrder(env, id) });
}

async function startRoute(request: Request, env: Env): Promise<Response> {
  const actor = await requireRole(request, env, ['admin', 'coordinador', 'almacen']);
  const id = getOrderId(request.url);
  const order = await fetchOrder(env, id);
  if (!order) return json({ error: 'Orden no encontrada' }, 404);
  if (!order.driver_id) return json({ error: 'Asigna un repartidor antes de mandar a ruta' }, 400);
  if (!['cargada', 'programada'].includes(order.status)) return json({ error: 'La orden no está lista para ruta' }, 409);
  await env.DB.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind('en_ruta', id).run();
  await audit(env, actor.id, 'start_route', 'orders', id, null);
  return json({ ok: true, order: await fetchOrder(env, id) });
}

async function deliverOrder(request: Request, env: Env): Promise<Response> {
  const actor = await requireUser(request, env);
  const id = getOrderId(request.url);
  const order = await fetchOrder(env, id);
  if (!order) return json({ error: 'Orden no encontrada' }, 404);
  if (actor.role === 'repartidor' && order.driver_id !== actor.id) return json({ error: 'No autorizado para esta orden' }, 403);
  if (finalStatuses.includes(order.status)) return json({ error: 'La orden ya fue finalizada' }, 409);

  const form = await request.formData();
  const deliveryResult = (form.get('delivery_result') || 'completa').toString();
  if (!['completa', 'parcial', 'no_entregada', 'rechazada'].includes(deliveryResult)) return json({ error: 'Resultado inválido' }, 400);
  const packagesDelivered = toInt(form.get('packages_delivered'), 0);
  const comments = valueOrNull(form.get('comments'));
  const receiverName = valueOrNull(form.get('receiver_name'));

  if (deliveryResult === 'completa' || deliveryResult === 'parcial') {
    if (!receiverName) return json({ error: 'El nombre de quien recibe es obligatorio' }, 400);
    if (packagesDelivered < 1) return json({ error: 'Paquetes entregados debe ser mayor a 0' }, 400);
  }
  if (deliveryResult === 'parcial' && !comments) return json({ error: 'En entrega parcial el comentario es obligatorio' }, 400);
  if ((deliveryResult === 'no_entregada' || deliveryResult === 'rechazada') && !comments) return json({ error: 'El motivo/comentario es obligatorio' }, 400);

  const signature = form.get('signature');
  let signatureKey: string | null = null;
  if (signature instanceof File && signature.size > 0) {
    signatureKey = await putR2(env, `signatures/${yearMonth()}/${safeName(order.zoe_folio)}-${Date.now()}.png`, signature, signature.type || 'image/png');
  }
  if ((deliveryResult === 'completa' || deliveryResult === 'parcial') && !signatureKey) return json({ error: 'La firma es obligatoria' }, 400);

  const photo = form.get('photo');
  let photoKey: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    const ext = photo.type.includes('png') ? 'png' : 'jpg';
    photoKey = await putR2(env, `photos/${yearMonth()}/${safeName(order.zoe_folio)}-${Date.now()}.${ext}`, photo, photo.type || 'image/jpeg');
  }

  let finalStatus: OrderStatus = 'entregada';
  if (deliveryResult === 'parcial' || (deliveryResult === 'completa' && packagesDelivered < order.packages_expected)) finalStatus = 'parcial';
  if (deliveryResult === 'no_entregada') finalStatus = 'no_entregada';
  if (deliveryResult === 'rechazada') finalStatus = 'rechazada';

  const evidenceId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO delivery_evidence (
      id, order_id, receiver_name, signature_key, photo_key, gps_lat, gps_lng,
      delivery_result, packages_delivered, comments, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      evidenceId,
      id,
      receiverName,
      signatureKey,
      photoKey,
      parseNumberOrNull(form.get('gps_lat')),
      parseNumberOrNull(form.get('gps_lng')),
      deliveryResult,
      packagesDelivered,
      comments,
      actor.id
    )
    .run();

  const refreshedOrder = { ...(await fetchOrder(env, id))!, packages_delivered: packagesDelivered, status: finalStatus };
  const pdfBytes = await generateEvidencePdf(env, refreshedOrder, {
    receiver_name: receiverName,
    signature_key: signatureKey,
    photo_key: photoKey,
    delivery_result: deliveryResult,
    packages_delivered: packagesDelivered,
    comments,
    delivered_by: actor.name,
  });
  const signedPdfKey = await putR2Bytes(env, `signed-evidence/${yearMonth()}/${safeName(order.zoe_folio)}-evidence-${Date.now()}.pdf`, pdfBytes, 'application/pdf');

  await env.DB.prepare(
    'UPDATE orders SET status = ?, packages_delivered = ?, signed_pdf_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  )
    .bind(finalStatus, packagesDelivered, signedPdfKey, id)
    .run();

  await audit(env, actor.id, 'deliver_order', 'orders', id, JSON.stringify({ finalStatus, packagesDelivered }));
  await sendDeliveryEmail(env, await fetchOrder(env, id), deliveryResult, comments);

  return json({ ok: true, order: await fetchOrder(env, id), evidence_id: evidenceId, signed_pdf_key: signedPdfKey });
}


async function listVehicleChecklists(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env);
  const url = new URL(request.url);
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');
  const vehicle = url.searchParams.get('vehicle');
  const driverId = url.searchParams.get('driver_id');

  const where: string[] = ['1=1'];
  const params: any[] = [];

  if (dateFrom) {
    where.push('vc.checklist_date >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    where.push('vc.checklist_date <= ?');
    params.push(dateTo);
  }
  if (vehicle) {
    where.push('vc.vehicle LIKE ?');
    params.push(`%${vehicle}%`);
  }
  if (driverId && ['admin', 'coordinador', 'almacen'].includes(user.role)) {
    where.push('vc.driver_id = ?');
    params.push(driverId);
  }
  if (user.role === 'repartidor') {
    where.push('vc.driver_id = ?');
    params.push(user.id);
  }

  const rows = await env.DB.prepare(
    `SELECT vc.*, r.name as route_name, d.name as driver_name, u.name as created_by_name
     FROM vehicle_checklists vc
     LEFT JOIN routes r ON r.id = vc.route_id
     LEFT JOIN users d ON d.id = vc.driver_id
     LEFT JOIN users u ON u.id = vc.created_by
     WHERE ${where.join(' AND ')}
     ORDER BY vc.checklist_date DESC, vc.created_at DESC
     LIMIT 500`
  ).bind(...params).all<VehicleChecklistRow>();

  return json({ checklists: rows.results || [] });
}

async function createVehicleChecklist(request: Request, env: Env): Promise<Response> {
  const actor = await requireRole(request, env, ['admin', 'coordinador', 'almacen', 'repartidor']);
  const form = await request.formData();
  const id = crypto.randomUUID();
  const checklistDate = valueOrNull(form.get('checklist_date')) || new Date().toISOString().slice(0, 10);
  const vehicle = requiredForm(form, 'vehicle');
  const reviewerName = requiredForm(form, 'reviewer_name');
  const mileage = toInt(form.get('mileage'), -1);
  if (mileage < 0) return json({ error: 'El kilometraje debe ser un número válido' }, 400);

  const fuelLevel = requiredForm(form, 'fuel_level') as FuelLevel;
  if (!['tanque_lleno','tres_cuartos','medio_tanque','un_cuarto','reserva'].includes(fuelLevel)) {
    return json({ error: 'Nivel de tanque inválido' }, 400);
  }

  const driverId = valueOrNull(form.get('driver_id'));
  if (actor.role === 'repartidor' && driverId && driverId !== actor.id) return json({ error: 'No autorizado' }, 403);

  const savePhoto = async (field: string, suffix: string): Promise<string | null> => {
    const file = form.get(field);
    if (file instanceof File && file.size > 0) {
      const ext = file.type.includes('png') ? 'png' : 'jpg';
      return await putR2(env, `vehicle-checklists/${yearMonth()}/${safeName(vehicle)}-${suffix}-${Date.now()}.${ext}`, file, file.type || 'image/jpeg');
    }
    return null;
  };

  const mileagePhotoKey = await savePhoto('mileage_photo', 'kilometraje');
  const fuelPhotoKey = await savePhoto('fuel_photo', 'gasolina');
  const tiresPhotoKey = await savePhoto('tires_photo', 'llantas');
  const spareTirePhotoKey = await savePhoto('spare_tire_photo', 'refaccion');

  await env.DB.prepare(
    `INSERT INTO vehicle_checklists (
      id, checklist_date, vehicle, route_id, driver_id, reviewer_name, mileage, fuel_level,
      tires_ok, spare_tire_ok, mileage_photo_key, fuel_photo_key, tires_photo_key,
      spare_tire_photo_key, comments, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    checklistDate,
    vehicle.trim(),
    valueOrNull(form.get('route_id')),
    driverId || (actor.role === 'repartidor' ? actor.id : null),
    reviewerName.trim(),
    mileage,
    fuelLevel,
    form.get('tires_ok') === 'false' ? 0 : 1,
    form.get('spare_tire_ok') === 'false' ? 0 : 1,
    mileagePhotoKey,
    fuelPhotoKey,
    tiresPhotoKey,
    spareTirePhotoKey,
    valueOrNull(form.get('comments')),
    actor.id
  ).run();

  await audit(env, actor.id, 'create_vehicle_checklist', 'vehicle_checklists', id, JSON.stringify({ vehicle, checklistDate, mileage, fuelLevel }));
  return json({ ok: true, checklist: await fetchVehicleChecklist(env, id) }, 201);
}

async function vehicleChecklistReport(request: Request, env: Env): Promise<Response> {
  const user = await requireRole(request, env, ['admin', 'coordinador']);
  const url = new URL(request.url);
  const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);
  const rows = await env.DB.prepare(
    `SELECT vc.*, r.name as route_name, d.name as driver_name, u.name as created_by_name
     FROM vehicle_checklists vc
     LEFT JOIN routes r ON r.id = vc.route_id
     LEFT JOIN users d ON d.id = vc.driver_id
     LEFT JOIN users u ON u.id = vc.created_by
     WHERE substr(vc.checklist_date, 1, 7) = ?
     ORDER BY vc.checklist_date ASC, vc.created_at ASC`
  ).bind(month).all<any>();

  const headers = [
    'Fecha','Unidad','Ruta','Repartidor','Revisó','Kilometraje','Nivel tanque','Llantas OK','Refacción OK',
    'Foto kilometraje','Foto gasolina','Foto llantas','Foto refacción','Comentarios','Creado por'
  ];
  const baseUrl = new URL(request.url).origin;
  const csvRows = [headers.join(',')];
  for (const row of rows.results || []) {
    csvRows.push([
      row.checklist_date,
      row.vehicle,
      row.route_name,
      row.driver_name,
      row.reviewer_name,
      row.mileage,
      fuelLabel(row.fuel_level),
      row.tires_ok ? 'SI' : 'NO',
      row.spare_tire_ok ? 'SI' : 'NO',
      row.mileage_photo_key ? `${baseUrl}/api/files/${encodeURIComponent(row.mileage_photo_key)}` : '',
      row.fuel_photo_key ? `${baseUrl}/api/files/${encodeURIComponent(row.fuel_photo_key)}` : '',
      row.tires_photo_key ? `${baseUrl}/api/files/${encodeURIComponent(row.tires_photo_key)}` : '',
      row.spare_tire_photo_key ? `${baseUrl}/api/files/${encodeURIComponent(row.spare_tire_photo_key)}` : '',
      row.comments,
      row.created_by_name,
    ].map(csvEscape).join(','));
  }
  await audit(env, user.id, 'vehicle_checklist_report', 'reports', month, null);
  return new Response('\uFEFF' + csvRows.join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="bitacora-vehiculos-${month}.csv"`,
    },
  });
}

async function listInventoryProducts(request: Request, env: Env): Promise<Response> {
  await requireRole(request, env, ['admin', 'coordinador', 'almacen']);
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim();
  const includeInactive = url.searchParams.get('includeInactive') === 'true';
  const where: string[] = [];
  const params: any[] = [];
  if (!includeInactive) where.push('p.active = 1');
  if (q) {
    where.push('(p.name LIKE ? OR p.sku LIKE ? OR p.category LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const rows = await env.DB.prepare(
    `SELECT p.*, u.name as created_by_name
     FROM inventory_products p
     LEFT JOIN users u ON u.id = p.created_by
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY p.active DESC, p.name ASC
     LIMIT 1000`
  ).bind(...params).all<InventoryProductRow>();
  return json({ products: rows.results || [] });
}

async function createInventoryProduct(request: Request, env: Env): Promise<Response> {
  const actor = await requireRole(request, env, ['admin', 'coordinador', 'almacen']);
  const body = await parseJson<{ sku?: string; name: string; category?: string; unit?: string; presentation?: string; min_stock?: number; current_stock?: number; notes?: string }>(request);
  requireString(body.name, 'name');
  const id = crypto.randomUUID();
  const initialStock = Number(body.current_stock || 0);
  if (initialStock < 0) return json({ error: 'El inventario inicial no puede ser negativo' }, 400);
  const minStock = Number(body.min_stock || 0);
  if (minStock < 0) return json({ error: 'El stock mínimo no puede ser negativo' }, 400);

  await env.DB.prepare(
    `INSERT INTO inventory_products (id, sku, name, category, unit, presentation, min_stock, current_stock, notes, created_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind(
    id,
    cleanText(body.sku),
    body.name.trim(),
    cleanText(body.category),
    cleanText(body.unit) || 'pieza',
    cleanText(body.presentation),
    minStock,
    initialStock,
    cleanText(body.notes),
    actor.id
  ).run();

  if (initialStock > 0) {
    await env.DB.prepare(
      `INSERT INTO inventory_movements (id, product_id, movement_type, quantity, previous_stock, new_stock, reference, notes, created_by)
       VALUES (?, ?, 'alta_inicial', ?, 0, ?, 'Alta de producto', ?, ?)`
    ).bind(crypto.randomUUID(), id, initialStock, initialStock, cleanText(body.notes), actor.id).run();
  }

  await audit(env, actor.id, 'create_inventory_product', 'inventory_products', id, JSON.stringify({ sku: body.sku, name: body.name, initialStock }));
  return json({ ok: true, product: await fetchInventoryProduct(env, id) }, 201);
}

async function updateInventoryProduct(request: Request, env: Env): Promise<Response> {
  const actor = await requireRole(request, env, ['admin', 'coordinador', 'almacen']);
  const id = getInventoryProductId(request.url);
  const existing = await fetchInventoryProduct(env, id);
  if (!existing) return json({ error: 'Producto no encontrado' }, 404);
  const body = await parseJson<Record<string, any>>(request);
  const allowed = ['sku','name','category','unit','presentation','min_stock','notes','active'];
  const updates: string[] = [];
  const params: any[] = [];
  for (const key of allowed) {
    if (key in body) {
      if (key === 'name') requireString(String(body[key] || ''), 'name');
      updates.push(`${key} = ?`);
      params.push(body[key] === '' ? null : body[key]);
    }
  }
  if (!updates.length) return json({ error: 'No hay campos para actualizar' }, 400);
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);
  await env.DB.prepare(`UPDATE inventory_products SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
  await audit(env, actor.id, 'update_inventory_product', 'inventory_products', id, JSON.stringify(body));
  return json({ ok: true, product: await fetchInventoryProduct(env, id) });
}

async function updateInventoryStock(request: Request, env: Env): Promise<Response> {
  const actor = await requireRole(request, env, ['admin', 'coordinador', 'almacen']);
  const id = getInventoryProductId(request.url);
  const product = await fetchInventoryProduct(env, id);
  if (!product) return json({ error: 'Producto no encontrado' }, 404);
  const body = await parseJson<{ quantity: number; movement_type?: string; reference?: string; notes?: string }>(request);
  const quantity = Number(body.quantity);
  if (!Number.isFinite(quantity) || quantity < 0) return json({ error: 'La cantidad debe ser un número mayor o igual a cero' }, 400);
  const movementType = body.movement_type || 'conteo_fisico';
  if (!['conteo_fisico','entrada','salida','ajuste'].includes(movementType)) return json({ error: 'Tipo de movimiento inválido' }, 400);

  const previous = Number(product.current_stock || 0);
  let next = quantity;
  let movementQuantity = quantity - previous;
  if (movementType === 'entrada') { next = previous + quantity; movementQuantity = quantity; }
  if (movementType === 'salida') { next = previous - quantity; movementQuantity = -quantity; }
  if (next < 0) return json({ error: 'El inventario no puede quedar negativo' }, 400);

  await env.DB.prepare('UPDATE inventory_products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(next, id).run();
  await env.DB.prepare(
    `INSERT INTO inventory_movements (id, product_id, movement_type, quantity, previous_stock, new_stock, reference, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), id, movementType, movementQuantity, previous, next, cleanText(body.reference), cleanText(body.notes), actor.id).run();

  await audit(env, actor.id, 'update_inventory_stock', 'inventory_products', id, JSON.stringify({ movementType, previous, next }));
  return json({ ok: true, product: await fetchInventoryProduct(env, id) });
}

async function listInventoryMovements(request: Request, env: Env): Promise<Response> {
  await requireRole(request, env, ['admin', 'coordinador', 'almacen']);
  const url = new URL(request.url);
  const productId = url.searchParams.get('product_id');
  const month = url.searchParams.get('month');
  const where: string[] = ['1=1'];
  const params: any[] = [];
  if (productId) { where.push('m.product_id = ?'); params.push(productId); }
  if (month) { where.push('substr(m.created_at, 1, 7) = ?'); params.push(month); }
  const rows = await env.DB.prepare(
    `SELECT m.*, p.name as product_name, p.sku, u.name as created_by_name
     FROM inventory_movements m
     JOIN inventory_products p ON p.id = m.product_id
     LEFT JOIN users u ON u.id = m.created_by
     WHERE ${where.join(' AND ')}
     ORDER BY m.created_at DESC
     LIMIT 1000`
  ).bind(...params).all<InventoryMovementRow>();
  return json({ movements: rows.results || [] });
}

async function inventoryReport(request: Request, env: Env): Promise<Response> {
  const user = await requireRole(request, env, ['admin', 'coordinador']);
  const rows = await env.DB.prepare(
    `SELECT p.*, u.name as created_by_name
     FROM inventory_products p
     LEFT JOIN users u ON u.id = p.created_by
     ORDER BY p.active DESC, p.name ASC`
  ).all<any>();
  const headers = ['SKU','Producto','Categoría','Unidad','Presentación','Stock actual','Stock mínimo','Estatus','Observaciones','Actualizado'];
  const csvRows = [headers.join(',')];
  for (const row of rows.results || []) {
    csvRows.push([
      row.sku,
      row.name,
      row.category,
      row.unit,
      row.presentation,
      row.current_stock,
      row.min_stock,
      row.active ? 'Activo' : 'Inactivo',
      row.notes,
      row.updated_at,
    ].map(csvEscape).join(','));
  }
  await audit(env, user.id, 'inventory_report', 'reports', 'inventory', null);
  return new Response('\uFEFF' + csvRows.join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="inventario-productos.csv"',
    },
  });
}

async function reopenOrder(request: Request, env: Env): Promise<Response> {
  const actor = await requireRole(request, env, ['admin', 'coordinador']);
  const id = getOrderId(request.url);
  const body = await parseJson<{ reason: string }>(request);
  requireString(body.reason, 'reason');
  await env.DB.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind('en_ruta', id).run();
  await audit(env, actor.id, 'reopen_order', 'orders', id, JSON.stringify({ reason: body.reason }));
  return json({ ok: true, order: await fetchOrder(env, id) });
}

async function monthlyReport(request: Request, env: Env): Promise<Response> {
  const user = await requireRole(request, env, ['admin', 'coordinador']);
  const url = new URL(request.url);
  const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);
  const rows = await env.DB.prepare(
    `SELECT o.zoe_folio, o.scheduled_delivery_date, o.updated_at as fecha_entregada,
            o.customer_name, o.customer_address, r.name as route_name, u.name as driver_name,
            o.vehicle, o.packages_expected, o.packages_delivered, o.status,
            e.receiver_name, e.signature_key, e.photo_key, e.comments, o.signed_pdf_key
     FROM orders o
     LEFT JOIN routes r ON r.id = o.route_id
     LEFT JOIN users u ON u.id = o.driver_id
     LEFT JOIN delivery_evidence e ON e.order_id = o.id
     WHERE substr(o.updated_at, 1, 7) = ?
     ORDER BY o.updated_at ASC`
  )
    .bind(month)
    .all<any>();

  const headers = [
    'Folio Zoé',
    'Fecha programada',
    'Fecha entregada',
    'Cliente',
    'Dirección',
    'Ruta',
    'Repartidor',
    'Unidad',
    'Paquetes solicitados',
    'Paquetes entregados',
    'Estatus',
    'Nombre recibe',
    'Tiene firma',
    'Tiene foto',
    'Comentarios',
    'URL evidencia',
  ];
  const baseUrl = new URL(request.url).origin;
  const csvRows = [headers.join(',')];
  for (const row of rows.results || []) {
    csvRows.push(
      [
        row.zoe_folio,
        row.scheduled_delivery_date,
        row.fecha_entregada,
        row.customer_name,
        row.customer_address,
        row.route_name,
        row.driver_name,
        row.vehicle,
        row.packages_expected,
        row.packages_delivered,
        row.status,
        row.receiver_name,
        row.signature_key ? 'SI' : 'NO',
        row.photo_key ? 'SI' : 'NO',
        row.comments,
        row.signed_pdf_key ? `${baseUrl}/api/files/${encodeURIComponent(row.signed_pdf_key)}` : '',
      ]
        .map(csvEscape)
        .join(',')
    );
  }
  await audit(env, user.id, 'monthly_report', 'reports', month, null);
  return new Response('\uFEFF' + csvRows.join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="reporte-zoe-${month}.csv"`,
    },
  });
}

async function getFile(request: Request, env: Env): Promise<Response> {
  await requireUser(request, env);
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.replace('/api/files/', ''));
  if (!key || key.includes('..')) return json({ error: 'Archivo inválido' }, 400);
  const object = await env.BUCKET.get(key);
  if (!object) return json({ error: 'Archivo no encontrado' }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'private, max-age=60');
  return new Response(object.body, { headers });
}

async function requireUser(request: Request, env: Env): Promise<User> {
  const auth = request.headers.get('Authorization') || '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  const urlToken = new URL(request.url).searchParams.get('token') || '';
  const token = bearer || urlToken || getCookie(request, 'zoe_session');
  if (!token) throw httpError('Sesión requerida', 401);
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.role, u.active
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP AND u.active = 1`
  )
    .bind(tokenHash)
    .first<User>();
  if (!row) throw httpError('Sesión inválida o expirada', 401);
  return row;
}

async function requireRole(request: Request, env: Env, roles: Role[]): Promise<User> {
  const user = await requireUser(request, env);
  if (!roles.includes(user.role)) throw httpError('No autorizado', 403);
  return user;
}

function httpError(message: string, status: number): Error {
  const err: any = new Error(message);
  err.status = status;
  return err;
}

function parseOrderItemsFromForm(form: FormData, packagesExpected: number): OrderItemRow[] {
  const quantities = form.getAll('item_quantity');
  const descriptions = form.getAll('item_description');
  const unitPrices = form.getAll('item_unit_price');
  const amounts = form.getAll('item_amount');
  const items: OrderItemRow[] = [];

  for (let i = 0; i < descriptions.length; i++) {
    const description = valueOrNull(descriptions[i]) || 'Producto Zoé Water';
    const quantity = toInt(quantities[i] || '0', 0);
    const unitPrice = parseNumberOrNull(unitPrices[i] || '0') || 0;
    const amount = parseNumberOrNull(amounts[i] || '0') ?? quantity * unitPrice;
    if (quantity > 0 || description.trim()) {
      items.push({
        id: crypto.randomUUID(),
        order_id: '',
        quantity: quantity || 0,
        description,
        unit_price: unitPrice,
        amount,
        sort_order: i,
      });
    }
  }

  if (!items.length) {
    items.push({
      id: crypto.randomUUID(),
      order_id: '',
      quantity: packagesExpected,
      description: 'Paquetes de producto Zoé Water',
      unit_price: 0,
      amount: 0,
      sort_order: 0,
    });
  }

  return items;
}

async function fetchOrder(env: Env, id: string): Promise<OrderRow | null> {
  const order = await env.DB.prepare(
    `SELECT o.*, co.customer_id as customer_id, r.name as route_name, u.name as driver_name
     FROM orders o
     LEFT JOIN customer_orders co ON co.order_id = o.id
     LEFT JOIN routes r ON r.id = o.route_id
     LEFT JOIN users u ON u.id = o.driver_id
     WHERE o.id = ?`
  )
    .bind(id)
    .first<OrderRow>();
  if (!order) return null;
  try {
    const items = await env.DB.prepare(
      'SELECT id, order_id, quantity, description, unit_price, amount, sort_order FROM order_items WHERE order_id = ? ORDER BY sort_order ASC, created_at ASC'
    ).bind(id).all<OrderItemRow>();
    order.items = items.results || [];
  } catch {
    // Permite que la app siga leyendo órdenes viejas aunque aún no se aplique la migración 0004.
    order.items = [];
  }
  return order;
}



async function upsertCustomerFromOrder(env: Env, data: Partial<CustomerRow>, userId: string | null): Promise<string | null> {
  const contactName = cleanText(data.contact_name);
  const companyName = cleanText(data.company_name);
  const email = cleanEmail(data.email || null);
  const phone = cleanPhone(data.phone || null);
  const address = cleanText(data.delivery_address);
  const refs = cleanText(data.delivery_references);
  const notes = cleanText(data.notes);

  if (!contactName && !companyName && !email && !phone && !address) return null;

  const match = await findMatchingCustomer(env, {
    customer_company: companyName || undefined,
    customer_name: contactName || undefined,
    customer_email: email || undefined,
    customer_phone: phone || undefined,
    customer_address: address || undefined,
    delivery_reference: refs || undefined,
  });

  const id = match?.id || crypto.randomUUID();
  if (match?.id) {
    await env.DB.prepare(
      `UPDATE customers
       SET company_name = COALESCE(?, company_name),
           contact_name = COALESCE(?, contact_name),
           email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           delivery_address = COALESCE(?, delivery_address),
           delivery_references = COALESCE(?, delivery_references),
           notes = COALESCE(?, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(companyName, contactName, email, phone, address, refs, notes, id).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO customers (id, company_name, contact_name, email, phone, delivery_address, delivery_references, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, companyName, contactName, email, phone, address, refs, notes, userId).run();
  }
  return id;
}

async function findMatchingCustomer(env: Env, draft: ParsedOrderDraft): Promise<CustomerRow | null> {
  const email = cleanEmail(draft.customer_email || null);
  const phone = cleanPhone(draft.customer_phone || null);
  const company = cleanText(draft.customer_company || null);
  const name = cleanText(draft.customer_contact_name || draft.customer_name || null);

  if (email) {
    const row = await env.DB.prepare('SELECT * FROM customers WHERE LOWER(email) = LOWER(?) ORDER BY updated_at DESC LIMIT 1').bind(email).first<CustomerRow>();
    if (row) return row;
  }
  if (phone) {
    const row = await env.DB.prepare('SELECT * FROM customers WHERE phone = ? ORDER BY updated_at DESC LIMIT 1').bind(phone).first<CustomerRow>();
    if (row) return row;
  }
  if (company && name) {
    const row = await env.DB.prepare(
      'SELECT * FROM customers WHERE LOWER(company_name) = LOWER(?) AND LOWER(contact_name) = LOWER(?) ORDER BY updated_at DESC LIMIT 1'
    ).bind(company, name).first<CustomerRow>();
    if (row) return row;
  }
  return null;
}

async function extractTextFromPdfBytes(bytes: Uint8Array): Promise<string> {
  const binary = bytesToBinary(bytes);
  const pieces: string[] = [];

  // 1) Método anterior: PDFs sencillos con texto literal sin compresión.
  pieces.push(...extractPlainPdfText(binary));

  // 2) Método robusto para los PDFs reales de Zoé: streams FlateDecode + fuentes Identity-H + ToUnicode.
  // El archivo que descarga Zoé usa texto como <0001> Tj dentro de streams comprimidos, por eso no aparecía texto.
  try {
    const streams = await readPdfStreams(binary);
    const fontMaps = await buildFontUnicodeMaps(binary, streams);
    const contentText = extractTextFromContentStreams(streams, fontMaps);
    if (contentText.trim()) pieces.unshift(contentText);
  } catch (err: any) {
    pieces.push(`PDF_TEXT_EXTRACT_WARNING ${err?.message || String(err)}`);
  }

  // 3) Fallback: rescata fragmentos legibles no comprimidos. No es OCR, solo respaldo.
  const readable = binary
    .replace(/[\x00-\x08\x0E-\x1F\x7F-\xFF]+/g, ' ')
    .match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9@#$.,:;()\/\- ]{4,}/g);
  if (readable) pieces.push(...readable.slice(0, 500));

  return normalizeExtractedPdfText(pieces.join('\n'));
}

function bytesToBinary(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.slice(i, i + chunk));
  return binary;
}

function binaryToBytes(binary: string): Uint8Array {
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i) & 0xff;
  return out;
}

function extractPlainPdfText(binary: string): string[] {
  const pieces: string[] = [];
  const literal = /\((?:\\.|[^\\()])*\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = literal.exec(binary))) pieces.push(decodePdfLiteral(m[0].replace(/\s*Tj$/, '')));

  const arrays = /\[((?:.|\n|\r)*?)\]\s*TJ/g;
  while ((m = arrays.exec(binary))) {
    const inner = m[1];
    const literals = inner.match(/\((?:\\.|[^\\()])*\)/g) || [];
    if (literals.length) pieces.push(literals.map(decodePdfLiteral).join(''));
  }
  return pieces;
}

type PdfStreamInfo = {
  objectId: number;
  dictionary: string;
  raw: string;
  decoded: string;
  isFlate: boolean;
};

async function readPdfStreams(binary: string): Promise<PdfStreamInfo[]> {
  const streams: PdfStreamInfo[] = [];

  // Importante: no buscar "obj ... stream ... endstream" de forma global, porque algunos PDFs
  // de Zoé tienen objetos sin stream antes del primer stream y una regex amplia termina
  // mezclando objetos. Primero aislamos cada objeto y solo después leemos su stream interno.
  const objRe = /(\d+)\s+0\s+obj([\s\S]*?)endobj/g;
  let m: RegExpExecArray | null;
  while ((m = objRe.exec(binary))) {
    const objectId = Number(m[1]);
    const body = m[2] || '';
    const streamIndex = body.indexOf('stream');
    const endStreamIndex = body.lastIndexOf('endstream');
    if (streamIndex < 0 || endStreamIndex < 0 || endStreamIndex <= streamIndex) continue;

    const dictionary = body.slice(0, streamIndex);
    let raw = body.slice(streamIndex + 'stream'.length, endStreamIndex);

    // El contenido de stream normalmente empieza después de LF/CRLF y termina antes de LF/CRLF.
    // Quitar solo esos saltos envolventes evita corromper bytes binarios comprimidos.
    if (raw.startsWith('\r\n')) raw = raw.slice(2);
    else if (raw.startsWith('\n')) raw = raw.slice(1);
    else if (raw.startsWith('\r')) raw = raw.slice(1);

    if (raw.endsWith('\r\n')) raw = raw.slice(0, -2);
    else if (raw.endsWith('\n')) raw = raw.slice(0, -1);
    else if (raw.endsWith('\r')) raw = raw.slice(0, -1);

    const isFlate = /\/FlateDecode\b/.test(dictionary);
    let decoded = raw;
    if (isFlate) {
      const inflated = await inflatePdfData(binaryToBytes(raw));
      if (inflated) decoded = bytesToBinary(inflated);
    }
    streams.push({ objectId, dictionary, raw, decoded, isFlate });
  }
  return streams;
}

async function inflatePdfData(data: Uint8Array): Promise<Uint8Array | null> {
  const DS = (globalThis as any).DecompressionStream;
  if (!DS) return null;
  const formats = ['deflate', 'deflate-raw'] as const;
  for (const format of formats) {
    try {
      const stream = new Blob([data]).stream().pipeThrough(new DS(format));
      const buffer = await new Response(stream).arrayBuffer();
      return new Uint8Array(buffer);
    } catch {
      // intenta con el siguiente formato
    }
  }
  return null;
}

async function buildFontUnicodeMaps(binary: string, streams: PdfStreamInfo[]): Promise<Record<string, Record<string, string>>> {
  const fontResourceToObj: Record<string, string> = {};
  const resourceRe = /\/(F\d+)\s+(\d+)\s+0\s+R/g;
  let m: RegExpExecArray | null;
  while ((m = resourceRe.exec(binary))) fontResourceToObj[m[1]] = m[2];

  const streamByObj = new Map<number, PdfStreamInfo>();
  for (const stream of streams) streamByObj.set(stream.objectId, stream);

  const fontMaps: Record<string, Record<string, string>> = {};
  for (const [fontName, objId] of Object.entries(fontResourceToObj)) {
    const fontObjRe = new RegExp(`${escapeRegExp(objId)}\\s+0\\s+obj([\\s\\S]*?)endobj`);
    const fontObj = fontObjRe.exec(binary)?.[1] || '';
    const toUnicodeId = firstMatch(fontObj, /\/ToUnicode\s+(\d+)\s+0\s+R/);
    if (!toUnicodeId) continue;
    const cmapStream = streamByObj.get(Number(toUnicodeId));
    if (!cmapStream) continue;
    fontMaps[fontName] = parseToUnicodeCMap(cmapStream.decoded);
  }
  return fontMaps;
}

function parseToUnicodeCMap(cmap: string): Record<string, string> {
  const map: Record<string, string> = {};

  const bfcharBlocks = cmap.match(/beginbfchar[\s\S]*?endbfchar/g) || [];
  for (const block of bfcharBlocks) {
    const pairRe = /<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>/g;
    let m: RegExpExecArray | null;
    while ((m = pairRe.exec(block))) map[m[1].toUpperCase()] = unicodeHexToString(m[2]);
  }

  const bfrangeBlocks = cmap.match(/beginbfrange[\s\S]*?endbfrange/g) || [];
  for (const block of bfrangeBlocks) {
    const rangeArrayRe = /<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>\s+\[([\s\S]*?)\]/g;
    let m: RegExpExecArray | null;
    while ((m = rangeArrayRe.exec(block))) {
      const start = parseInt(m[1], 16);
      const end = parseInt(m[2], 16);
      const width = m[1].length;
      const values = [...m[3].matchAll(/<([0-9A-Fa-f]+)>/g)].map(v => unicodeHexToString(v[1]));
      for (let code = start; code <= end && code - start < values.length; code++) {
        map[code.toString(16).toUpperCase().padStart(width, '0')] = values[code - start];
      }
    }

    const rangeSequentialRe = /<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>/g;
    while ((m = rangeSequentialRe.exec(block))) {
      const start = parseInt(m[1], 16);
      const end = parseInt(m[2], 16);
      const dest = parseInt(m[3], 16);
      const width = m[1].length;
      for (let code = start; code <= end; code++) {
        map[code.toString(16).toUpperCase().padStart(width, '0')] = unicodeHexToString((dest + (code - start)).toString(16).padStart(m[3].length, '0'));
      }
    }
  }

  return map;
}

function unicodeHexToString(hex: string): string {
  const clean = hex.replace(/\s+/g, '');
  const codes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const part = clean.slice(i, i + 4);
    if (part.length === 4) codes.push(parseInt(part, 16));
  }
  return String.fromCharCode(...codes).replace(/\u0000/g, '');
}

function extractTextFromContentStreams(streams: PdfStreamInfo[], fontMaps: Record<string, Record<string, string>>): string {
  const pieces: string[] = [];
  for (const stream of streams) {
    const content = stream.decoded;
    if (!/\bBT\b/.test(content) || !/(\bTj\b|\bTJ\b)/.test(content)) continue;
    const text = decodePdfContentText(content, fontMaps);
    if (text.trim()) pieces.push(text);
  }
  return pieces.join('\n');
}

function decodePdfContentText(content: string, fontMaps: Record<string, Record<string, string>>): string {
  let currentFont = '';
  const out: string[] = [];
  const tokenRe = /\/(F\d+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f\s]+)>\s*Tj|\[(.*?)\]\s*TJ|\((?:\\.|[^\\()])*\)\s*Tj|(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Td|\bT\*\b|\bET\b/gs;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(content))) {
    if (m[1]) {
      currentFont = m[1];
      continue;
    }
    if (m[2]) {
      out.push(decodePdfHexText(m[2], fontMaps[currentFont]));
      continue;
    }
    if (m[3]) {
      const parts = [...m[3].matchAll(/<([0-9A-Fa-f\s]+)>|\((?:\\.|[^\\()])*\)/g)].map(part => {
        if (part[1]) return decodePdfHexText(part[1], fontMaps[currentFont]);
        return decodePdfLiteral(part[0]);
      });
      out.push(parts.join(''));
      continue;
    }
    if (m[0].endsWith('Tj') && m[0].trim().startsWith('(')) {
      out.push(decodePdfLiteral(m[0].replace(/\s*Tj$/, '')));
      continue;
    }
    if (m[4] !== undefined && m[5] !== undefined) {
      const y = Number(m[5]);
      if (Math.abs(y) > 0.1) out.push('\n');
      continue;
    }
    if (m[0] === 'T*' || m[0] === 'ET') out.push('\n');
  }
  return out.join('');
}

function decodePdfHexText(hex: string, cmap?: Record<string, string>): string {
  const clean = hex.replace(/\s+/g, '').toUpperCase();
  if (!clean) return '';
  if (cmap && Object.keys(cmap).length) {
    const widths = Array.from(new Set(Object.keys(cmap).map(k => k.length))).sort((a, b) => b - a);
    let text = '';
    for (let i = 0; i < clean.length;) {
      let matched = false;
      for (const width of widths) {
        const code = clean.slice(i, i + width);
        if (code.length === width && cmap[code] !== undefined) {
          text += cmap[code];
          i += width;
          matched = true;
          break;
        }
      }
      if (!matched) {
        // Respaldo: intenta UTF-16BE por par de bytes.
        const part = clean.slice(i, i + 4);
        if (part.length === 4) text += unicodeHexToString(part);
        i += 4;
      }
    }
    return text;
  }
  return unicodeHexToString(clean);
}

function normalizeExtractedPdfText(text: string): string {
  return text
    .replace(/\t+/g, ' ')
    .replace(/[ \u00A0]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s*(DIRECCIÓN|DIRECCION|REFERENCIAS|NOTAS|Empresa|Nombre|Principal|Correo|Cantidad|Descripción|Descripcion|Total|Pedido|RP\s*-\s*Pedido|CC\s*-\s*Pedido)\s*/gi, '\n$1 ')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodePdfLiteral(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('(') && s.endsWith(')')) s = s.slice(1, -1);
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .trim();
}

function parseZoeOrderText(text: string): ParsedOrderDraft {
  const t = text.replace(/\r/g, '\n').replace(/\n+/g, '\n');
  const clean = t.replace(/\s+/g, ' ');
  const draft: ParsedOrderDraft = {
    payment_note: 'Contamos con tu pronto pago',
    items: [],
  };

  draft.zoe_folio = firstMatch(clean, /(?:RP|CC)?\s*-?\s*Pedido\s*#\s*([A-Za-z0-9-]+)/i)
    || firstMatch(clean, /Pedido\s*#\s*([A-Za-z0-9-]+)/i);

  draft.customer_email = cleanEmail(firstMatch(clean, /Correo\s*:?\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)) || undefined;
  draft.customer_company = cleanText(firstMatch(clean, /Empresa\s*:?\s*(.+?)\s+Nombre\s*:/i)) || undefined;
  draft.customer_name = cleanText(firstMatch(clean, /Nombre\s*:?\s*(.+?)\s+(?:Principal\s*:|Correo\s*:|DIRECCI[ÓO]N|Cantidad|REFERENCIAS|(?:RP|CC)?\s*-?\s*Pedido)/i)) || undefined;
  draft.customer_contact_name = draft.customer_name;

  const phoneFromPrincipal = cleanPhone(firstMatch(clean, /Principal\s*:?\s*([+()\d\s.-]{7,})/i));
  const phoneFromNotes = cleanPhone(firstMatch(clean, /(?:tel|cel|contacto)\s*:?\s*([+()\d\s.-]{7,}(?:\s*(?:cel|tel)\s*:?\s*[+()\d\s.-]{7,})?)/i));
  draft.customer_phone = phoneFromPrincipal || phoneFromNotes || undefined;

  const address = firstMatch(clean, /DIRECCI[ÓO]N\s+DE\s+ENTREGA\s*(.+?)\s+(?:REFERENCIAS|NOTAS|Cantidad\s+Descripci[óo]n)/i)
    || firstMatch(clean, /DIRECCI[ÓO]N\s+DE\s+ENTREGA\s*(.+?)\s+(?:Empresa\s*:|Cantidad|(?:RP|CC)?\s*-?\s*Pedido)/i);
  draft.customer_address = cleanText(address) || undefined;

  const refs = firstMatch(clean, /REFERENCIAS\s*(.+?)\s+(?:Cantidad\s+Descripci[óo]n|Empresa\s*:|Nombre\s*:|(?:RP|CC)?\s*-?\s*Pedido\s*#)/i)
    || firstMatch(clean, /NOTAS\s*(.+?)\s+(?:Cantidad\s+Descripci[óo]n|Total\s+\$)/i);
  draft.delivery_reference = cleanText((refs || '').replace(/^NOTAS\s*/i, '')) || undefined;

  const items: OrderItemRow[] = [];
  const section = firstMatch(clean, /Cantidad\s+Descripci[óo]n\s+Precio\s*x\s*unidad\s+Importe\s+(.+?)\s+Total\s+\$?[\d,]+\.\d{2}/i)
    || firstMatch(clean, /Cantidad\s+Descripci[óo]n\s+(.+?)\s+Total\s+\$?[\d,]+\.\d{2}/i)
    || clean;
  const itemRe = /(?:^|\s)(\d+)\s+(.+?)\s+\$?([\d,]+\.\d{2})\s+\$?([\d,]+\.\d{2})(?=\s+\d+\s+|\s*$)/gi;
  let m: RegExpExecArray | null;
  const seenItems = new Set<string>();
  while ((m = itemRe.exec(section))) {
    const quantity = Number(m[1]);
    const description = cleanText(m[2]) || '';
    if (!description || /^(Cantidad|Descripci[óo]n|Precio|Importe|Total)$/i.test(description)) continue;
    const unitPrice = parseMoney(m[3]);
    const amount = parseMoney(m[4]);
    const signature = `${quantity}|${description}|${unitPrice}|${amount}`.toLowerCase();
    if (seenItems.has(signature)) continue;
    seenItems.add(signature);
    items.push({ id: crypto.randomUUID(), order_id: '', quantity, description, unit_price: unitPrice, amount, sort_order: items.length });
  }
  if (items.length) draft.items = items;

  const total = firstMatch(clean, /Total\s+\$?([\d,]+\.\d{2})/i);
  draft.order_total = total ? parseMoney(total) : (items.length ? items.reduce((sum, item) => sum + item.amount, 0) : undefined);
  draft.packages_expected = items.length ? items.reduce((sum, item) => sum + item.quantity, 0) : undefined;

  return draft;
}

function scoreExtractedDraft(draft: ParsedOrderDraft, rawText: string): number {
  let score = 0;
  if (rawText.length > 300) score += 10;
  if (draft.zoe_folio) score += 20;
  if (draft.customer_name || draft.customer_company) score += 20;
  if (draft.customer_phone || draft.customer_email) score += 15;
  if (draft.customer_address) score += 20;
  if (draft.items && draft.items.length) score += 15;
  return Math.min(score, 100);
}

function firstMatch(text: string, regex: RegExp): string | undefined {
  const m = regex.exec(text);
  return m?.[1]?.trim();
}

function parseMoney(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function cleanEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.trim().match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : null;
}

function cleanPhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  return digits.length >= 7 ? digits : null;
}

async function fetchVehicleChecklist(env: Env, id: string): Promise<VehicleChecklistRow | null> {
  return await env.DB.prepare(
    `SELECT vc.*, r.name as route_name, d.name as driver_name, u.name as created_by_name
     FROM vehicle_checklists vc
     LEFT JOIN routes r ON r.id = vc.route_id
     LEFT JOIN users d ON d.id = vc.driver_id
     LEFT JOIN users u ON u.id = vc.created_by
     WHERE vc.id = ?`
  ).bind(id).first<VehicleChecklistRow>();
}

async function fetchInventoryProduct(env: Env, id: string): Promise<InventoryProductRow | null> {
  return await env.DB.prepare(
    `SELECT p.*, u.name as created_by_name
     FROM inventory_products p
     LEFT JOIN users u ON u.id = p.created_by
     WHERE p.id = ?`
  ).bind(id).first<InventoryProductRow>();
}

function getInventoryProductId(url: string): string {
  const parts = new URL(url).pathname.split('/');
  return parts[4];
}

function cleanText(value: any): string | null {
  if (typeof value !== 'string') return value == null ? null : String(value);
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function fuelLabel(value: string): string {
  const labels: Record<string, string> = {
    tanque_lleno: 'Tanque lleno',
    tres_cuartos: '3/4 de tanque',
    medio_tanque: 'Medio tanque',
    un_cuarto: '1/4 de tanque',
    reserva: 'Reserva',
  };
  return labels[value] || value;
}

function publicUser(user: any): User {
  return { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active };
}

async function putR2(env: Env, key: string, file: File, contentType: string): Promise<string> {
  await env.BUCKET.put(key, await file.arrayBuffer(), { httpMetadata: { contentType } });
  return key;
}

async function putR2Bytes(env: Env, key: string, bytes: Uint8Array, contentType: string): Promise<string> {
  await env.BUCKET.put(key, bytes, { httpMetadata: { contentType } });
  return key;
}

async function generateEvidencePdf(env: Env, order: OrderRow, evidence: any): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 740;

  const line = (label: string, value: any) => {
    page.drawText(label, { x: 48, y, size: 10, font: bold, color: rgb(0.05, 0.09, 0.16) });
    page.drawText(String(value || '-').slice(0, 90), { x: 190, y, size: 10, font, color: rgb(0.05, 0.09, 0.16) });
    y -= 22;
  };

  page.drawText('EVIDENCIA DE ENTREGA - ZOÉ WATER', { x: 48, y, size: 16, font: bold, color: rgb(0.02, 0.16, 0.40) });
  y -= 36;
  line('Folio Zoé:', order.zoe_folio);
  line('Cliente:', order.customer_name);
  line('Dirección:', order.customer_address);
  line('Fecha programada:', order.scheduled_delivery_date);
  line('Resultado:', evidence.delivery_result);
  line('Repartidor:', order.driver_name || evidence.delivered_by);
  line('Unidad:', order.vehicle);
  line('Paquetes solicitados:', order.packages_expected);
  line('Paquetes entregados:', evidence.packages_delivered);
  line('Nombre recibe:', evidence.receiver_name);
  line('Fecha/hora registro:', new Date().toISOString());
  line('Comentarios:', evidence.comments);

  y -= 10;
  page.drawText('Firma:', { x: 48, y, size: 11, font: bold });
  y -= 12;
  if (evidence.signature_key) {
    const sig = await env.BUCKET.get(evidence.signature_key);
    if (sig) {
      const sigBytes = await sig.arrayBuffer();
      try {
        const img = await pdf.embedPng(sigBytes);
        page.drawImage(img, { x: 48, y: y - 95, width: 220, height: 90 });
      } catch {
        page.drawText('Firma capturada, no se pudo incrustar en PDF.', { x: 48, y: y - 20, size: 9, font });
      }
    }
  }

  if (evidence.photo_key) {
    const photo = await env.BUCKET.get(evidence.photo_key);
    if (photo) {
      const bytes = await photo.arrayBuffer();
      try {
        const image = photo.httpMetadata?.contentType?.includes('png') ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        page.drawText('Foto evidencia:', { x: 330, y, size: 11, font: bold });
        page.drawImage(image, { x: 330, y: y - 170, width: 210, height: 150 });
      } catch {
        page.drawText('Foto capturada, no se pudo incrustar en PDF.', { x: 330, y: y - 20, size: 9, font });
      }
    }
  }

  page.drawText('Documento generado por el sistema interno de la empresa de entregas.', {
    x: 48,
    y: 48,
    size: 8,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });

  return await pdf.save();
}

async function sendDeliveryEmail(env: Env, order: OrderRow | null, deliveryResult: string, comments: string | null): Promise<void> {
  if (!order || !env.RESEND_API_KEY || !env.MAIL_COORDINACION || !env.MAIL_FROM) return;
  const subject = deliveryResult === 'completa' ? `Orden Zoé entregada: ${order.zoe_folio}` : `Actualización entrega Zoé: ${order.zoe_folio}`;
  const evidenceUrl = order.signed_pdf_key ? `/api/files/${encodeURIComponent(order.signed_pdf_key)}` : 'Sin PDF generado';
  const text = `Se registró una entrega.\n\nFolio: ${order.zoe_folio}\nCliente: ${order.customer_name}\nDirección: ${order.customer_address}\nRepartidor: ${order.driver_name || '-'}\nPaquetes entregados: ${order.packages_delivered}\nEstatus: ${order.status}\nComentarios: ${comments || '-'}\nEvidencia: ${evidenceUrl}`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [env.MAIL_COORDINACION], subject, text }),
  }).catch((err) => console.error('email error', err));
}

async function audit(env: Env, userId: string | null, action: string, entityType: string, entityId: string | null, details: string | null): Promise<void> {
  await env.DB.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), userId, action, entityType, entityId, details)
    .run()
    .catch((err) => console.error('audit error', err));
}

function getOrderId(url: string): string {
  const parts = new URL(url).pathname.split('/');
  return parts[3];
}

function requiredForm(form: FormData, key: string): string {
  const value = form.get(key);
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Campo requerido: ${key}`);
  return value;
}

function valueOrNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null;
  return value.trim() ? value.trim() : null;
}

function toInt(value: FormDataEntryValue | string | number | null, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function parseNumberOrNull(value: FormDataEntryValue | null): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function requireString(value: unknown, field: string): void {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Campo requerido: ${field}`);
}

function requireEmail(email: string): void {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Correo inválido');
}

function requirePassword(password: string): void {
  if (!password || password.length < 8) throw new Error('La contraseña debe tener mínimo 8 caracteres');
}

function safeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || crypto.randomUUID();
}

function yearMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function csvEscape(value: any): string {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256(input: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return hex(buffer);
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomToken();
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  return `${salt}:${hex(bits)}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  return timingSafeEqual(hex(bits), hash);
}

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function getCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.split(';').map((v) => v.trim()).find((v) => v.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

function buildSessionCookie(request: Request, token: string, expiresAt: string): string {
  const url = new URL(request.url);
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  const secure = isLocal ? '' : '; Secure; SameSite=None';
  const sameSite = isLocal ? '; SameSite=Lax' : '';
  return `zoe_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Expires=${new Date(expiresAt).toUTCString()}${secure}${sameSite}`;
}
