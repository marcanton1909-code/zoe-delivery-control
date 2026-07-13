CREATE TABLE IF NOT EXISTS vehicle_checklists (
  id TEXT PRIMARY KEY,
  checklist_date TEXT NOT NULL,
  vehicle TEXT NOT NULL,
  route_id TEXT,
  driver_id TEXT,
  reviewer_name TEXT NOT NULL,
  mileage INTEGER NOT NULL,
  fuel_level TEXT NOT NULL CHECK(fuel_level IN ('tanque_lleno','tres_cuartos','medio_tanque','un_cuarto','reserva')),
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
CREATE INDEX IF NOT EXISTS idx_vehicle_checklists_route ON vehicle_checklists(route_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_checklists_driver ON vehicle_checklists(driver_id);
