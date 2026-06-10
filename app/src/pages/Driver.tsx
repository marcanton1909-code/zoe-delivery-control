import { useEffect, useState } from 'react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { Order } from '../types';

export default function Driver() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await api.orders(`?dateFrom=${today}&dateTo=${today}`);
      setOrders(res.orders.filter((o: Order) => !['entregada','parcial','no_entregada','rechazada','cancelada'].includes(o.status)));
    } catch (e: any) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="page driver-page">
      <div className="page-title"><div><h2>Mis entregas de hoy</h2><p>Abre una orden para capturar firma y evidencia.</p></div><a className="btn primary" href="#/vehicle-checklist">Checklist vehículo</a></div>
      {error && <div className="notice">{error}</div>}
      <div className="delivery-list">
        {orders.map((o) => (
          <button key={o.id} className="delivery-card" onClick={() => location.hash = `#/driver/orders/${o.id}`}>
            <div>
              <strong>{o.zoe_folio}</strong>
              <span>{o.customer_name}</span>
              <small>{o.customer_address}</small>
            </div>
            <div className="delivery-side">
              <StatusBadge status={o.status} />
              <b>{o.packages_expected} paquetes</b>
            </div>
          </button>
        ))}
        {orders.length === 0 && <section className="card"><p>Sin entregas pendientes para hoy.</p></section>}
      </div>
    </div>
  );
}
