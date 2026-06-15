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

export interface Customer {
  id: string;
  company_name?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  delivery_address?: string;
  delivery_references?: string;
  notes?: string;
  total_orders?: number;
  last_order_at?: string;
  packages_delivered?: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  quantity: number;
  description: string;
  unit_price?: number;
  amount?: number;
  sort_order?: number;
}

export interface ExtractedOrderDraft {
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
  items?: OrderItem[];
}

export interface DeliveryEvidence {
  id: string;
  order_id: string;
  receiver_name?: string;
  signature_key?: string;
  photo_key?: string;
  gps_lat?: number;
  gps_lng?: number;
  delivered_at?: string;
  delivery_result?: 'completa' | 'parcial' | 'no_entregada' | 'rechazada';
  packages_delivered?: number;
  comments?: string;
  created_by?: string;
  created_at?: string;
}

export interface Order {
  id: string;
  customer_id?: string;
  zoe_folio: string;
  order_date?: string;
  scheduled_delivery_date?: string;
  customer_company?: string;
  customer_name: string;
  customer_contact_name?: string;
  customer_email?: string;
  customer_address: string;
  customer_phone?: string;
  delivery_reference?: string;
  payment_note?: string;
  order_total?: number;
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
  items?: OrderItem[];
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
