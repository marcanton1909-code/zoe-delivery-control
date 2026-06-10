import { OrderStatus } from '../types';

const labels: Record<OrderStatus, string> = {
  pendiente_validacion: 'Pendiente',
  programada: 'Programada',
  cargada: 'Cargada',
  carga_incompleta: 'Carga incompleta',
  en_ruta: 'En ruta',
  entregada: 'Entregada',
  parcial: 'Parcial',
  no_entregada: 'No entregada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge ${status}`}>{labels[status] || status}</span>;
}
