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

interface OrderRow {
  id: string;
  zoe_folio: string;
  order_date: string | null;
  scheduled_delivery_date: string | null;
  customer_name: string;
  customer_address: string;
  customer_phone: string | null;
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
      else if (url.pathname === '/api/routes' && request.method === 'GET') response = await listRoutes(request, env);
      else if (url.pathname === '/api/routes' && request.method === 'POST') response = await createRoute(request, env);
      else if (url.pathname === '/api/orders' && request.method === 'GET') response = await listOrders(request, env);
      else if (url.pathname === '/api/orders' && request.method === 'POST') response = await createOrder(request, env);
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
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  zoe_folio TEXT UNIQUE NOT NULL,
  order_date TEXT,
  scheduled_delivery_date TEXT,
  customer_name TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_phone TEXT,
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
    `SELECT o.*, r.name as route_name, u.name as driver_name
     FROM orders o
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
  const zoeFolio = requiredForm(form, 'zoe_folio');
  const customerName = requiredForm(form, 'customer_name');
  const customerAddress = requiredForm(form, 'customer_address');
  const packagesExpected = toInt(form.get('packages_expected'), 0);
  if (packagesExpected < 1) throw new Error('packages_expected debe ser mayor a 0');

  const file = form.get('original_pdf');
  let pdfKey: string | null = null;
  if (file instanceof File && file.size > 0) {
    pdfKey = await putR2(env, `original-orders/${yearMonth()}/${safeName(zoeFolio)}-${Date.now()}.pdf`, file, file.type || 'application/pdf');
  }

  const status: OrderStatus = form.get('route_id') || form.get('driver_id') ? 'programada' : 'pendiente_validacion';
  await env.DB.prepare(
    `INSERT INTO orders (
      id, zoe_folio, order_date, scheduled_delivery_date, customer_name, customer_address,
      customer_phone, packages_expected, status, route_id, driver_id, vehicle,
      original_pdf_key, notes, created_by, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  )
    .bind(
      id,
      zoeFolio.trim(),
      valueOrNull(form.get('order_date')),
      valueOrNull(form.get('scheduled_delivery_date')),
      customerName.trim(),
      customerAddress.trim(),
      valueOrNull(form.get('customer_phone')),
      packagesExpected,
      status,
      valueOrNull(form.get('route_id')),
      valueOrNull(form.get('driver_id')),
      valueOrNull(form.get('vehicle')),
      pdfKey,
      valueOrNull(form.get('notes')),
      actor.id
    )
    .run();

  await audit(env, actor.id, 'create_order', 'orders', id, JSON.stringify({ zoe_folio: zoeFolio }));
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
    'customer_name',
    'customer_address',
    'customer_phone',
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
  const token = bearer || getCookie(request, 'zoe_session');
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

async function fetchOrder(env: Env, id: string): Promise<OrderRow | null> {
  return await env.DB.prepare(
    `SELECT o.*, r.name as route_name, u.name as driver_name
     FROM orders o
     LEFT JOIN routes r ON r.id = o.route_id
     LEFT JOIN users u ON u.id = o.driver_id
     WHERE o.id = ?`
  )
    .bind(id)
    .first<OrderRow>();
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
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 120000, hash: 'SHA-256' },
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
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 120000, hash: 'SHA-256' },
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
