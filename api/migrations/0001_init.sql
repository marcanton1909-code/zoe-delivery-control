PRAGMA foreign_keys = ON;

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
  status TEXT NOT NULL DEFAULT 'pendiente_validacion' CHECK(status IN (
    'pendiente_validacion',
    'programada',
    'cargada',
    'carga_incompleta',
    'en_ruta',
    'entregada',
    'parcial',
    'no_entregada',
    'rechazada',
    'cancelada'
  )),
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
  type TEXT NOT NULL CHECK(type IN (
    'cliente_ausente',
    'direccion_incorrecta',
    'pedido_incompleto',
    'rechazo_cliente',
    'unidad_con_problema',
    'otro'
  )),
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
