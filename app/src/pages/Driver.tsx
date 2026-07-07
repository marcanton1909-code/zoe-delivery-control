import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { Order } from '../types';

const DRIVER_VISIBLE_STATUSES = ['en_ruta', 'cargada', 'programada'];
const FINAL_STATUSES = ['entregada', 'parcial', 'no_entregada', 'rechazada', 'cancelada'];

function uniqueOrders(lists: Order[][]) {
  const map = new Map<string, Order>();
  lists.flat().forEach((order) => map.set(order.id, order));
  return Array.from(map.values()).filter((order) => !FINAL_STATUSES.includes(order.status));
}

export default function Driver() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const responses = await Promise.all(
        DRIVER_VISIBLE_STATUSES.map((status) => api.orders(`?status=${status}`))
      );
      setOrders(uniqueOrders(responses.map((res) => res.orders)));
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aDate = a.scheduled_delivery_date || a.created_at || '';
      const bDate = b.scheduled_delivery_date || b.created_at || '';
      return aDate.localeCompare(bDate);
    });
  }, [orders]);

  return (
    <div className="page driver-page">
      <div className="page-title"><div><h2>Mis entregas pendientes</h2><p>Órdenes en ruta o listas para entregar. No se filtran por fecha para permitir entregar pedidos capturados hoy con fecha anterior.</p></div><a className="btn primary" href="#/vehicle-checklist">Checklist vehículo</a></div>
      {error && <div className="notice">{error}</div>}
      <div className="delivery-list">
        {sortedOrders.map((o) => (
          <button key={o.id} className="delivery-card" onClick={() => location.hash = `#/driver/orders/${o.id}`}>
            <div>
              <strong>{o.zoe_folio}</strong>
              <span>{o.customer_name}</span>
              <small>{o.customer_address}</small>
              <small>Fecha: {o.scheduled_delivery_date || '-'}</small>
            </div>
            <div className="delivery-side">
              <StatusBadge status={o.status} />
              <b>{o.packages_expected} paquetes</b>
            </div>
          </button>
        ))}
        {loading && <section className="card"><p>Cargando entregas...</p></section>}
        {!loading && sortedOrders.length === 0 && <section className="card"><p>Sin entregas pendientes asignadas.</p></section>}
      </div>
    </div>
  );
}
