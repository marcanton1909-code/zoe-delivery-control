export type Role = 'admin' | 'coordinador' | 'almacen' | 'repartidor';

export type OrderStatus =
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

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  active: number;
}

export interface Route {
  id: string;
  name: string;
  zone?: string;
  default_driver_id?: string;
  default_driver_name?: string;
  default_vehicle?: string;
}

export interface Order {
  id: string;
  zoe_folio: string;
  order_date?: string;
  scheduled_delivery_date?: string;
  customer_name: string;
  customer_address: string;
  customer_phone?: string;
  packages_expected: number;
  packages_loaded: number;
  packages_delivered: number;
  status: OrderStatus;
  route_id?: string;
  route_name?: string;
  driver_id?: string;
  driver_name?: string;
  vehicle?: string;
  original_pdf_key?: string;
  signed_pdf_key?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}


export type FuelLevel = 'tanque_lleno' | 'tres_cuartos' | 'medio_tanque' | 'un_cuarto' | 'reserva';

export interface VehicleChecklist {
  id: string;
  checklist_date: string;
  vehicle: string;
  route_id?: string;
  route_name?: string;
  driver_id?: string;
  driver_name?: string;
  reviewer_name: string;
  mileage: number;
  fuel_level: FuelLevel;
  tires_ok: number;
  spare_tire_ok: number;
  mileage_photo_key?: string;
  fuel_photo_key?: string;
  tires_photo_key?: string;
  spare_tire_photo_key?: string;
  comments?: string;
  created_by_name?: string;
  created_at: string;
}


export interface InventoryProduct {
  id: string;
  sku?: string;
  name: string;
  category?: string;
  unit: string;
  presentation?: string;
  min_stock: number;
  current_stock: number;
  active: number;
  notes?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  product_name?: string;
  sku?: string;
  movement_type: 'alta_inicial' | 'conteo_fisico' | 'entrada' | 'salida' | 'ajuste';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference?: string;
  notes?: string;
  created_by_name?: string;
  created_at: string;
}
