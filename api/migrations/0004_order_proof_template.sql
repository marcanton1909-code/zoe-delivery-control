-- Reconstrucción HTML de prueba de entrega estilo Zoé.
-- Agrega campos de cliente/formato y renglones de producto para poder imprimir/guardar evidencia similar a la orden original.

ALTER TABLE orders ADD COLUMN customer_company TEXT;
ALTER TABLE orders ADD COLUMN customer_contact_name TEXT;
ALTER TABLE orders ADD COLUMN customer_email TEXT;
ALTER TABLE orders ADD COLUMN delivery_reference TEXT;
ALTER TABLE orders ADD COLUMN payment_note TEXT;
ALTER TABLE orders ADD COLUMN order_total REAL DEFAULT 0;

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
